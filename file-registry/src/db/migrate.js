const db = require('./index');
const logger = require('../utils/logger');

const SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL,
    filename    VARCHAR(512) NOT NULL,
    size        BIGINT NOT NULL CHECK (size >= 0),
    mime_type   VARCHAR(255),
    status      VARCHAR(50) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'deleted', 'pending')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_files_owner_id  ON files (owner_id);
  CREATE INDEX IF NOT EXISTS idx_files_status    ON files (status);
  CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at DESC);

  -- Trigger: auto-update updated_at on row change
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_files_updated_at ON files;
  CREATE TRIGGER trg_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

const run = async () => {
  try {
    logger.info('Running database migrations for file-registry...');
    await db.query(SQL);
    logger.info('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  }
};

run();
