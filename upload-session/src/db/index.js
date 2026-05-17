const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({ // Create a new PostgreSQL connection pool
  host: process.env.DB_HOST || 'localhost', // Database host
  port: parseInt(process.env.DB_PORT) || 5432, // Database port
  database: process.env.DB_NAME || 'upload_session_db', // Database name
  user: process.env.DB_USER || 'postgres', // Database user
  password: process.env.DB_PASSWORD || 'postgres', // Database password
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout after 2 seconds if a connection cannot be established
});

pool.on('error', (err) => { // Listen for idle client errors to prevent process crash
  logger.error('Unexpected error on idle DB client', { error: err.message });
});

const query = async (text, params) => { // Wrapper function for executing queries with query duration logging
  const start = Date.now(); // Record start time
  const res = await pool.query(text, params); // Execute the query
  const duration = Date.now() - start; // Calculate query duration
  logger.debug('Executed query', { text, duration, rows: res.rowCount }); // Log query details
  return res; // Return query result
};

const getClient = () => pool.connect(); // Helper function to get a dedicated client from the pool (e.g., for transactions)

module.exports = { query, getClient, pool };
