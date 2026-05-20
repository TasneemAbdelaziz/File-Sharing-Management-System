const request = require('supertest');
const { pool } = require('../../src/db/pool');
const { migrate } = require('../../src/db/migrations');
const app = require('../../src/index');

let dbAvailable = false;
const knexReady = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
};

describe('Feature Flag Service Integration Tests', () => {
  beforeAll(async () => {
    dbAvailable = await knexReady();
    if (!dbAvailable) {
      console.warn('Skipping integration tests because Postgres database is unavailable');
      return;
    }
    await migrate();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await pool.query('DELETE FROM feature_flags');
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    await pool.end();
  });

  test('POST /flags → GET /flags/:service/:name → flag exists in DB', async () => {
    if (!dbAvailable) return;

    await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    const response = await request(app).get('/flags/auth-service/DARK_MODE');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
  });

  test('POST /flags → PUT /flags/:service/:name toggles enabled and DB updated', async () => {
    if (!dbAvailable) return;

    await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
    await request(app).put('/flags/auth-service/DARK_MODE').send({ enabled: true });

    const response = await request(app).get('/flags/auth-service/DARK_MODE');
    expect(response.status).toBe(200);
    expect(response.body.data.enabled).toBe(true);
  });

  test('POST /flags → DELETE → GET returns 404', async () => {
    if (!dbAvailable) return;

    await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
    await request(app).delete('/flags/auth-service/DARK_MODE');

    const response = await request(app).get('/flags/auth-service/DARK_MODE');
    expect(response.status).toBe(404);
  });

  test('POST same flag twice → second returns 409, DB has only one record', async () => {
    if (!dbAvailable) return;

    await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
    const duplicateResponse = await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    expect(duplicateResponse.status).toBe(409);

    const response = await request(app).get('/flags/auth-service');
    expect(response.body.data.length).toBe(1);
  });

  test('GET /flags/:service with no flags → returns empty array', async () => {
    if (!dbAvailable) return;

    const response = await request(app).get('/flags/empty-service');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });
});
