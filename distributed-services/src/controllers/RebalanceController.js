/**
 * Controller — RebalanceController
 * Handles POST /rebalance/run
 */
const RebalanceService = require('../services/RebalanceService');

async function run(req, res) {
  const result = await RebalanceService.triggerRun();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'START_ERROR', message: result.error },
      meta: { service: 'rebalance-service', request_id: req.id },
    });
  }

  return res.status(202).json({
    success: true,
    data: result.run.toJSON(),
    meta: { service: 'rebalance-service', request_id: req.id },
  });
}

module.exports = { run };
