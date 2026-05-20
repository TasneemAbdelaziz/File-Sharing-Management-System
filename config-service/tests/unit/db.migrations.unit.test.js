import { jest } from '@jest/globals';

const poolMock = {
  query: jest.fn().mockResolvedValue(undefined)
};

jest.unstable_mockModule('../../src/db/pool.js', () => ({ default: poolMock }));

const { ensureMigrations } = await import('../../src/db/migrations.js');

describe('DB Migrations', () => {
  test('ensureMigrations runs create table and index queries', async () => {
    await ensureMigrations();
    expect(poolMock.query).toHaveBeenCalledTimes(2);
    expect(poolMock.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS configs')); 
    expect(poolMock.query).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_configs_service'));
  });
});
