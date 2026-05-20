function errorHandler(err, req, res) {
  const status = err.status || 500;
  const response = {
    success: false,
    error: {
      message: err.message || 'Internal server error'
    },
    meta: { service: 'feature-flag-service', request_id: req.requestId }
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = { errorHandler };
