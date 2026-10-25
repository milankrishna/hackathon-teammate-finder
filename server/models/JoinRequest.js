const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, maxlength: 300 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

joinRequestSchema.index({ team: 1, requester: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
