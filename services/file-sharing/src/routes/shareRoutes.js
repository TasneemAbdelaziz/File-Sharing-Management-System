const express = require("express");
const { createShareToken, getShare } = require("../controllers/shareController");

const router = express.Router();

/**
 * @swagger
 * /shares:
 *   post:
 *     summary: Returns share token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - file_id
 *               - recipient_email
 *             properties:
 *               file_id:
 *                 type: string
 *                 example: file-123
 *               recipient_email:
 *                 type: string
 *                 example: test@example.com
 *     responses:
 *       201:
 *         description: Share token returned
 */
router.post("/", createShareToken);

/**
 * @swagger
 * /shares/{token}:
 *   get:
 *     summary: Returns share by token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Share returned
 */
router.get("/:token", getShare);

module.exports = router;
