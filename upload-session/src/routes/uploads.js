const express = require('express');
const router = express.Router();
const { startSession, finishSession, getSession } = require('../controllers/sessionController');

// Start a new upload session
router.post('/start', startSession); // Map POST /start to startSession controller

// Finish (complete) an upload session — triggers Kafka upload.completed
router.post('/:id/finish', finishSession); // Map POST /:id/finish to finishSession controller

// Query session status
router.get('/:id', getSession); // Map GET /:id to getSession controller

module.exports = router; // Export the router instance
