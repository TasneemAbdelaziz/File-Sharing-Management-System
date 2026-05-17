const express = require('express');
const router = express.Router();
const urlController = require('../controllers/url.controller');

router.post('/upload', urlController.generateUploadUrl);
router.post('/download', urlController.generateDownloadUrl);

module.exports = router;
