const express = require('express');
const router = express.Router();
const ReplicationController = require('../controllers/ReplicationController');

router.post('/tasks', ReplicationController.createTask);

module.exports = router;
