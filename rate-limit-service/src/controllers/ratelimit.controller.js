const { v4: uuidv4 } = require('uuid');
const ratelimitService = require('../services/ratelimit.service');

function meta() {
  return { service: 'rate-limit-service', request_id: uuidv4() };
}

async function checkRateLimit(req, res) {
  try {
    const data = await ratelimitService.checkRateLimit(req.body);
    const status = data.allowed ? 200 : 429;
    return res.status(status).json({ success: data.allowed, data, meta: meta() });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, meta: meta() });
  }
}

async function setLimit(req, res) {
  try {
    const data = await ratelimitService.setLimit(req.body);
    return res.status(200).json({ success: true, data, meta: meta() });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, meta: meta() });
  }
}

module.exports = { checkRateLimit, setLimit };
