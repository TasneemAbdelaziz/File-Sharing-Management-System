const express = require('express');
const router = express.Router();
const RebalanceController = require('../controllers/RebalanceController');

router.post('/run', RebalanceController.run);

module.exports = router;
