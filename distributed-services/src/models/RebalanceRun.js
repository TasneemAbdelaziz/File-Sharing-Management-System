/**
 * Model — RebalanceRun
 * Maps to DB table: rebalance_runs(id PK, status)
 */
const { v4: uuidv4 } = require('uuid');

class RebalanceRun {
  constructor({ id, status = 'triggered' } = {}) {
    this.id = id || uuidv4();
    this.status = status;
  }

  validate() {
    return { valid: true, error: null };
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status
    };
  }
}

module.exports = RebalanceRun;
