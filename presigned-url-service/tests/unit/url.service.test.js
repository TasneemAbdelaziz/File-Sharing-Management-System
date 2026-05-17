/**
 * Unit Tests: Presigned URL Service
 * Tests: url.service.js and url.controller.js
 * Coverage: happy path, validation errors, edge cases
 */

// Mock dependencies BEFORE requiring the service
jest.mock('../../src/repositories/url.repository');
jest.mock('../../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getDB: jest.fn()
}));

const urlRepo = require('../../src/repositories/url.repository');
const urlService = require('../../src/services/url.service');

describe('UrlService - createPresignedUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should generate a valid upload URL with token (happy path)', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    const result = await urlService.createPresignedUrl('file-123', 'user-456', 'upload');

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('expires_at');
    expect(result.url).toContain('/upload/file-123');
    expect(result.url).toContain('?token=');
  });

  it('should generate a valid download URL (happy path)', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    const result = await urlService.createPresignedUrl('file-abc', 'user-xyz', 'download');

    expect(result.url).toContain('/download/file-abc');
  });

  it('should generate a unique token for each URL (uniqueness test)', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    const r1 = await urlService.createPresignedUrl('f1', 'u1', 'upload');
    const r2 = await urlService.createPresignedUrl('f1', 'u1', 'upload');

    expect(r1.url).not.toBe(r2.url); // tokens must be different
  });

  it('should set expiry to 1 hour from now', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);
    const before = new Date();

    const result = await urlService.createPresignedUrl('file-x', 'user-x', 'upload');

    const after = new Date();
    const expires = new Date(result.expires_at);
    const diffMs = expires - before;
    const oneHourMs = 60 * 60 * 1000;

    expect(diffMs).toBeGreaterThanOrEqual(oneHourMs - 1000); // within 1 second tolerance
    expect(diffMs).toBeLessThanOrEqual(oneHourMs + (after - before) + 1000);
  });

  it('should save URL record to database (persistence)', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);

    await urlService.createPresignedUrl('file-save', 'user-save', 'upload');

    expect(urlRepo.saveUrl).toHaveBeenCalledTimes(1);
    const savedArg = urlRepo.saveUrl.mock.calls[0][0];
    expect(savedArg).toHaveProperty('id');
    expect(savedArg).toHaveProperty('file_id', 'file-save');
    expect(savedArg).toHaveProperty('url');
    expect(savedArg).toHaveProperty('expires_at');
  });

  it('should use custom STORAGE_GATEWAY_URL from env', async () => {
    urlRepo.saveUrl.mockResolvedValue(undefined);
    process.env.STORAGE_GATEWAY_URL = 'http://my-custom-gateway:9000';

    const result = await urlService.createPresignedUrl('file-env', 'user-env', 'upload');

    expect(result.url).toContain('http://my-custom-gateway:9000');
    delete process.env.STORAGE_GATEWAY_URL;
  });
});

// Controller unit tests (using mock req/res)
describe('UrlController - generateUploadUrl', () => {
  const urlController = require('../../src/controllers/url.controller');

  const mockReq = (body = {}, headers = {}) => ({ body, headers });
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => jest.clearAllMocks());

  it('should return 400 if file_id is missing', async () => {
    const req = mockReq({ user_id: 'user-1' });
    const res = mockRes();

    await urlController.generateUploadUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('should return 400 if user_id is missing', async () => {
    const req = mockReq({ file_id: 'file-1' });
    const res = mockRes();

    await urlController.generateUploadUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 if both fields are missing (validation edge case)', async () => {
    const req = mockReq({});
    const res = mockRes();

    await urlController.generateUploadUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});
