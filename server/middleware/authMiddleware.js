const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const authorization = req.get('Authorization');
  const match = typeof authorization === 'string' && authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!payload || typeof payload.id !== 'string' || !mongoose.isObjectIdOrHexString(payload.id)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const user = await User.findById(payload.id).select('_id role');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
