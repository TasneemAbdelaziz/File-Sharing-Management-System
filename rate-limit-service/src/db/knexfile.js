require('dotenv').config();

module.exports = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'rate_limit_db',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rate_limit_db',
  },
  migrations: {
    directory: __dirname + '/migrations',
    tableName: 'knex_migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
};
