/**
 * Service — RebalanceService
 * Handles rebalance business logic.
 */
const RebalanceRun = require('../models/RebalanceRun');

// Mock Kafka producer
const producer = {
  send: async (payload) => { console.log('[Kafka] Produced:', payload); }
};

// Mock DB Table: rebalance_runs(id PK, status)
const db = {
  rebalance_runs: new Map()
};

async function triggerRun() {
  const run = new RebalanceRun();
  
  db.rebalance_runs.set(run.id, run);

  if (producer && producer.send) {
    await producer.send({
      topic: 'rebalance.started',
      messages: [{
        key: String(run.id),
        value: JSON.stringify(run.toJSON())
      }]
    });
  }

  return { success: true, run };
}

module.exports = { triggerRun };
