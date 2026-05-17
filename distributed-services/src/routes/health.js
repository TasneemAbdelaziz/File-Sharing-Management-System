const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/HealthController');

router.get('/health', HealthController.health);
router.get('/ready', HealthController.ready);

module.exports = router;
