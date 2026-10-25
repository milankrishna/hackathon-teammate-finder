if (!process.env.VERCEL) {
  require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
}

const express = require('express');
const cors = require('cors');
const connectHackathonDB = require('./config/hackathonDB');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
// The deployed frontend/API share an origin. Local direct browser access is
// limited to Vite; normal local requests still use its same-origin /api proxy.
app.use(cors({ origin: process.env.VERCEL ? false : 'http://localhost:5173' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Hackathon Team Finder',
  });
});

async function ensureDatabase(req, res, next) {
  try {
    await connectHackathonDB();
    return next();
  } catch {
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
  }
}

app.use('/api/auth', ensureDatabase, authRoutes);
app.use('/api/teams', ensureDatabase, teamRoutes);
app.use('/api/requests', ensureDatabase, requestRoutes);
app.use('/api/admin', ensureDatabase, adminRoutes);

// API typos must never fall through to the React SPA or Express HTML errors.
app.use((req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  await connectHackathonDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

if (require.main === module && !process.env.VERCEL) {
  startServer().catch(() => {
    console.error('Server startup failed. Check the server database configuration.');
    process.exit(1);
  });
}
