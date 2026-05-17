const { Router } = require('express');
const controller = require('../controllers/keys.controller');

const router = Router();

router.post('/', controller.createKey);
router.post('/verify', controller.verifyKey);
router.post('/:id/revoke', controller.revokeKey);

module.exports = router;
