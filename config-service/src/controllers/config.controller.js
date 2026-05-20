import pool from '../db/pool.js';
import { kafkaProducer } from '../kafka/producer.js';
import logger from '../logger.js';

function successResponse(res, data, requestId, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      service: 'config-service',
      request_id: requestId
    }
  });
}

function errorResponse(res, code, message, requestId, status = 400, details = {}) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      service: 'config-service',
      request_id: requestId
    }
  });
}

export async function upsertConfig(req, res, next) {
  const { service } = req.params;
  const { key, value } = req.body;

  if (!key || typeof key !== 'string' || !value || typeof value !== 'string') {
    return errorResponse(res, 'INVALID_PAYLOAD', 'Both key and value are required and must be strings.', req.requestId, 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO configs (service, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (service, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING service, key, value, updated_at`,
      [service, key, value]
    );

    const updatedConfig = result.rows[0];
    const message = {
      service,
      key,
      value,
      timestamp: new Date().toISOString()
    };

    kafkaProducer.publishConfigUpdate(message).catch((err) => {
      logger.error('Kafka publish failed', { request_id: req.requestId, error: err.message });
    });

    return successResponse(res, updatedConfig, req.requestId);
  } catch (error) {
    return next(error);
  }
}

export async function getServiceConfigs(req, res, next) {
  const { service } = req.params;

  try {
    const result = await pool.query(
      'SELECT service, key, value, updated_at FROM configs WHERE service = $1 ORDER BY key',
      [service]
    );

    return successResponse(res, { configs: result.rows }, req.requestId);
  } catch (error) {
    return next(error);
  }
}

export async function getConfigItem(req, res, next) {
  const { service, key } = req.params;

  try {
    const result = await pool.query(
      'SELECT service, key, value, updated_at FROM configs WHERE service = $1 AND key = $2',
      [service, key]
    );

    if (!result.rowCount) {
      return errorResponse(res, 'NOT_FOUND', 'Configuration key not found.', req.requestId, 404);
    }

    return successResponse(res, result.rows[0], req.requestId);
  } catch (error) {
    return next(error);
  }
}
