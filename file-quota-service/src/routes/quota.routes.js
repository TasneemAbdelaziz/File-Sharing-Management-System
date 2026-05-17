const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');

router.get('/:user_id', quotaController.getQuota);
router.post('/check', quotaController.checkQuota);
router.post('/update', quotaController.updateQuota);

module.exports = router;
