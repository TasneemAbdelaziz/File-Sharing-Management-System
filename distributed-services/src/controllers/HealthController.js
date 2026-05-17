/**
 * Controller — HealthController
 * Handles GET /health and GET /ready.
 * No business logic — just returns status responses.
 */

function health(req, res) {
  return res.status(200).json({
    success: true,
    data: { status: 'healthy' },
    meta: { service: 'replication-worker', request_id: req.id },
  });
}

function ready(req, res) {
  return res.status(200).json({
    success: true,
    data: { status: 'ready' },
    meta: { service: 'replication-worker', request_id: req.id },
  });
}

module.exports = { health, ready };
