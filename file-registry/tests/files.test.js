/**
 * File Registry — Integration Tests
 *
 * These tests mock the DB and Kafka layers so they run without
 * real infrastructure. For full integration tests, use a test DB.
 */

// Mock dependencies before requiring app
jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() },
}));

jest.mock('../src/kafka/producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('axios');

const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');
const kafka = require('../src/kafka/producer');

const app = createApp();

// ── Helpers ────────────────────────────────────────────────────────────────

const mockFile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  filename: 'report.pdf',
  size: 204800,
  mime_type: 'application/pdf',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Health & Readiness ─────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.service).toBe('file-registry');
  });
});

describe('GET /ready', () => {
  it('returns 200 when DB is connected', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ready');
  });

  it('returns 503 when DB is down', async () => {
    db.query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('not ready');
  });
});

// ── POST /files ─────────────────────────────────────────────────────────────

describe('POST /files', () => {
  const validPayload = {
    owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    filename: 'document.pdf',
    size: 102400,
    mime_type: 'application/pdf',
  };

  beforeEach(() => {
    db.query.mockResolvedValue({ rows: [{ ...mockFile, status: 'pending' }], rowCount: 1 });
  });

  it('creates a file and returns 201', async () => {
    const res = await request(app).post('/files').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.meta.service).toBe('file-registry');
  });

  it('returns 400 when owner_id is missing', async () => {
    const res = await request(app)
      .post('/files')
      .send({ filename: 'test.txt', size: 1024 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when size is negative', async () => {
    const res = await request(app)
      .post('/files')
      .send({ ...validPayload, size: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when filename is empty', async () => {
    const res = await request(app)
      .post('/files')
      .send({ ...validPayload, filename: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when owner_id is not a UUID', async () => {
    const res = await request(app)
      .post('/files')
      .send({ ...validPayload, owner_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

// ── GET /files/:id ──────────────────────────────────────────────────────────

describe('GET /files/:id', () => {
  it('returns 200 with file data for valid UUID', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockFile], rowCount: 1 });
    const res = await request(app).get(`/files/${mockFile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(mockFile.id);
  });

  it('returns 404 when file does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get(`/files/${mockFile.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('returns 404 when file is deleted', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...mockFile, status: 'deleted' }], rowCount: 1 });
    const res = await request(app).get(`/files/${mockFile.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await request(app).get('/files/not-a-valid-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

// ── DELETE /files/:id ───────────────────────────────────────────────────────

describe('DELETE /files/:id', () => {
  it('soft-deletes a file and publishes file.deleted event', async () => {
    // findById → existing file
    db.query.mockResolvedValueOnce({ rows: [mockFile], rowCount: 1 });
    // softDelete → deleted row
    db.query.mockResolvedValueOnce({
      rows: [{ ...mockFile, status: 'deleted' }],
      rowCount: 1,
    });

    const res = await request(app).delete(`/files/${mockFile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    // Verify Kafka was called with file.deleted
    expect(kafka.publish).toHaveBeenCalledWith(
      'file.deleted',
      expect.objectContaining({ event: 'file.deleted', file_id: mockFile.id }),
      mockFile.id
    );
  });

  it('publishes audit.event on delete', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [mockFile], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...mockFile, status: 'deleted' }], rowCount: 1 });

    await request(app).delete(`/files/${mockFile.id}`);

    expect(kafka.publish).toHaveBeenCalledWith(
      'audit.event',
      expect.objectContaining({ action: 'FILE_DELETED' })
    );
  });

  it('returns 404 when file does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).delete(`/files/${mockFile.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app).delete('/files/bad-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

// ── 404 catch-all ───────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 for unregistered routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
