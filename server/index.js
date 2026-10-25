require('dotenv').config();

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
app.use(cors());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Hackathon Team Finder',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);

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

startServer();
