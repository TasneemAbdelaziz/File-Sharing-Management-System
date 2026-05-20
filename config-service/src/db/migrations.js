import pool from './pool.js';

export async function ensureMigrations() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS configs (
      service VARCHAR(100) NOT NULL,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (service, key)
    );
  `;

  const createIndexSql = `
    CREATE INDEX IF NOT EXISTS idx_configs_service ON configs(service);
  `;

  await pool.query(createTableSql);
  await pool.query(createIndexSql);
}
