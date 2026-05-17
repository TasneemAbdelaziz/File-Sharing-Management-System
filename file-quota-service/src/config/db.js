// Database Connection Configuration
const knex = require('knex');

let dbInstance;

async function connectDB() {
  dbInstance = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'quota_db'
    }
  });

  // Ensure table exists (for demo/development simplicity)
  const exists = await dbInstance.schema.hasTable('quotas');
  if (!exists) {
    await dbInstance.schema.createTable('quotas', table => {
      table.string('user_id').primary();
      table.bigInteger('max_storage').notNullable();
      table.bigInteger('used_storage').notNullable().defaultTo(0);
    });
    console.log('Created table `quotas`');
  }

  console.log('Connected to PostgreSQL (Quota Service)');
}

function getDB() {
  if (!dbInstance) throw new Error('Database not initialized');
  return dbInstance;
}

module.exports = { connectDB, getDB };
