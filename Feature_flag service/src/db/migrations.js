const { pool } = require('./pool');
const logger = require('../logger');

const createFeatureFlagsTable = `
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  service VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service, name)
);
CREATE INDEX IF NOT EXISTS idx_flags_service ON feature_flags(service);
`;

async function migrate() {
  await pool.query(createFeatureFlagsTable);
}

if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Database migrations applied');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed', { message: error.message });
      process.exit(1);
    });
}

module.exports = { migrate };
