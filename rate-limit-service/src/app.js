require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const knex = require('knex')(require('./db/knexfile'));
const ratelimitRoutes = require('./routes/ratelimit.routes');
const kafkaProducer = require('./kafka/producer');

const app = express();
const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'rate-limit-service';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy', service: SERVICE_NAME },
    meta: { service: SERVICE_NAME, request_id: uuidv4() },
  });
});

app.get('/ready', async (req, res) => {
  try {
    await knex.raw('SELECT 1');
    res.json({
      success: true,
      data: { status: 'ready', service: SERVICE_NAME },
      meta: { service: SERVICE_NAME, request_id: uuidv4() },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: { status: 'not ready', reason: 'database unavailable' },
      meta: { service: SERVICE_NAME, request_id: uuidv4() },
    });
  }
});

app.use('/ratelimit', ratelimitRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    meta: { service: SERVICE_NAME, request_id: uuidv4() },
  });
});

async function runMigrations() {
  console.log('[DB] Running migrations...');
  await knex.migrate.latest();
  console.log('[DB] Migrations complete');
}

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Startup failed:`, err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log(`[${SERVICE_NAME}] Shutting down...`);
  await kafkaProducer.disconnect();
  await knex.destroy();
  process.exit(0);
});

start();
