import logger from '../logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    request_id: req.requestId,
    message: err.message,
    stack: err.stack
  });

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: {}
    },
    meta: {
      service: 'config-service',
      request_id: req.requestId
    }
  });
}
