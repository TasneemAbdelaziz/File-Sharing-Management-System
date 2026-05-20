import { jest } from '@jest/globals';

const { default: pool } = await import('../../src/db/pool.js');

describe('Database Pool', () => {
  test('Pool is exported and has query function', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
  });
});
