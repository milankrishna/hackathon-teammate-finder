const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const JoinRequest = require('../models/JoinRequest');
const auth = require('../controllers/authController');
const teams = require('../controllers/teamController');

function responseRecorder() {
  return {
    statusCode: 200,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('password validation prevents bcrypt truncation, including multi-byte input', async () => {
  for (const password of ['x'.repeat(73), 'é'.repeat(37)]) {
    const req = { body: { name: 'Audit Fixture', email: 'audit@example.invalid', password } };
    for (const [controller, expectedStatus] of [[auth.register, 400], [auth.login, 401]]) {
      const res = responseRecorder();
      await controller(req, res, (error) => { throw error; });
      assert.equal(res.statusCode, expectedStatus);
      assert.equal(typeof res.body.error, 'string');
    }
  }
});

test('team creation rejects impossible calendar dates before database operations', async () => {
  for (const hackathonDate of ['2030-02-31T00:00:00.000Z', '2030-02-29', '2030-04-31', 'not-a-date']) {
    const res = responseRecorder();
    await teams.createTeam({ user: { id: new mongoose.Types.ObjectId().toString() }, body: {
      hackathonName: 'Audit Fixture', description: 'Calendar validation', skillsNeeded: [], maxTeamSize: 2, hackathonDate,
    } }, res, (error) => { throw error; });
    assert.equal(res.statusCode, 400);
  }
});

test('Atlas API audit using isolated temporary records', { skip: process.env.RUN_ATLAS_TESTS !== '1', timeout: 180000 }, async (t) => {
  const serverDirectory = path.resolve(__dirname, '..');
  require('dotenv').config({ path: path.join(serverDirectory, '.env'), quiet: true });
  assert.ok(process.env.MONGO_URI, 'MONGO_URI must be configured');
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be configured');
  const tag = `audit-${Date.now()}-${process.pid}`;
  const emails = Array.from({ length: 7 }, (_, index) => `${tag}-${index}@example.invalid`);
  const cleanupEmails = [...emails, `${tag}-too-long@example.invalid`];
  const password = 'Temporary-Audit-Password-927!';
  const teamIds = [];
  const externalBase = process.env.AUDIT_BASE_URL;
  if (externalBase) assert.match(externalBase, /^http:\/\/127\.0\.0\.1:\d+\/api$/, 'External audit target must be a local test server');
  let child;
  let connected = false;

  t.after(async () => {
    if (child && child.exitCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      await stopped;
    }
    try {
      if (connected) {
        const users = await User.find({ email: { $in: cleanupEmails } }).select('_id');
        const userIds = users.map((user) => user._id);
        const ownedTeams = await Team.find({ creator: { $in: userIds } }).select('_id');
        const ids = [...teamIds, ...ownedTeams.map((team) => team._id)];
        const requestScope = { $or: [{ team: { $in: ids } }, { requester: { $in: userIds } }] };
        await JoinRequest.deleteMany(requestScope);
        await Team.deleteMany({ _id: { $in: ids } });
        await User.deleteMany({ email: { $in: cleanupEmails } });
        assert.equal(await JoinRequest.countDocuments(requestScope), 0);
        assert.equal(await Team.countDocuments({ _id: { $in: ids } }), 0);
        assert.equal(await User.countDocuments({ email: { $in: cleanupEmails } }), 0);
        t.diagnostic('Cleanup verified: no temporary users, teams, or join requests remain.');
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  // Match the existing DNS workaround without changing application configuration.
  require('node:dns').setServers(['8.8.8.8']);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  connected = true;
  await Promise.all([User.init(), Team.init(), JoinRequest.init()]);
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const functionMode = process.env.AUDIT_SERVERLESS === '1';
  const serverArgs = functionMode ? ['-e', "require('node:http').createServer(require('../api/handler')).listen(process.env.PORT, () => console.log('Server running on port ' + process.env.PORT));"] : ['index.js'];
  if (!externalBase) child = spawn(process.execPath, serverArgs, {
    cwd: serverDirectory, env: { ...process.env, PORT: String(port), ...(functionMode ? { VERCEL: '1' } : {}) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child?.stderr.on('data', () => {});
  if (child) await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Audit server startup timed out')), 40000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(`Server running on port ${port}`)) { clearTimeout(timer); resolve(); }
    });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Audit server exited before listening')); });
    child.once('error', () => { clearTimeout(timer); reject(new Error('Audit server failed to launch')); });
  });

  async function request(method, endpoint, body, token) {
    const response = await fetch(`${externalBase || `http://127.0.0.1:${port}/api`}${endpoint}`, {
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    assert.ok(!text.includes('passwordHash'), 'Password hashes must not be returned');
    assert.ok(!text.includes(process.env.JWT_SECRET), 'JWT secrets must not be returned');
    const data = text ? JSON.parse(text) : null;
    if (response.status >= 400) assert.equal(typeof data.error, 'string');
    return { status: response.status, data };
  }

  const users = [];
  let main;
  let race;
  let multi;
  let adminDelete;
  let creatorDelete;
  let rejectedRequest;
  let pendingRequest;
  let acceptedRequest;

  await t.test('authentication, password boundaries, normalized email, safe profiles, JWT expiry', async () => {
    assert.equal((await request('GET', '/health')).data.status, 'ok');
    for (let index = 0; index < emails.length; index += 1) {
      const accountPassword = index === 5 ? 'x'.repeat(72) : index === 6 ? 'é'.repeat(36) : password;
      const registered = await request('POST', '/auth/register', { name: ' Audit Fixture ', email: ` ${emails[index].toUpperCase()} `, password: accountPassword, role: 'admin', skills: ['React'] });
      assert.equal(registered.status, 201);
      assert.equal(registered.data.user.role, 'user');
      assert.equal(registered.data.user.email, emails[index]);
      users.push(registered.data);
      assert.equal((await request('POST', '/auth/login', { email: emails[index], password: accountPassword })).status, 200);
    }
    const payload = jwt.verify(users[0].token, process.env.JWT_SECRET);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'id', 'role']);
    assert.equal(payload.exp - payload.iat, 7 * 86400);
    const stored = await User.findById(users[0].user.id).select('+passwordHash');
    assert.equal(bcrypt.getRounds(stored.passwordHash), 10);
    assert.equal((await request('POST', '/auth/register', { name: 'Duplicate', email: emails[0], password })).status, 409);
    assert.equal((await request('POST', '/auth/register', { name: 'Invalid', email: 'invalid', password: 'short' })).status, 400);
    assert.equal((await request('POST', '/auth/login', { email: emails[0], password: 'incorrect' })).status, 401);
    assert.equal((await request('POST', '/auth/login', { email: emails[5], password: 'x'.repeat(72) + 'suffix' })).status, 401);
    assert.equal((await request('POST', '/auth/register', { name: 'Too Long', email: `${tag}-too-long@example.invalid`, password: 'é'.repeat(37) })).status, 400);
    assert.equal((await request('GET', '/auth/me', undefined, users[0].token)).data.user.id, users[0].user.id);
    for (const token of [undefined, 'invalid', jwt.sign({ id: users[0].user.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
      assert.equal((await request('GET', '/auth/me', undefined, token)).status, 401);
    }
  });

  await t.test('team creation, public search/filter/pagination, safe detail, IDs, creator editing', async () => {
    const body = { hackathonName: `${tag} [literal]`, hackathonDate: '2032-02-29T00:00:00.000Z', description: 'Audit description', skillsNeeded: ['React', 'C++'], maxTeamSize: 4 };
    assert.equal((await request('POST', '/teams', body)).status, 401);
    for (const invalid of [{ ...body, hackathonDate: '2030-02-31' }, { ...body, skillsNeeded: [1] }, { ...body, maxTeamSize: 2.5 }]) {
      assert.equal((await request('POST', '/teams', invalid, users[0].token)).status, 400);
    }
    for (let index = 0; index < 5; index += 1) {
      const created = await request('POST', '/teams', { ...body, hackathonName: `${tag} [literal] ${index}`, description: index === 2 ? `${tag} description-only` : body.description, maxTeamSize: index === 1 ? 2 : 4, creator: users[1].user.id, members: [users[1].user.id] }, users[0].token);
      assert.equal(created.status, 201);
      teamIds.push(created.data.team._id);
      assert.equal(created.data.team.creator, users[0].user.id);
      assert.deepEqual(created.data.team.members, [users[0].user.id]);
    }
    [main, race, multi, adminDelete, creatorDelete] = teamIds;
    const query = `search=${encodeURIComponent(tag.toUpperCase())}`;
    const listing = (await request('GET', `/teams?${query}&page=2&limit=2`)).data;
    assert.equal(listing.total, 5);
    assert.equal(listing.totalPages, 3);
    assert.deepEqual(listing.teams.map((team) => team._id), [teamIds[2], teamIds[1]]);
    assert.equal((await request('GET', `/teams?${query}&skill=${encodeURIComponent('c++')}`)).data.total, 5);
    assert.equal((await request('GET', `/teams?${query}&skill=${encodeURIComponent('C.*')}`)).data.total, 0);
    assert.equal((await request('GET', `/teams?search=${encodeURIComponent(`${tag} [literal].*`)}`)).data.total, 0);
    assert.equal((await request('GET', `/teams?search=${encodeURIComponent(`${tag} description-only`)}`)).data.total, 1);
    assert.equal((await request('GET', `/teams?${query}&limit=100`)).data.limit, 50);
    for (const invalid of ['page=0', 'limit=-1', 'search=a&search=b', 'skill=a&skill=b']) assert.equal((await request('GET', `/teams?${invalid}`)).status, 400);
    const detail = (await request('GET', `/teams/${main}`)).data.team;
    for (const person of [detail.creator, ...detail.members]) assert.deepEqual(Object.keys(person).sort(), ['_id', 'name', 'skills']);
    assert.equal((await request('GET', '/teams/invalid')).status, 400);
    assert.equal((await request('GET', `/teams/${new mongoose.Types.ObjectId()}`)).status, 404);
    assert.equal((await request('GET', '/teams/mine', undefined, users[0].token)).data.teams.length, 5);
    assert.deepEqual((await request('GET', '/teams/mine', undefined, users[1].token)).data.teams, []);
    assert.equal((await request('PATCH', `/teams/${main}`, { description: 'Updated audit description' }, users[0].token)).status, 200);
    assert.equal((await request('PATCH', `/teams/${main}`, { hackathonDate: '2030-02-31T00:00:00.000Z' }, users[0].token)).status, 400);
    assert.equal((await request('PATCH', `/teams/${main}`, { members: [] }, users[0].token)).status, 400);
    assert.equal((await request('PATCH', `/teams/${main}`, { description: 'Unauthorized' }, users[1].token)).status, 403);
    assert.equal((await request('DELETE', `/teams/${main}`, undefined, users[1].token)).status, 403);
  });

  await t.test('join requests, duplicate races, rejection, approval, capacity and status history', async () => {
    const endpoint = `/teams/${main}/requests`;
    assert.equal((await request('POST', endpoint, {})).status, 401);
    assert.equal((await request('POST', endpoint, {}, users[0].token)).status, 409);
    assert.equal((await request('POST', endpoint, { message: 'x'.repeat(301) }, users[1].token)).status, 400);
    const duplicateRace = await Promise.all([request('POST', endpoint, { message: 'Temporary introduction' }, users[1].token), request('POST', endpoint, {}, users[1].token)]);
    assert.deepEqual(duplicateRace.map((result) => result.status).sort(), [201, 409]);
    acceptedRequest = duplicateRace.find((result) => result.status === 201).data.request;
    rejectedRequest = (await request('POST', endpoint, {}, users[2].token)).data.request;
    pendingRequest = (await request('POST', endpoint, {}, users[4].token)).data.request;
    assert.equal((await request('GET', endpoint, undefined, users[1].token)).status, 403);
    assert.equal((await request('PATCH', `${endpoint}/${acceptedRequest._id}`, { status: 'accepted' }, users[1].token)).status, 403);
    assert.equal((await request('PATCH', `${endpoint}/${acceptedRequest._id}`, { status: 'pending' }, users[0].token)).status, 400);
    assert.equal((await request('PATCH', `${endpoint}/invalid`, { status: 'accepted' }, users[0].token)).status, 400);
    assert.equal((await request('PATCH', `/teams/${multi}/requests/${acceptedRequest._id}`, { status: 'accepted' }, users[0].token)).status, 404);
    assert.equal((await request('PATCH', `${endpoint}/${acceptedRequest._id}`, { status: 'accepted' }, users[0].token)).status, 200);
    assert.equal((await request('PATCH', `${endpoint}/${rejectedRequest._id}`, { status: 'rejected' }, users[0].token)).status, 200);
    assert.equal((await request('POST', endpoint, {}, users[2].token)).status, 409);
    assert.equal((await request('PATCH', `${endpoint}/${acceptedRequest._id}`, { status: 'accepted' }, users[0].token)).status, 409);
    assert.equal((await request('GET', `/teams/${main}`)).data.team.members.length, 2);
    const extra = (await request('POST', `/teams/${main}/requests`, {}, users[3].token)).data.request;
    await request('PATCH', `${endpoint}/${extra._id}`, { status: 'accepted' }, users[0].token);
    assert.equal((await request('PATCH', `/teams/${main}`, { maxTeamSize: 2 }, users[0].token)).status, 409);
    const second = (await request('POST', `/teams/${multi}/requests`, {}, users[1].token)).data.request;
    await request('PATCH', `/teams/${multi}/requests/${second._id}`, { status: 'accepted' }, users[0].token);
    for (const id of [main, multi]) assert.ok((await request('GET', `/teams/${id}`)).data.team.members.some((member) => member._id === users[1].user.id));
    const declined = (await request('POST', `/teams/${creatorDelete}/requests`, {}, users[1].token)).data.request;
    await request('PATCH', `/teams/${creatorDelete}/requests/${declined._id}`, { status: 'rejected' }, users[0].token);
    await request('POST', `/teams/${adminDelete}/requests`, {}, users[1].token);
    await request('POST', `/teams/${adminDelete}/requests`, {}, users[2].token);
    const history = (await request('GET', '/requests/mine', undefined, users[1].token)).data.requests;
    assert.deepEqual([...new Set(history.map((item) => item.status))].sort(), ['accepted', 'pending', 'rejected']);
    for (const item of history) {
      assert.equal(item.requester, users[1].user.id);
      assert.deepEqual(Object.keys(item.team).sort(), ['_id', 'hackathonName']);
    }
    const listed = (await request('GET', endpoint, undefined, users[0].token)).data.requests;
    for (const item of listed) assert.deepEqual(Object.keys(item.requester).sort(), ['_id', 'name', 'skills']);
    assert.equal((await JoinRequest.findById(pendingRequest._id)).status, 'pending');
  });

  await t.test('concurrent approvals cannot overfill the final slot or accept twice', async () => {
    const candidates = [];
    for (const user of [users[1], users[2]]) candidates.push((await request('POST', `/teams/${race}/requests`, {}, user.token)).data.request);
    const results = await Promise.all(candidates.map((item) => request('PATCH', `/teams/${race}/requests/${item._id}`, { status: 'accepted' }, users[0].token)));
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    const team = await Team.findById(race);
    const stored = await JoinRequest.find({ team: race });
    assert.equal(team.members.length, 2);
    assert.equal(stored.filter((item) => item.status === 'accepted').length, 1);
    assert.equal(stored.filter((item) => item.status === 'pending').length, 1);
    for (const item of stored) assert.equal(team.members.some((member) => member.equals(item.requester)), item.status === 'accepted');
    assert.equal((await request('POST', `/teams/${race}/requests`, {}, users[4].token)).status, 409);
  });

  await t.test('admin roles use current database state; creator/admin deletions cascade', async () => {
    assert.equal((await request('GET', '/admin/teams')).status, 401);
    assert.equal((await request('GET', '/admin/teams', undefined, users[3].token)).status, 403);
    assert.equal((await request('DELETE', `/admin/teams/${adminDelete}`, undefined, users[3].token)).status, 403);
    await User.updateOne({ _id: users[3].user.id }, { $set: { role: 'admin' } });
    const listing = await request('GET', '/admin/teams', undefined, users[3].token);
    assert.equal(listing.status, 200);
    for (const team of listing.data.teams.filter((item) => teamIds.includes(item._id))) assert.deepEqual(Object.keys(team.creator).sort(), ['_id', 'name', 'skills']);
    const adminToken = (await request('POST', '/auth/login', { email: emails[3], password })).data.token;
    await User.updateOne({ _id: users[3].user.id }, { $set: { role: 'user' } });
    assert.equal((await request('GET', '/admin/teams', undefined, adminToken)).status, 403);
    assert.equal((await request('DELETE', `/admin/teams/${adminDelete}`, undefined, adminToken)).status, 403);
    await User.updateOne({ _id: users[3].user.id }, { $set: { role: 'admin' } });
    assert.equal((await request('DELETE', '/admin/teams/invalid', undefined, adminToken)).status, 400);
    assert.equal((await request('DELETE', `/admin/teams/${new mongoose.Types.ObjectId()}`, undefined, adminToken)).status, 404);
    assert.equal((await request('DELETE', `/admin/teams/${adminDelete}`, undefined, adminToken)).status, 204);
    assert.equal(await JoinRequest.countDocuments({ team: adminDelete }), 0);
    assert.equal((await request('DELETE', `/teams/${creatorDelete}`, undefined, users[0].token)).status, 204);
    assert.equal(await JoinRequest.countDocuments({ team: creatorDelete }), 0);
    assert.equal((await request('GET', `/teams/${creatorDelete}`)).status, 404);
    assert.ok(await JoinRequest.exists({ _id: acceptedRequest._id }));
    await User.deleteOne({ _id: users[6].user.id });
    assert.equal((await request('GET', '/auth/me', undefined, users[6].token)).status, 401);
  });
});
