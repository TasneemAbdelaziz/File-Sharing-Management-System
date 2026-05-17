const db = require('./index');
const logger = require('../utils/logger');

const SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS upload_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       UUID NOT NULL,
    owner_id      UUID NOT NULL,
    filename      VARCHAR(512) NOT NULL,
    total_size    BIGINT,
    total_chunks  INTEGER,
    status        VARCHAR(50) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'expired', 'failed')),
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_file_id    ON upload_sessions (file_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_owner_id   ON upload_sessions (owner_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_status     ON upload_sessions (status);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON upload_sessions (expires_at);

  -- Trigger: auto-update updated_at on row change
  CREATE OR REPLACE FUNCTION update_sessions_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_sessions_updated_at ON upload_sessions;
  CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_sessions_updated_at();
`;

const run = async () => { // Function to run database migrations
  try {
    logger.info('Running database migrations for upload-session...'); // Log start of migration
    await db.query(SQL); // Execute the SQL queries
    logger.info('Migration completed successfully.'); // Log success
    process.exit(0); // Exit process successfully after migration
  } catch (err) {
    logger.error('Migration failed', { error: err.message }); // Log failure details
    process.exit(1); // Exit process with failure code
  }
};

run(); // Execute the migration function on script run
