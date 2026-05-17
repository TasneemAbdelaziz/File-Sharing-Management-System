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
      database: process.env.DB_NAME || 'url_db'
    }
  });

  // Ensure table exists
  const exists = await dbInstance.schema.hasTable('presigned_urls');
  if (!exists) {
    await dbInstance.schema.createTable('presigned_urls', table => {
      table.string('id').primary();
      table.string('file_id').notNullable();
      table.text('url').notNullable();
      table.timestamp('expires_at').notNullable();
    });
    console.log('Created table `presigned_urls`');
  }

  console.log('Connected to PostgreSQL (Presigned URL Service)');
}

function getDB() {
  if (!dbInstance) throw new Error('Database not initialized');
  return dbInstance;
}

module.exports = { connectDB, getDB };
