/**
 * Service — ReplicationService
 * Handles replication business logic and DB interactions.
 */
const ReplicationTask = require('../models/ReplicationTask');

// Mock Kafka producer
const producer = {
  send: async (payload) => { console.log('[Kafka] Produced:', payload); }
};

const TOPICS = {
  OUT: process.env.KAFKA_TOPIC_OUT || 'replication.completed',
  DLQ: process.env.KAFKA_TOPIC_DLQ || 'replication.task.created.DLQ',
};

const MAX_RETRIES = 3;

// Mock DB Table: replication_tasks(id PK, chunk_id, status, attempts)
const db = {
  replication_tasks: new Map()
};

async function createTask({ chunk_id }) {
  const task = new ReplicationTask({ chunk_id });
  const { valid, missing } = task.validate();
  
  if (!valid) {
    return { success: false, error: `Missing fields: ${missing.join(', ')}` };
  }

  db.replication_tasks.set(task.id, task);
  return { success: true, task };
}

/**
 * Execute a single replication task with retry + DLQ logic.
 * Triggered via Kafka event: replication.task.created
 * @param {object} rawTaskData - raw parsed Kafka message value
 */
async function processTask(rawTaskData) {
  let task = new ReplicationTask(rawTaskData);
  
  // Try to find existing in DB or save new
  if (db.replication_tasks.has(task.id)) {
    task = db.replication_tasks.get(task.id);
  } else {
    db.replication_tasks.set(task.id, task);
  }

  const { valid, missing } = task.validate();
  if (!valid) {
    throw new Error(`Invalid task — missing fields: ${missing.join(', ')}`);
  }

  let lastError;

  while (task.attempts < MAX_RETRIES) {
    task.attempts++;
    task.status = 'processing';
    db.replication_tasks.set(task.id, task);

    try {
      await _replicateChunk(task);
      
      task.status = 'completed';
      db.replication_tasks.set(task.id, task);

      if (producer && producer.send) {
        await producer.send({
          topic: TOPICS.OUT,
          messages: [
            {
              key: String(task.id),
              value: JSON.stringify({
                event: 'replication.completed',
                ...task.toJSON(),
                completed_at: new Date().toISOString(),
              }),
            },
          ],
        });
      }

      console.log(`[ReplicationService] Task ${task.id} completed on attempt ${task.attempts}`);
      return { success: true, task };
    } catch (err) {
      lastError = err;
      console.warn(`[ReplicationService] Attempt ${task.attempts}/${MAX_RETRIES} failed for task ${task.id}: ${err.message}`);
    }
  }

  task.status = 'failed';
  db.replication_tasks.set(task.id, task);

  // All retries exhausted — send to DLQ
  if (producer && producer.send) {
    await producer.send({
      topic: TOPICS.DLQ,
      messages: [
        {
          key: String(task.id),
          value: JSON.stringify({
            ...task.toJSON(),
            error: lastError.message,
            failed_at: new Date().toISOString(),
          }),
        },
      ],
    });
  }

  console.error(`[ReplicationService] Task ${task.id} sent to DLQ after ${MAX_RETRIES} retries`);
  return { success: false, task, error: lastError.message };
}

/**
 * Pure background infrastructure work:
 * 1. Reads chunk from source node
 * 2. Writes to target
 * 3. Updates chunk_locations
 * @param {ReplicationTask} task
 */
async function _replicateChunk(task) {
  // TODO: GET chunk bytes from source node
  // TODO: PUT chunk bytes to target node
  // TODO: PATCH /chunk-locations to register new location
  await new Promise((r) => setTimeout(r, 100)); // simulate I/O
}

module.exports = { createTask, processTask };
