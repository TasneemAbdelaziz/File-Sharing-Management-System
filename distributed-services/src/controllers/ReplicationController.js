/**
 * Controller — ReplicationController
 * Handles POST /replication/tasks
 */
const ReplicationService = require('../services/ReplicationService');

async function createTask(req, res) {
  const { chunk_id } = req.body;

  const result = await ReplicationService.createTask({ chunk_id });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: result.error },
      meta: { service: 'replication-worker', request_id: req.id }
    });
  }

  return res.status(201).json({
    success: true,
    data: result.task.toJSON(),
    meta: { service: 'replication-worker', request_id: req.id }
  });
}

module.exports = { createTask };
