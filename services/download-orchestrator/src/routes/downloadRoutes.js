const express = require("express");
const { getDownloadPlan } = require("../controllers/downloadController");

const router = express.Router();

/**
 * @swagger
 * /downloads/{file_id}/plan:
 *   get:
 *     summary: Returns download plan
 *     parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Download plan returned
 */
router.get("/:file_id/plan", getDownloadPlan);

module.exports = router;
