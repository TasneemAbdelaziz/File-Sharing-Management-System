/**
 * Integration Tests: Presigned URL Service
 * Tests: HTTP endpoints using supertest
 * Note: Uses mocked DB for CI environment
 */

jest.mock('../../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getDB: jest.fn()
}));
jest.mock('../../src/repositories/url.repository');

const request = require('supertest');
const app = require('../../src/index');
const urlRepo = require('../../src/repositories/url.repository');

describe('GET /health', () => {
  it('should return 200 with status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('presigned-url');
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

describe('POST /urls/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 with a valid presigned upload URL', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/urls/upload')
      .send({ file_id: 'file-upload-123', user_id: 'user-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain('/upload/file-upload-123');
    expect(res.body.data.url).toContain('?token=');
    expect(res.body.data).toHaveProperty('expires_at');
  });

  it('should return 400 when file_id is missing', async () => {
    const res = await request(app)
      .post('/urls/upload')
      .send({ user_id: 'user-1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 400 when user_id is missing', async () => {
    const res = await request(app)
      .post('/urls/upload')
      .send({ file_id: 'file-123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /urls/download', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 with a valid presigned download URL', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/urls/download')
      .send({ file_id: 'file-dl-456', user_id: 'user-2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain('/download/file-dl-456');
  });

  it('should return 400 when both fields are missing', async () => {
    const res = await request(app)
      .post('/urls/download')
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 500 on repository failure', async () => {
    urlRepo.saveUrl.mockRejectedValue(new Error('DB write failed'));

    const res = await request(app)
      .post('/urls/download')
      .send({ file_id: 'file-fail', user_id: 'user-fail' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
