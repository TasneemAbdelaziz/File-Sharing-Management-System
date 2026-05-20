const express = require('express');
const {
  createFlag,
  updateFlag,
  getFlagsByService,
  getFlagByName,
  deleteFlag
} = require('../controllers/flags.controller');

const router = express.Router();

/**
 * @openapi
 * /flags:
 *   post:
 *     summary: Create a new feature flag
 *     tags:
 *       - Feature Flags
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service
 *               - name
 *               - enabled
 *             properties:
 *               service:
 *                 type: string
 *               name:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Feature flag created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate feature flag
 *       500:
 *         description: Internal server error
 */
router.post('/', createFlag);

/**
 * @openapi
 * /flags/{service}/{name}:
 *   put:
 *     summary: Update or toggle an existing feature flag
 *     tags:
 *       - Feature Flags
 *     parameters:
 *       - in: path
 *         name: service
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Feature flag updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Feature flag not found
 *       500:
 *         description: Internal server error
 */
router.put('/:service/:name', updateFlag);

/**
 * @openapi
 * /flags/{service}:
 *   get:
 *     summary: Get all flags for a service
 *     tags:
 *       - Feature Flags
 *     parameters:
 *       - in: path
 *         name: service
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: List of feature flags
 *       500:
 *         description: Internal server error
 */
router.get('/:service', getFlagsByService);

/**
 * @openapi
 * /flags/{service}/{name}:
 *   get:
 *     summary: Get a single feature flag
 *     tags:
 *       - Feature Flags
 *     parameters:
 *       - in: path
 *         name: service
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Feature flag returned
 *       404:
 *         description: Feature flag not found
 *       500:
 *         description: Internal server error
 */
router.get('/:service/:name', getFlagByName);

/**
 * @openapi
 * /flags/{service}/{name}:
 *   delete:
 *     summary: Delete a feature flag
 *     tags:
 *       - Feature Flags
 *     parameters:
 *       - in: path
 *         name: service
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Feature flag deleted
 *       404:
 *         description: Feature flag not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:service/:name', deleteFlag);

module.exports = router;
