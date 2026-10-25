const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const { validTeamId } = require('../controllers/teamController');
const { listTeams, deleteTeam } = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireAdmin);
router.get('/teams', listTeams);
router.delete('/teams/:id', validTeamId, deleteTeam);

module.exports = router;
