const { pool } = require('../db/pool');
const { publishFlagUpdated } = require('../kafka/producer');
const { updateFeatureFlagGauge } = require('../metrics');

const SERVICE_META = { service: 'feature-flag-service' };

function validateFlagPayload(body, requireEnabled = true) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a valid JSON object';
  }

  if (!body.service || typeof body.service !== 'string') {
    return 'service is required and must be a string';
  }

  if (!body.name || typeof body.name !== 'string') {
    return 'name is required and must be a string';
  }

  if (requireEnabled && typeof body.enabled !== 'boolean') {
    return 'enabled is required and must be a boolean';
  }

  return null;
}

async function createFlag(req, res, next) {
  try {
    const error = validateFlagPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: { message: error }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }

    const { service, name, enabled } = req.body;
    const query = `
      INSERT INTO feature_flags (service, name, enabled)
      VALUES ($1, $2, $3)
      RETURNING id, service, name, enabled, updated_at
    `;

    const { rows } = await pool.query(query, [service, name, enabled]);
    await updateFeatureFlagGauge();
    return res.status(201).json({ success: true, data: rows[0], meta: { ...SERVICE_META, request_id: req.requestId } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: { message: 'feature flag already exists' }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }
    next(error);
  }
}

async function updateFlag(req, res, next) {
  try {
    const { service, name } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: { message: 'enabled is required and must be a boolean' }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }

    const query = `
      UPDATE feature_flags
      SET enabled = $1, updated_at = NOW()
      WHERE service = $2 AND name = $3
      RETURNING id, service, name, enabled, updated_at
    `;

    const { rows } = await pool.query(query, [enabled, service, name]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'feature flag not found' }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }

    const updatedFlag = rows[0];
    await publishFlagUpdated(updatedFlag);

    return res.json({ success: true, data: updatedFlag, meta: { ...SERVICE_META, request_id: req.requestId } });
  } catch (error) {
    next(error);
  }
}

async function getFlagsByService(req, res, next) {
  try {
    const { service } = req.params;
    const query = `
      SELECT id, service, name, enabled, updated_at
      FROM feature_flags
      WHERE service = $1
      ORDER BY name
    `;
    const { rows } = await pool.query(query, [service]);
    return res.json({ success: true, data: rows, meta: { ...SERVICE_META, request_id: req.requestId } });
  } catch (error) {
    next(error);
  }
}

async function getFlagByName(req, res, next) {
  try {
    const { service, name } = req.params;
    const query = `
      SELECT id, service, name, enabled, updated_at
      FROM feature_flags
      WHERE service = $1 AND name = $2
    `;
    const { rows } = await pool.query(query, [service, name]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'feature flag not found' }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }
    return res.json({ success: true, data: rows[0], meta: { ...SERVICE_META, request_id: req.requestId } });
  } catch (error) {
    next(error);
  }
}

async function deleteFlag(req, res, next) {
  try {
    const { service, name } = req.params;
    const query = `
      DELETE FROM feature_flags
      WHERE service = $1 AND name = $2
      RETURNING id
    `;
    const { rows } = await pool.query(query, [service, name]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'feature flag not found' }, meta: { ...SERVICE_META, request_id: req.requestId } });
    }
    await updateFeatureFlagGauge();
    return res.json({ success: true, data: { message: 'feature flag deleted' }, meta: { ...SERVICE_META, request_id: req.requestId } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createFlag,
  updateFlag,
  getFlagsByService,
  getFlagByName,
  deleteFlag
};
