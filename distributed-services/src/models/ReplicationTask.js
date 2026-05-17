/**
 * Model — ReplicationTask
 * Maps to DB table: replication_tasks(id PK, chunk_id, status, attempts)
 */
const { v4: uuidv4 } = require('uuid');

class ReplicationTask {
  constructor({ id, chunk_id, status = 'pending', attempts = 0 } = {}) {
    this.id = id || uuidv4();
    this.chunk_id = chunk_id;
    this.status = status;
    this.attempts = attempts;
  }

  validate() {
    const missing = [];
    if (!this.chunk_id) missing.push('chunk_id');
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  toJSON() {
    return {
      id: this.id,
      chunk_id: this.chunk_id,
      status: this.status,
      attempts: this.attempts
    };
  }
}

module.exports = ReplicationTask;
