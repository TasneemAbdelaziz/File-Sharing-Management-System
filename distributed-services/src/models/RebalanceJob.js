/**
 * Model — RebalanceJob
 * Represents a single rebalance operation.
 */
const { v4: uuidv4 } = require('uuid');

class RebalanceJob {
  constructor({ reason = 'manual', initiated_by = 'system' } = {}) {
    this.rebalance_id = uuidv4();
    this.reason = reason;
    this.initiated_by = initiated_by;
    this.status = 'triggered';
    this.started_at = new Date().toISOString();
  }

  validate() {
    const allowed_reasons = ['manual', 'node_added', 'node_removed', 'scheduled'];
    if (!allowed_reasons.includes(this.reason)) {
      return { valid: false, error: `Invalid reason. Allowed: ${allowed_reasons.join(', ')}` };
    }
    return { valid: true, error: null };
  }

  toEvent() {
    return {
      event: 'rebalance.started',
      rebalance_id: this.rebalance_id,
      reason: this.reason,
      initiated_by: this.initiated_by,
      started_at: this.started_at,
    };
  }

  toJSON() {
    return {
      rebalance_id: this.rebalance_id,
      status: this.status,
      reason: this.reason,
      initiated_by: this.initiated_by,
      started_at: this.started_at,
    };
  }
}

module.exports = RebalanceJob;
