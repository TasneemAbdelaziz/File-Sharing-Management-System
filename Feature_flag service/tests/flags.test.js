const request = require('supertest');

const mockPool = {
  query: jest.fn()
};

const mockProducer = {
  connectProducer: jest.fn().mockResolvedValue(undefined),
  publishFlagUpdated: jest.fn().mockResolvedValue(undefined),
  isProducerReady: jest.fn().mockResolvedValue(true)
};

jest.mock('../src/db/pool', () => ({ pool: mockPool }));
jest.mock('../src/kafka/producer', () => mockProducer);

const app = require('../src/index');

describe('Feature Flag Service API', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockProducer.publishFlagUpdated.mockReset();
  });

  test('POST /flags → 201 creates flag', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: false, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
    expect(response.body.meta).toHaveProperty('request_id');
  });

  test('PUT /flags/:service/:name → 200 updates flag and publishes event', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app)
      .put('/flags/auth-service/DARK_MODE')
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockProducer.publishFlagUpdated).toHaveBeenCalledWith(expect.objectContaining({ service: 'auth-service', name: 'DARK_MODE', enabled: true }));
    expect(response.body.meta).toHaveProperty('request_id');
  });

  test('GET /flags/:service → 200 returns array', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app).get('/flags/auth-service');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).toMatchObject({ service: 'auth-service', name: 'DARK_MODE' });
    expect(response.body.meta).toHaveProperty('request_id');
  });

  test('GET /flags/:service/:name → 200 returns single flag', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app).get('/flags/auth-service/DARK_MODE');

    expect(response.status).toBe(200);
    expect(response.body.meta).toHaveProperty('request_id');
    expect(response.body.data).toMatchObject({ service: 'auth-service', name: 'DARK_MODE' });
  });

  test('DELETE /flags/:service/:name → 200 deletes flag', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const response = await request(app).delete('/flags/auth-service/DARK_MODE');

    expect(response.body.meta).toHaveProperty('request_id');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ message: 'feature flag deleted' });
  });

  test('GET /health → 200', async () => {
    const response = await request(app).get('/health');

    expect(response.body.meta).toHaveProperty('request_id');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ status: 'ok' });
  });

  test('POST /flags with missing fields → 400', async () => {
    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service' });
  expect(response.body.meta).toHaveProperty('request_id');
  
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
