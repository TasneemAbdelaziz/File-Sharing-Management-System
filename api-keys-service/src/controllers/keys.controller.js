const { v4: uuidv4 } = require('uuid');
const keysService = require('../services/keys.service');

function meta() {
  return { service: 'api-keys-service', request_id: uuidv4() };
}

async function createKey(req, res) {
  try {
    const data = await keysService.createKey(req.body);
    return res.status(201).json({ success: true, data, meta: meta() });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, meta: meta() });
  }
}

async function verifyKey(req, res) {
  try {
    const data = await keysService.verifyKey(req.body);
    return res.status(200).json({ success: true, data, meta: meta() });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, meta: meta() });
  }
}

async function revokeKey(req, res) {
  try {
    const data = await keysService.revokeKey(req.params.id);
    return res.status(200).json({ success: true, data, meta: meta() });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, meta: meta() });
  }
}

module.exports = { createKey, verifyKey, revokeKey };
