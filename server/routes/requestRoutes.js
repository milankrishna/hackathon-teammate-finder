const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { myRequests } = require('../controllers/joinRequestController');

const router = express.Router();

router.get('/mine', authenticate, myRequests);

module.exports = router;
