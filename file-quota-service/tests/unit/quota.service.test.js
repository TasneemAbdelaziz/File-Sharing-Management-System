/**
 * Unit Tests: File Quota Service
 * Tests: quota.service.js (business logic layer)
 * Coverage: happy path, validation, edge cases
 */

// Mock the repository and kafka modules BEFORE requiring the service
jest.mock('../../src/repositories/quota.repository');
jest.mock('../../src/config/kafka', () => ({
  publishQuotaExceeded: jest.fn().mockResolvedValue(undefined)
}));

const quotaRepo = require('../../src/repositories/quota.repository');
const { publishQuotaExceeded } = require('../../src/config/kafka');
const quotaService = require('../../src/services/quota.service');

describe('QuotaService - getQuota', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return existing quota for a user (happy path)', async () => {
    const mockQuota = { user_id: 'user-1', max_storage: 5368709120, used_storage: 1000 };
    quotaRepo.getQuotaByUserId.mockResolvedValue(mockQuota);

    const result = await quotaService.getQuota('user-1');

    expect(quotaRepo.getQuotaByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockQuota);
  });

  it('should create a new quota if user has none (auto-provision)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue(null);
    const newQuota = { user_id: 'user-new', max_storage: 5368709120, used_storage: 0 };
    quotaRepo.createQuota.mockResolvedValue(newQuota);

    const result = await quotaService.getQuota('user-new');

    expect(quotaRepo.createQuota).toHaveBeenCalledWith('user-new', 5368709120);
    expect(result).toEqual(newQuota);
  });

  it('should set default max_storage to 5GB (5368709120 bytes)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue(null);
    quotaRepo.createQuota.mockResolvedValue({ user_id: 'u', max_storage: 5368709120, used_storage: 0 });

    await quotaService.getQuota('u');

    expect(quotaRepo.createQuota).toHaveBeenCalledWith('u', 5368709120);
  });
});

describe('QuotaService - checkQuota', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should allow upload when usage is within limit (happy path)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-1',
      max_storage: 5368709120,
      used_storage: 1000000
    });

    const result = await quotaService.checkQuota('user-1', 500000);

    expect(result.allowed).toBe(true);
    expect(result.current_used).toBe(1000000);
  });

  it('should deny upload when usage would exceed limit (quota exceeded)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-2',
      max_storage: 5368709120,
      used_storage: 5368000000 // almost full
    });

    const result = await quotaService.checkQuota('user-2', 1000000); // 1MB new file pushes over limit

    expect(result.allowed).toBe(false);
    expect(publishQuotaExceeded).toHaveBeenCalledWith(
      'user-2',
      5368000000,
      5368709120,
      1000000
    );
  });

  it('should deny upload at exact boundary (edge case: used + new = max)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-3',
      max_storage: 1000,
      used_storage: 500
    });

    // 500 + 501 > 1000, should fail
    const result = await quotaService.checkQuota('user-3', 501);
    expect(result.allowed).toBe(false);
  });

  it('should allow upload at exact boundary (used + new === max, edge case)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-4',
      max_storage: 1000,
      used_storage: 500
    });

    // 500 + 500 = 1000, not greater than 1000, should pass
    const result = await quotaService.checkQuota('user-4', 500);
    expect(result.allowed).toBe(true);
  });
});

describe('QuotaService - updateQuota', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should update used_storage for an existing user (happy path)', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue({
      user_id: 'user-1',
      max_storage: 5368709120,
      used_storage: 0
    });
    quotaRepo.updateUsedStorage.mockResolvedValue({
      user_id: 'user-1',
      max_storage: 5368709120,
      used_storage: 2048
    });

    const result = await quotaService.updateQuota('user-1', 2048);

    expect(quotaRepo.updateUsedStorage).toHaveBeenCalledWith('user-1', 2048);
    expect(result.used_storage).toBe(2048);
  });

  it('should create quota before updating if user does not exist', async () => {
    quotaRepo.getQuotaByUserId.mockResolvedValue(null);
    quotaRepo.createQuota.mockResolvedValue({ user_id: 'new', max_storage: 5368709120, used_storage: 0 });
    quotaRepo.updateUsedStorage.mockResolvedValue({ user_id: 'new', max_storage: 5368709120, used_storage: 512 });

    const result = await quotaService.updateQuota('new', 512);

    expect(quotaRepo.createQuota).toHaveBeenCalled();
    expect(result.used_storage).toBe(512);
  });
});
