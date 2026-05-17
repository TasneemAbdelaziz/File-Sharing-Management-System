const { v4: uuidv4 } = require('uuid');

const success = (data, meta = {}) => ({ // success response
  success: true,
  data,
  meta: {
    service: 'upload-session',
    request_id: meta.request_id || uuidv4(),
    ...meta,
  },
});

const error = (code, message, details = {}, meta = {}) => ({ // error response
  success: false,
  error: { code, message, details }, // error code, message, and details
  meta: {
    service: 'upload-session',
    request_id: meta.request_id || uuidv4(), // request id
    ...meta,
  },
});

module.exports = { success, error }; // exports the success and error functions
