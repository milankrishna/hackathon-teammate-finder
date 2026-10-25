const mongoose = require('mongoose');
const Team = require('../models/Team');
const JoinRequest = require('../models/JoinRequest');

const editableFields = ['hackathonName', 'hackathonDate', 'description', 'skillsNeeded', 'maxTeamSize'];
const publicUserFields = '_id name skills';

function validateTeam(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Provide a JSON object containing team fields.' };
  }
  const fields = Object.keys(body);
  if (partial && (!fields.length || fields.some((field) => !editableFields.includes(field)))) {
    return { error: 'Only hackathonName, hackathonDate, description, skillsNeeded, and maxTeamSize may be edited.' };
  }
  const values = {};
  for (const field of ['hackathonName', 'description']) {
    if (!partial || Object.hasOwn(body, field)) {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        return { error: `${field} must be a non-empty string.` };
      }
      values[field] = body[field].trim();
    }
  }
  if (!partial || Object.hasOwn(body, 'hackathonDate')) {
    const input = typeof body.hackathonDate === 'string' ? body.hackathonDate.trim() : '';
    const calendarDay = input.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
    const day = new Date(`${calendarDay}T00:00:00.000Z`);
    const date = new Date(input);
    if (!calendarDay || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== calendarDay ||
        !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      return { error: 'hackathonDate must be a valid future date.' };
    }
    values.hackathonDate = date;
  }
  if (!partial || Object.hasOwn(body, 'skillsNeeded')) {
    const skills = body.skillsNeeded === undefined && !partial ? [] : body.skillsNeeded;
    if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === 'string')) {
      return { error: 'skillsNeeded must be an array of strings.' };
    }
    values.skillsNeeded = skills.map((skill) => skill.trim());
  }
  if (!partial || Object.hasOwn(body, 'maxTeamSize')) {
    if (!Number.isSafeInteger(body.maxTeamSize) || body.maxTeamSize < 2) {
      return { error: 'maxTeamSize must be an integer of at least 2.' };
    }
    values.maxTeamSize = body.maxTeamSize;
  }
  return { values };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validTeamId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ error: 'Invalid team ID.' });
  }
  return next();
}

async function createTeam(req, res, next) {
  const { values, error } = validateTeam(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const team = await Team.create({ ...values, creator: req.user.id, members: [req.user.id] });
    return res.status(201).json({ team });
  } catch (error) {
    return next(error);
  }
}

async function browseTeams(req, res, next) {
  const { search, skill, page = '1', limit = '10' } = req.query;
  if ([search, skill].some((value) => value !== undefined && typeof value !== 'string') ||
      typeof page !== 'string' || !/^[1-9]\d*$/.test(page) ||
      typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit)) {
    return res.status(400).json({ error: 'Search and skill must be strings; page and limit must be positive integers.' });
  }
  const pageNumber = Number(page);
  const limitNumber = Math.min(Number(limit), 50);
  const skip = (pageNumber - 1) * limitNumber;
  if (!Number.isSafeInteger(pageNumber) || !Number.isSafeInteger(Number(limit)) || !Number.isSafeInteger(skip)) {
    return res.status(400).json({ error: 'Pagination values are too large.' });
  }
  const filter = {};
  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ hackathonName: regex }, { description: regex }];
  }
  if (skill?.trim()) {
    filter.skillsNeeded = new RegExp(`^${escapeRegex(skill.trim())}$`, 'i');
  }
  try {
    const [teams, total] = await Promise.all([
      Team.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limitNumber)
        .populate('creator', publicUserFields),
      Team.countDocuments(filter),
    ]);
    return res.status(200).json({ teams, page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) });
  } catch (error) {
    return next(error);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await Team.findById(req.params.id)
      .populate('creator', publicUserFields).populate('members', publicUserFields);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    return res.status(200).json({ team });
  } catch (error) {
    return next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    if (team.creator.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the team creator may edit this team.' });
    }
    const { values, error } = validateTeam(req.body, true);
    if (error) return res.status(400).json({ error });
    const filter = { _id: team._id, creator: req.user.id };
    if (values.maxTeamSize !== undefined) {
      filter.$expr = { $lte: [{ $size: '$members' }, values.maxTeamSize] };
    }
    const updatedTeam = await Team.findOneAndUpdate(filter, { $set: values }, { new: true, runValidators: true });
    if (!updatedTeam) {
      return res.status(409).json({ error: 'Team changed or maxTeamSize is below the current member count.' });
    }
    return res.status(200).json({ team: updatedTeam });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeam(req, res, next) {
  let session;
  try {
    session = await mongoose.startSession();
    const result = await session.withTransaction(async () => {
      const team = await Team.findById(req.params.id).session(session);
      if (!team) return 404;
      if (team.creator.toString() !== req.user.id) return 403;
      await JoinRequest.deleteMany({ team: team._id }, { session });
      await Team.deleteOne({ _id: team._id }, { session });
      return 204;
    });
    if (result === 404) return res.status(404).json({ error: 'Team not found.' });
    if (result === 403) return res.status(403).json({ error: 'Only the team creator may delete this team.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  } finally {
    if (session) await session.endSession();
  }
}

async function myTeams(req, res, next) {
  try {
    const teams = await Team.find({ creator: req.user.id }).sort({ createdAt: -1, _id: -1 })
      .populate('creator', publicUserFields);
    return res.status(200).json({ teams });
  } catch (error) {
    return next(error);
  }
}

module.exports = { validTeamId, createTeam, browseTeams, getTeam, updateTeam, deleteTeam, myTeams };
