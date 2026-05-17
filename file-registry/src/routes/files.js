const express = require('express');
const router = express.Router();
const { createFile, getFile, deleteFile, activateFile } = require('../controllers/fileController');

// Core CRUD
router.post('/', createFile);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);

// Internal: activated by Upload Session after upload.completed
router.patch('/:id/activate', activateFile);

module.exports = router;
