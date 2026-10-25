const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  hackathonName: { type: String, required: true, trim: true },
  hackathonDate: { type: Date, required: true },
  description: { type: String, required: true, trim: true },
  skillsNeeded: { type: [String], default: [] },
  maxTeamSize: { type: Number, required: true, min: 2 },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
