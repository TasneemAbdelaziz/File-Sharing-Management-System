/**
 * Upload Session — Integration Tests
 *
 * Mocks DB, Kafka, and downstream REST calls (File Registry, Chunk Catalog)
 * so tests run fully in-process without infrastructure.
 */

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
const axios = require('axios');

const app = createApp();

// ── Fixtures ────────────────────────────────────────────────────────────────

const SESSION_ID = '660e8400-e29b-41d4-a716-446655440000';
const FILE_ID = '550e8400-e29b-41d4-a716-446655440000';
const OWNER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const EXPIRES = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const mockSession = {
  id: SESSION_ID,
  file_id: FILE_ID,
  owner_id: OWNER_ID,
  filename: 'video.mp4',
  total_size: 1073741824,
  total_chunks: 1024,
  status: 'active',
  expires_at: EXPIRES,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockFile = {
  id: FILE_ID,
  owner_id: OWNER_ID,
  filename: 'video.mp4',
  size: 1073741824,
  status: 'pending',
};

// ── Health & Readiness ─────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('upload-session');
  });
});

describe('GET /ready', () => {
  it('returns 200 when DB is connected', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
  });

  it('returns 503 when DB is down', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
  });
});

// ── POST /uploads/start ──────────────────────────────────────────────────────

describe('POST /uploads/start', () => {
  const validPayload = {
    owner_id: OWNER_ID,
    filename: 'video.mp4',
    size: 1073741824,
    total_chunks: 1024,
  };

  beforeEach(() => {
    // File Registry call returns a file
    axios.post.mockResolvedValue({ data: { data: mockFile } });
    // DB insert returns a session
    db.query.mockResolvedValue({ rows: [mockSession], rowCount: 1 });
  });

  it('starts session and returns 201 with session_id and file_id', async () => {
    const res = await request(app).post('/uploads/start').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('session_id');
    expect(res.body.data).toHaveProperty('file_id');
    expect(res.body.data.status).toBe('active');
  });

  it('returns 400 when owner_id is missing', async () => {
    const res = await request(app)
      .post('/uploads/start')
      .send({ filename: 'test.txt', size: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when filename is empty', async () => {
    const res = await request(app)
      .post('/uploads/start')
      .send({ ...validPayload, filename: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when size is negative', async () => {
    const res = await request(app)
      .post('/uploads/start')
      .send({ ...validPayload, size: -500 });
    expect(res.status).toBe(400);
  });

  it('returns 503 when File Registry is unavailable', async () => {
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).post('/uploads/start').send(validPayload);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('FILE_REGISTRY_UNAVAILABLE');
  });
});

// ── POST /uploads/:id/finish ─────────────────────────────────────────────────

describe('POST /uploads/:id/finish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Chunk Catalog returns empty (non-fatal)
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  it('completes session and publishes upload.completed to Kafka', async () => {
    // findById → active session
    db.query.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });
    // complete → completed session
    db.query.mockResolvedValueOnce({
      rows: [{ ...mockSession, status: 'completed' }],
      rowCount: 1,
    });

    const res = await request(app)
      .post(`/uploads/${SESSION_ID}/finish`)
      .send({ chunk_ids: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.message).toMatch(/background/i);

    // Verify upload.completed was published
    expect(kafka.publish).toHaveBeenCalledWith(
      'upload.completed',
      expect.objectContaining({
        event: 'upload.completed',
        session_id: SESSION_ID,
        file_id: FILE_ID,
        owner_id: OWNER_ID,
      }),
      FILE_ID
    );
  });

  it('publishes audit.event on finish', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...mockSession, status: 'completed' }], rowCount: 1 });

    await request(app).post(`/uploads/${SESSION_ID}/finish`).send({});

    expect(kafka.publish).toHaveBeenCalledWith(
      'audit.event',
      expect.objectContaining({ action: 'UPLOAD_COMPLETED' })
    );
  });

  it('returns 404 when session does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).post(`/uploads/${SESSION_ID}/finish`).send({});
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('returns 410 when session is expired', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ ...mockSession, status: 'expired' }],
      rowCount: 1,
    });
    const res = await request(app).post(`/uploads/${SESSION_ID}/finish`).send({});
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('returns 409 when session is already completed', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ ...mockSession, status: 'completed' }],
      rowCount: 1,
    });
    const res = await request(app).post(`/uploads/${SESSION_ID}/finish`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SESSION_ALREADY_COMPLETED');
  });

  it('returns 400 for invalid session UUID', async () => {
    const res = await request(app).post('/uploads/not-a-uuid/finish').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

// ── GET /uploads/:id ─────────────────────────────────────────────────────────

describe('GET /uploads/:id', () => {
  it('returns session data for valid ID', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });
    const res = await request(app).get(`/uploads/${SESSION_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(SESSION_ID);
  });

  it('returns 404 when session not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get(`/uploads/${SESSION_ID}`);
    expect(res.status).toBe(404);
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 with standard error format', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
