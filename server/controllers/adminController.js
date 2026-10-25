const mongoose = require('mongoose');
const Team = require('../models/Team');
const JoinRequest = require('../models/JoinRequest');

async function listTeams(req, res, next) {
  try {
    const teams = await Team.find()
      .select('_id hackathonName hackathonDate description skillsNeeded maxTeamSize creator members createdAt updatedAt')
      .sort({ createdAt: -1, _id: -1 })
      .populate('creator', '_id name skills');
    return res.status(200).json({ teams });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeam(req, res, next) {
  let session;
  try {
    session = await mongoose.startSession();
    const deleted = await session.withTransaction(async () => {
      const team = await Team.findById(req.params.id).session(session);
      if (!team) return false;
      await JoinRequest.deleteMany({ team: team._id }, { session });
      await Team.deleteOne({ _id: team._id }, { session });
      return true;
    });
    if (!deleted) return res.status(404).json({ error: 'Team not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  } finally {
    if (session) await session.endSession();
  }
}

module.exports = { listTeams, deleteTeam };
