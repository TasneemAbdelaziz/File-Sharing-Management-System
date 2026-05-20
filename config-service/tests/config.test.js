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

jest.unstable_mockModule('../src/db/pool.js', () => ({ default: poolMock }));
jest.unstable_mockModule('../src/kafka/producer.js', () => ({
  kafkaProducer: producerMock.kafkaProducer,
  initKafkaProducer: producerMock.initKafkaProducer
}));

const { default: app } = await import('../src/index.js');

describe('Config Service API', () => {
  beforeEach(() => {
    poolMock.query.mockReset();
    producerMock.kafkaProducer.publishConfigUpdate.mockClear();
  });

  test('PUT /config/:service returns 200 with correct response shape', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app)
      .put('/config/auth-service')
      .send({ key: 'MAX_CONNECTIONS', value: '100' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100' });
    expect(response.body.meta.request_id).toBeDefined();
    expect(producerMock.kafkaProducer.publishConfigUpdate).toHaveBeenCalled();
  });

  test('GET /config/:service returns array of configs', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app).get('/config/auth-service');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.configs).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'MAX_CONNECTIONS' })]));
  });

  test('GET /config/:service/:key returns single config', async () => {
    poolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', updated_at: '2026-01-01T00:00:00Z' }] });

    const response = await request(app).get('/config/auth-service/MAX_CONNECTIONS');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({ key: 'MAX_CONNECTIONS', value: '100' }));
  });

  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  test('PUT /config/:service with missing key returns 400 validation error', async () => {
    const response = await request(app)
      .put('/config/auth-service')
      .send({ value: '100' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
  });
});
