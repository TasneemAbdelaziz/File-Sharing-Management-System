const { v4: uuidv4 } = require('uuid');

/**
 * Build a standardized success response
 */
const success = (data, meta = {}) => ({
  success: true,
  data,
  meta: {
    service: 'file-registry',
    request_id: meta.request_id || uuidv4(),
    ...meta,
  },
});

/**
 * Build a standardized error response
 */
const error = (code, message, details = {}, meta = {}) => ({
  success: false,
  error: { code, message, details },
  meta: {
    service: 'file-registry',
    request_id: meta.request_id || uuidv4(),
    ...meta,
  },
});

module.exports = { success, error };
