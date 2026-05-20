import request from 'supertest';
import { jest } from '@jest/globals';

const poolMock = {
  query: jest.fn()
};

const producerMock = {
  kafkaProducer: {
    publishConfigUpdate: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true)
  },
  initKafkaProducer: jest.fn().mockResolvedValue(undefined)
};

jest.unstable_mockModule('../../src/db/pool.js', () => ({ default: poolMock }));
jest.unstable_mockModule('../../src/kafka/producer.js', () => ({
  kafkaProducer: producerMock.kafkaProducer,
  initKafkaProducer: producerMock.initKafkaProducer
}));

const { default: app } = await import('../../src/index.js');

describe('Config Service Unit Tests', () => {
  beforeEach(() => {
    poolMock.query.mockReset();
    producerMock.kafkaProducer.publishConfigUpdate.mockClear();
    producerMock.kafkaProducer.isConnected.mockReturnValue(true);
  });

  test('PUT /config/:service with valid body returns 200 and correct response shape', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app)
      .put('/config/auth-service')
      .send({ key: 'MAX_CONNECTIONS', value: '100' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100' }));
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
    expect(producerMock.kafkaProducer.publishConfigUpdate).toHaveBeenCalled();
  });

  test('PUT /config/:service with missing key returns 400 validation error', async () => {
    const response = await request(app)
      .put('/config/auth-service')
      .send({ value: '100' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('PUT /config/:service with missing value returns 400 validation error', async () => {
    const response = await request(app)
      .put('/config/auth-service')
      .send({ key: 'MAX_CONNECTIONS' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('GET /config/:service returns 200 with array of configs', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app).get('/config/auth-service');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.configs)).toBe(true);
    expect(response.body.data.configs[0]).toEqual(expect.objectContaining({ key: 'MAX_CONNECTIONS' }));
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('GET /config/:service/:key returns 200 with single config object', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app).get('/config/auth-service/MAX_CONNECTIONS');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({ key: 'MAX_CONNECTIONS', value: '100' }));
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('GET /config/:service/:key when not found returns 404', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app).get('/config/auth-service/MISSING');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('GET /metrics returns Prometheus metrics format', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/?plain/);
    expect(response.text).toContain('http_requests_total');
  });

  test('GET /api-docs returns Swagger UI HTML', async () => {
    const response = await request(app).get('/api-docs');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('Swagger UI');
  });

  test('GET /api-docs.json returns OpenAPI JSON', async () => {
    const response = await request(app).get('/api-docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
    expect(response.body.info).toBeDefined();
  });

  test('GET /ready when DB is up returns 200', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    producerMock.kafkaProducer.isConnected.mockReturnValue(true);

    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ready');
    expect(response.body.meta.request_id).toMatch(/[0-9a-fA-F-]{36}/);
  });

  test('Kafka publish is called after successful PUT', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    await request(app)
      .put('/config/auth-service')
      .send({ key: 'MAX_CONNECTIONS', value: '100' });

    expect(producerMock.kafkaProducer.publishConfigUpdate).toHaveBeenCalledWith(expect.objectContaining({ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', timestamp: expect.any(String) }));
  });
});
