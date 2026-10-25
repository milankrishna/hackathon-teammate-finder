const mongoose = require('mongoose');
const Team = require('../models/Team');
const JoinRequest = require('../models/JoinRequest');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

async function inTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } finally {
    await session.endSession();
  }
}

function handleError(error, res, next) {
  if (error.code === 11000) {
    return res.status(409).json({ error: 'You have already requested membership in this team.' });
  }
  if ([400, 403, 404, 409].includes(error.status)) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

function validRequestId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.requestId)) {
    return res.status(400).json({ error: 'Invalid request ID.' });
  }
  return next();
}

async function createRequest(req, res, next) {
  const body = req.body === undefined ? {} : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 300))) {
    return res.status(400).json({ error: 'message must be a string of at most 300 characters.' });
  }

  try {
    const request = await inTransaction(async (session) => {
      const team = await Team.findById(req.params.id).session(session);
      if (!team) fail(404, 'Team not found.');
      if (team.creator.toString() === req.user.id || team.members.some((id) => id.toString() === req.user.id)) {
        fail(409, 'You created or already belong to this team.');
      }
      if (team.members.length >= team.maxTeamSize) fail(409, 'Team is full.');
      if (await JoinRequest.exists({ team: team._id, requester: req.user.id }).session(session)) {
        fail(409, 'You have already requested membership in this team.');
      }

      // Serialize creation with membership changes and team deletion to avoid orphan requests.
      await Team.updateOne({ _id: team._id }, { $inc: { __v: 1 } }, { session });
      const [created] = await JoinRequest.create([{
        team: team._id,
        requester: req.user.id,
        message: body.message,
        status: 'pending',
      }], { session });
      return created;
    });
    return res.status(201).json({ request });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function teamRequests(req, res, next) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    if (team.creator.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the team creator may view these requests.' });
    }
    const requests = await JoinRequest.find({ team: team._id }).sort({ createdAt: -1, _id: -1 })
      .populate('requester', '_id name skills');
    return res.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
}

async function decideRequest(req, res, next) {
  const status = req.body?.status;
  if (status !== 'accepted' && status !== 'rejected') {
    return res.status(400).json({ error: 'status must be accepted or rejected.' });
  }

  try {
    const request = await inTransaction(async (session) => {
      const team = await Team.findById(req.params.id).session(session);
      if (!team) fail(404, 'Team not found.');
      if (team.creator.toString() !== req.user.id) {
        fail(403, 'Only the team creator may decide these requests.');
      }
      const pending = await JoinRequest.findOne({ _id: req.params.requestId, team: team._id }).session(session);
      if (!pending) fail(404, 'Join request not found for this team.');
      if (pending.status !== 'pending') fail(409, 'This request has already been decided.');
      if (pending.requester.toString() === team.creator.toString()) {
        fail(409, 'Creators cannot decide their own membership requests.');
      }

      if (status === 'accepted') {
        const updatedTeam = await Team.findOneAndUpdate({
          _id: team._id,
          creator: req.user.id,
          members: { $ne: pending.requester },
          $expr: { $lt: [{ $size: '$members' }, '$maxTeamSize'] },
        }, { $addToSet: { members: pending.requester } }, { session, new: true });
        if (!updatedTeam) fail(409, 'Team is full or the requester is already a member.');
      }

      const decided = await JoinRequest.findOneAndUpdate({
        _id: pending._id, team: team._id, status: 'pending',
      }, { $set: { status } }, { session, new: true, runValidators: true });
      if (!decided) fail(409, 'This request has already been decided.');
      return decided;
    });
    return res.status(200).json({ request });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function myRequests(req, res, next) {
  try {
    const requests = await JoinRequest.find({ requester: req.user.id }).sort({ createdAt: -1, _id: -1 })
      .populate('team', '_id hackathonName');
    return res.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
}

module.exports = { validRequestId, createRequest, teamRequests, decideRequest, myRequests };
