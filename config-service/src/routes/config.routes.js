import express from 'express';
import {
  getServiceConfigs,
  getConfigItem,
  upsertConfig
} from '../controllers/config.controller.js';

const router = express.Router();

/**
 * @openapi
 * /config/{service}:
 *   put:
 *     summary: Update config value
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Config updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.put('/:service', upsertConfig);

/**
 * @openapi
 * /config/{service}:
 *   get:
 *     summary: Get all config keys for a service
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of config keys
 *       500:
 *         description: Server error
 */
router.get('/:service', getServiceConfigs);

/**
 * @openapi
 * /config/{service}/{key}:
 *   get:
 *     summary: Get a specific config value
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Config value returned successfully
 *       404:
 *         description: Configuration key not found
 *       500:
 *         description: Server error
 */
router.get('/:service/:key', getConfigItem);

export default router;
