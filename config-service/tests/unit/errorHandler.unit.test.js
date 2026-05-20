import { jest } from '@jest/globals';

const { errorHandler } = await import('../../src/middleware/errorHandler.js');

describe('Error Handler Middleware', () => {
  test('returns standard error JSON format', () => {
    const req = { requestId: 'test-id' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const err = new Error('Test failure');

    errorHandler(err, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR', message: 'Test failure' }),
      meta: expect.objectContaining({ request_id: 'test-id' })
    }));
  });
});
