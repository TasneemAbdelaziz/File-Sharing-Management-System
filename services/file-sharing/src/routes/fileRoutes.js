const express = require("express");
const { createFile, getFile } = require("../controllers/fileController");

const router = express.Router();

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Creates a file record
 */
router.post("/", createFile);

/**
 * @swagger
 * /files/{fileId}:
 *   get:
 *     summary: Returns a file record
 */
router.get("/:fileId", getFile);

module.exports = router;