const sessionRepository = require('../repositories/sessionRepository'); // import session repository for database operations
const kafka = require('../kafka/producer'); // import kafka producer for publishing events
const logger = require('../utils/logger'); // import logger for logging
const axios = require('axios'); // import axios for making HTTP requests

const FILE_REGISTRY_URL = process.env.FILE_REGISTRY_URL || 'http://localhost:3007'; // URL of the File Registry service
const CHUNK_CATALOG_URL = process.env.CHUNK_CATALOG_URL || 'http://localhost:3009'; // URL of the Chunk Catalog service
const SESSION_TTL_MINUTES = parseInt(process.env.SESSION_TTL_MINUTES) || 60; // session time to live in minutes

class UploadSessionService { // class for upload session service
  /**
   * Start a new upload session.
   * 1. Register file in File Registry (REST → returns file_id)
   * 2. Create upload_session row tied to that file_id
   * Returns session info to client immediately.
   */
  async startSession({ owner_id, filename, size, mime_type, total_chunks }) {
    // Step 1: Register the file (status=pending) in File Registry
    let file;
    try {
      const response = await axios.post( // making POST request to File Registry service
        `${FILE_REGISTRY_URL}/files`,
        { owner_id, filename, size, mime_type },
        { timeout: 8000 } // setting timeout for the request
      );
      file = response.data?.data; // extracting the file data from the response
      if (!file?.id) throw new Error('Invalid response from File Registry');
    } catch (err) {
      logger.error('File Registry call failed during session start', { error: err.message });
      throw Object.assign(new Error('FILE_REGISTRY_UNAVAILABLE'), {
        code: 'FILE_REGISTRY_UNAVAILABLE',
        statusCode: 503, // 503 Service Unavailable error if File Registry is unavailable
      });
    }

    // Step 2: Compute session expiry
    const expires_at = new Date(
      Date.now() + SESSION_TTL_MINUTES * 60 * 1000  
    ).toISOString(); // calculating the session expiry time

    // Step 3: Create session record
    const session = await sessionRepository.create({
      file_id: file.id, // file id from the File Registry service
      owner_id, // owner id from the request
      filename,
      total_size: size, // total size of the file
      total_chunks: total_chunks || null, // total number of chunks in the file
      expires_at, // session expiry time
    });

    logger.info('Upload session started', {
      session_id: session.id,
      file_id: file.id,
      owner_id,
    });

    return { session, file };
  }

  /**
   * Finish an upload session.
   * Validates session exists and is still active, then:
   * 1. Verifies chunks via Chunk Catalog (REST)
   * 2. Marks session as completed
   * 3. Publishes `upload.completed` to Kafka (triggers 5 parallel consumers)
   * Client gets response immediately — consumers run in background.
   */
  async finishSession(sessionId, { chunk_ids = [] } = {}) { // finish upload session
    // Fetch session
    const session = await sessionRepository.findById(sessionId); // fetch session from the database
    if (!session) { // if session is not found
      throw Object.assign(new Error('Session not found'), { // throw error if session is not found
        code: 'SESSION_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (session.status === 'expired') { // if session is expired
      throw Object.assign(new Error('Upload session has expired'), { // throw error if session is expired
        code: 'SESSION_EXPIRED',
        statusCode: 410, // 410 Gone error if session is expired
      });
    }

    if (session.status === 'completed') { // if session is already completed
      throw Object.assign(new Error('Session already completed'), { // throw error if session is already completed
        code: 'SESSION_ALREADY_COMPLETED',
        statusCode: 409, // 409 Conflict error if session is already completed
      });
    }

    if (session.status !== 'active') { // if session is not in active state
      throw Object.assign(new Error(`Session in invalid state: ${session.status}`), { // throw error if session is not in active state
        code: 'SESSION_INVALID_STATE',
        statusCode: 400, // 400 Bad Request error if session is not in active state
      });
    }

    // Optional: verify chunks via Chunk Catalog
    let chunks = []; // array to store chunks
    if (chunk_ids.length > 0) { // if chunk ids are provided
      chunks = await this._verifyChunks(session.file_id, chunk_ids); // verify chunks
    } else { // if chunk ids are not provided
      chunks = await this._getChunks(session.file_id); // get chunks
    }

    // Mark session complete
    const completed = await sessionRepository.complete(sessionId); // complete session
    if (!completed) { // if session is not completed
      throw Object.assign(new Error('Failed to complete session'), { // throw error if session is not completed
        code: 'SESSION_COMPLETE_FAILED',
        statusCode: 500, // 500 Internal Server Error if session is not completed
      });
    }

    // === HYBRID PATTERN: Respond to client, publish Kafka in background ===
    // We publish AFTER updating the DB but before sending the HTTP response.
    // All 5 downstream consumers react independently:
    //   → Replication Planner (#20)
    //   → Integrity Checker (#24)
    //   → Notification (#28)
    //   → Search Index (#16)
    //   → Access Analytics (#39)
    await kafka.publish(
      'upload.completed', // topic name
      {
        event: 'upload.completed', // upload completed event
        session_id: completed.id, // session id
        file_id: completed.file_id, // file id
        owner_id: completed.owner_id, // owner id
        filename: completed.filename, // filename
        total_size: completed.total_size, // total size
        total_chunks: chunks.length || completed.total_chunks, // total number of chunks
        chunk_ids: chunks.map((c) => c.id), // array of chunk ids
        completed_at: new Date().toISOString(), // session completion time
      },
      completed.file_id // partition key keeps file events ordered
    );

    // Audit event
    await kafka.publish('audit.event', {
      event: 'audit.event',
      actor: completed.owner_id,
      action: 'UPLOAD_COMPLETED',
      entity: completed.file_id,
      entity_type: 'file',
      session_id: completed.id,
    });

    logger.info('Upload completed and events published', {
      session_id: sessionId,
      file_id: completed.file_id,
    });

    return { session: completed, chunks };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    return sessionRepository.findById(sessionId);
  }

  /**
   * Fetch chunks from Chunk Catalog
   */
  async _getChunks(fileId) { // fetch chunks from chunk catalog
    try {
      const response = await axios.get(`${CHUNK_CATALOG_URL}/chunks`, {
        params: { file_id: fileId },
        timeout: 5000, // setting timeout for the request
      });
      return response.data?.data || [];
    } catch (err) {
      logger.warn('Chunk Catalog unavailable (non-fatal)', { error: err.message });
      return [];
    }
  }

  /**
   * Verify specific chunk IDs belong to this file
   */
  async _verifyChunks(fileId, chunkIds) {
    const chunks = await this._getChunks(fileId);
    const found = chunks.filter((c) => chunkIds.includes(c.id));
    return found;
  }

  /**
   * Expire stale sessions (called by Scheduler or cron)
   */
  async expireStale() { // expire stale sessions
    const expired = await sessionRepository.expireStale(); // expire stale sessions
    logger.info(`Expired ${expired.length} stale sessions`); // log the number of expired sessions
    return expired;
  }
}

module.exports = new UploadSessionService();  // exporting the upload session service
