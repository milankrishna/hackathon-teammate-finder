function requireAdmin(req, res, next) {
  // authenticate loads this role from the current User document, not JWT claims.
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
}

module.exports = requireAdmin;
