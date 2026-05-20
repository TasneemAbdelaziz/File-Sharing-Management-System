const request = require('supertest');

const mockPool = { query: jest.fn() };
const mockProducer = {
  connectProducer: jest.fn().mockResolvedValue(undefined),
  publishFlagUpdated: jest.fn().mockResolvedValue(undefined),
  isProducerReady: jest.fn().mockResolvedValue(true)
};

jest.mock('../../src/db/pool', () => ({ pool: mockPool }));
jest.mock('../../src/kafka/producer', () => mockProducer);

const app = require('../../src/index');

describe('Feature Flag Service Unit Tests', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockProducer.publishFlagUpdated.mockReset();
  });

  test('POST /flags with valid body → 201, correct response shape', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: false, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ service: 'auth-service', name: 'DARK_MODE', enabled: false });
    expect(response.body.meta).toHaveProperty('request_id');
  });

  test('POST /flags with missing service → 400 validation error', async () => {
    const response = await request(app)
      .post('/flags')
      .send({ name: 'DARK_MODE', enabled: false });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/service is required/);
  });

  test('POST /flags with missing name → 400 validation error', async () => {
    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service', enabled: false });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/name is required/);
  });

  test('POST /flags with non-boolean enabled → 400 validation error', async () => {
    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service', name: 'DARK_MODE', enabled: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/enabled is required and must be a boolean/);
  });

  test('POST /flags with duplicate service+name → 409 conflict error', async () => {
    const error = new Error('duplicate');
    error.code = '23505';
    mockPool.query.mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/flags')
      .send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already exists/);
  });

  test('PUT /flags/:service/:name with valid body → 200 updated flag', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app)
      .put('/flags/auth-service/DARK_MODE')
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(response.body.data.enabled).toBe(true);
    expect(mockProducer.publishFlagUpdated).toHaveBeenCalled();
  });

  test('PUT /flags/:service/:name when flag not found → 404', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .put('/flags/auth-service/DARK_MODE')
      .send({ enabled: true });

    expect(response.status).toBe(404);
  });

  test('GET /flags/:service → 200 returns array', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app).get('/flags/auth-service');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /flags/:service/:name → 200 returns single flag', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app).get('/flags/auth-service/DARK_MODE');

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('DARK_MODE');
  });

  test('DELETE /flags/:service/:name → 200', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const response = await request(app).delete('/flags/auth-service/DARK_MODE');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ message: 'feature flag deleted' });
  });

  test('GET /health → 200 { success: true }', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('GET /ready → 200 when DB and Kafka are ready', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    mockProducer.isProducerReady.mockResolvedValueOnce(true);

    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ready');
  });

  test('GET /metrics returns Prometheus content type', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.text).toContain('http_requests_total');
  });

  test('GET /api-docs returns Swagger UI HTML', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('Swagger');
  });

  test('GET /api-docs.json returns OpenAPI JSON', async () => {
    const response = await request(app).get('/api-docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
  });

  test('Kafka publish called after successful PUT', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: true, updated_at: '2026-01-01T00:00:00.000Z' }] });

    await request(app).put('/flags/auth-service/DARK_MODE').send({ enabled: true });

    expect(mockProducer.publishFlagUpdated).toHaveBeenCalledWith(expect.objectContaining({ service: 'auth-service', name: 'DARK_MODE', enabled: true }));
  });

  test('Response always contains meta.request_id', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, service: 'auth-service', name: 'DARK_MODE', enabled: false, updated_at: '2026-01-01T00:00:00.000Z' }] });

    const response = await request(app).post('/flags').send({ service: 'auth-service', name: 'DARK_MODE', enabled: false });

    expect(response.body.meta).toHaveProperty('request_id');
  });
});
