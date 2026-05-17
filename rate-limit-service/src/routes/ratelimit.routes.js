const { Router } = require('express');
const controller = require('../controllers/ratelimit.controller');

const router = Router();

router.post('/check', controller.checkRateLimit);
router.post('/config', controller.setLimit);

module.exports = router;
