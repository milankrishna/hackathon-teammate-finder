const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { once } = require('node:events');

const connectionPath = require.resolve('../config/hackathonDB');

function isolatedConnection(connect, env = { MONGO_URI: 'synthetic-configuration' }) {
  const logs = [];
  const mongoose = { connect };
  const context = {
    module: { exports: {} },
    require(name) {
      if (name === 'mongoose') return mongoose;
      if (name === 'node:dns') return { setServers() {} };
      throw new Error('Unexpected dependency');
    },
    process: { env, exit() { throw new Error('Connection helpers must not exit a function process'); } },
    console: { log() {}, error(...values) { logs.push(values.join(' ')); } },
    URL,
  };
  vm.runInNewContext(fs.readFileSync(connectionPath, 'utf8'), context, { filename: connectionPath });
  return { connect: context.module.exports, logs, mongoose };
}

test('cold-start concurrency and warm invocations share one MongoDB connection promise', async () => {
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const helper = isolatedConnection((uri, options) => {
    calls += 1;
    assert.equal(uri, 'synthetic-configuration');
    assert.equal(options.maxPoolSize, 10);
    assert.equal(options.serverSelectionTimeoutMS, 10000);
    return pending;
  });
  const invocations = Array.from({ length: 20 }, () => helper.connect());
  assert.equal(calls, 1);
  release();
  for (const connection of await Promise.all(invocations)) assert.equal(connection, helper.mongoose);
  await helper.connect();
  assert.equal(calls, 1);
});

test('a rejected connection is sanitized, does not exit, and can be retried', async () => {
  let calls = 0;
  const helper = isolatedConnection(async () => {
    calls += 1;
    if (calls === 1) throw new Error('Failure containing synthetic-configuration');
  });
  await assert.rejects(helper.connect(), (error) => error.message === 'Database connection unavailable.');
  assert.ok(!helper.logs.join(' ').includes('synthetic-configuration'));
  assert.equal(await helper.connect(), helper.mongoose);
  assert.equal(calls, 2);
  const missing = isolatedConnection(() => { throw new Error('Should not connect'); }, {});
  await assert.rejects(missing.connect(), (error) => error.message === 'Database configuration is missing.');
});

test('function export has no startup side effects, gates database routes, and returns JSON errors', async (t) => {
  const appPath = require.resolve('../index');
  const handlerPath = require.resolve('../../api/handler');
  const oldConnection = require.cache[connectionPath];
  const oldVercel = process.env.VERCEL;
  let calls = 0;
  let fail = false;
  let release;
  let started;
  const connecting = new Promise((resolve) => { release = resolve; });
  const connectionStarted = new Promise((resolve) => { started = resolve; });
  require.cache[connectionPath] = { exports: async () => {
    calls += 1;
    started();
    if (fail) throw new Error('Synthetic internal database details');
    await connecting;
  } };
  process.env.VERCEL = '1';
  delete require.cache[appPath];
  delete require.cache[handlerPath];
  const handler = require('../../api/handler');
  assert.equal(typeof handler, 'function');
  assert.equal(calls, 0);
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (oldConnection) require.cache[connectionPath] = oldConnection;
    else delete require.cache[connectionPath];
    delete require.cache[appPath];
    delete require.cache[handlerPath];
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
  });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`, { headers: { Origin: 'https://unrelated.example.invalid' } });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await health.json(), { status: 'ok', app: 'Hackathon Team Finder' });
  const unknown = await fetch(`${base}/api/not-a-route`);
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { error: 'API route not found.' });
  assert.equal(calls, 0);
  let responded = false;
  const pending = fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then((response) => { responded = true; return response; });
  await connectionStarted;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(responded, false);
  release();
  assert.equal((await pending).status, 400);
  fail = true;
  const failed = await fetch(`${base}/api/teams`);
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { error: 'Database unavailable. Please try again later.' });
  fail = false;
  const retry = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(retry.status, 400);
  const malformed = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid JSON body.' });
});

test('deployment config uses one supported Node function and excludes API/assets from SPA fallback', () => {
  const config = require('../../vercel.json');
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'client/dist');
  assert.equal(config.builds, undefined);
  assert.deepEqual(Object.keys(config.functions), ['api/handler.js']);
  assert.equal(config.rewrites[0].source, '/api/:path*');
  assert.equal(config.rewrites[0].destination, '/api/handler');
  const fallback = new RegExp(`^/${config.rewrites[1].source.slice('/:path('.length, -1)}$`);
  for (const route of ['/', '/dashboard', '/teams/new', '/teams/012345678901234567890123/edit', '/my-requests', '/admin']) assert.ok(fallback.test(route));
  for (const route of ['/api', '/api/health', '/api/unknown', '/assets/index.js', '/assets/missing', '/favicon.svg']) assert.ok(!fallback.test(route));
  assert.equal(require('../../package.json').engines.node, '24.x');
  assert.equal(path.basename(config.outputDirectory), 'dist');
});
