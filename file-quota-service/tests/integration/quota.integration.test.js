/**
 * Integration Tests: File Quota Service
 * Tests: HTTP endpoints using supertest
 * Note: Uses mocked DB and Kafka for CI environment
 */

// Mock DB and Kafka before loading the app
jest.mock('../../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getDB: jest.fn()
}));
jest.mock('../../src/config/kafka', () => ({
  connectKafka: jest.fn().mockResolvedValue(undefined),
  publishQuotaExceeded: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/repositories/quota.repository');

const request = require('supertest');
const app = require('../../src/index');
const quotaRepo = require('../../src/repositories/quota.repository');

describe('GET /health', () => {
  it('should return 200 with status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('file-quota');
  });
});

describe('GET /ready', () => {
  it('should return 200 with status READY', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
  });
});

describe('GET /metrics', () => {
  it('should return Prometheus metrics in text format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});

describe('GET /quota/:user_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return quota for an existing user', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-1',
      max_storage: 5368709120,
      used_storage: 1024
    });

    const res = await request(app).get('/quota/user-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user_id).toBe('user-1');
  });

  it('should auto-create and return quota for a new user', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue(null);
    quotaRepo.createQuota.mockResolvedValue({
      user_id: 'new-user',
      max_storage: 5368709120,
      used_storage: 0
    });

    const res = await request(app).get('/quota/new-user');
    expect(res.status).toBe(200);
    expect(res.body.data.used_storage).toBe(0);
  });

  it('should return 500 on database error', async () => {
    quotaRepo.getQuotaByUserId.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app).get('/quota/user-error');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /quota/check', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 allowed=true when under quota', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-ok',
      max_storage: 5368709120,
      used_storage: 100
    });

    const res = await request(app)
      .post('/quota/check')
      .send({ user_id: 'user-ok', new_file_size: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Quota check passed');
  });

  it('should return 403 QUOTA_EXCEEDED when over limit', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-full',
      max_storage: 1000,
      used_storage: 999
    });

    const res = await request(app)
      .post('/quota/check')
      .send({ user_id: 'user-full', new_file_size: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
  });

  it('should return 400 when body is missing required fields', async () => {
    const res = await request(app)
      .post('/quota/check')
      .send({ user_id: 'user-only' }); // missing new_file_size

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /quota/update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 on successful update', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-upd',
      max_storage: 5368709120,
      used_storage: 0
    });
    quotaRepo.updateUsedStorage.mockResolvedValue({
      user_id: 'user-upd',
      max_storage: 5368709120,
      used_storage: 2048
    });

    const res = await request(app)
      .post('/quota/update')
      .send({ user_id: 'user-upd', used_storage: 2048 });

    expect(res.status).toBe(200);
    expect(res.body.data.used_storage).toBe(2048);
  });

  it('should return 400 when used_storage is missing', async () => {
    const res = await request(app)
      .post('/quota/update')
      .send({ user_id: 'user-1' });

    expect(res.status).toBe(400);
  });
});
