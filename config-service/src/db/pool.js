import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../logger.js';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'config_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (error) => {
  logger.error('Database pool error', { error: error.message });
});

export default pool;
