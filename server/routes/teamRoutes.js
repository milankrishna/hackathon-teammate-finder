const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { validTeamId, createTeam, browseTeams, getTeam, updateTeam, deleteTeam, myTeams } = require('../controllers/teamController');
const { validRequestId, createRequest, teamRequests, decideRequest } = require('../controllers/joinRequestController');

const router = express.Router();

router.post('/', authenticate, createTeam);
router.get('/', browseTeams);
router.get('/mine', authenticate, myTeams);
router.post('/:id/requests', authenticate, validTeamId, createRequest);
router.get('/:id/requests', authenticate, validTeamId, teamRequests);
router.patch('/:id/requests/:requestId', authenticate, validTeamId, validRequestId, decideRequest);
router.get('/:id', validTeamId, getTeam);
router.patch('/:id', authenticate, validTeamId, updateTeam);
router.delete('/:id', authenticate, validTeamId, deleteTeam);

module.exports = router;
