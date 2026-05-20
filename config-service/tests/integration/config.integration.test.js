import request from 'supertest';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const shouldRunIntegration = process.env.CI === 'true' || process.env.RUN_INTEGRATION_TESTS === 'true';

let pool;
let app;

if (shouldRunIntegration) {
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'config_test';
  process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
}

const describeOrSkip = shouldRunIntegration ? describe : describe.skip;

describeOrSkip('Config Service Integration Tests', () => {
  beforeAll(async () => {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await pool.query(`CREATE TABLE IF NOT EXISTS configs (
      service VARCHAR(100) NOT NULL,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (service, key)
    );`);

    const imported = await import('../../src/index.js');
    app = imported.default;
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM configs');
  });

  afterAll(async () => {
    await pool.end();
  });

  test('PUT then GET single persists config value in DB', async () => {
    await request(app)
      .put('/config/auth-service')
      .send({ key: 'MAX_CONNECTIONS', value: '100' })
      .expect(200);

    const response = await request(app).get('/config/auth-service/MAX_CONNECTIONS').expect(200);
    expect(response.body.data).toEqual(expect.objectContaining({ key: 'MAX_CONNECTIONS', value: '100' }));
  });

  test('PUT twice with same key updates value and does not duplicate', async () => {
    await request(app).put('/config/auth-service').send({ key: 'MAX_CONNECTIONS', value: '100' }).expect(200);
    await request(app).put('/config/auth-service').send({ key: 'MAX_CONNECTIONS', value: '200' }).expect(200);

    const response = await request(app).get('/config/auth-service').expect(200);
    expect(response.body.data.configs).toHaveLength(1);
    expect(response.body.data.configs[0].value).toBe('200');
  });

  test('GET /config/:service with no configs returns empty array', async () => {
    const response = await request(app).get('/config/no-config-service').expect(200);
    expect(response.body.data.configs).toEqual([]);
  });

  test('Full flow: PUT → GET all → GET single → consistency', async () => {
    await request(app).put('/config/auth-service').send({ key: 'TIMEOUT', value: '30' }).expect(200);
    const allResponse = await request(app).get('/config/auth-service').expect(200);
    expect(allResponse.body.data.configs).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'TIMEOUT', value: '30' })]));
    const singleResponse = await request(app).get('/config/auth-service/TIMEOUT').expect(200);
    expect(singleResponse.body.data).toEqual(expect.objectContaining({ service: 'auth-service', key: 'TIMEOUT', value: '30' }));
  });
});
