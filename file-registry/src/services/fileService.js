const fileRepository = require('../repositories/fileRepository');
const kafka = require('../kafka/producer');
const logger = require('../utils/logger');
const axios = require('axios');

const CHUNK_CATALOG_URL = process.env.CHUNK_CATALOG_URL || 'http://localhost:3009';
const VERSIONING_URL = process.env.VERSIONING_URL || 'http://localhost:3013';

class FileService {
  /**
   * Register a new file in the registry.
   * Called by Upload Session once all chunks arrive.
   * status starts as 'pending' until upload is confirmed.
   */
  async createFile({ owner_id, filename, size, mime_type }) {
    const file = await fileRepository.create({
      owner_id,
      filename,
      size,
      mime_type,
      status: 'pending',
    });

    logger.info('File registered', { file_id: file.id, owner_id });

    // Create initial version via Versioning Service (fire-and-forget REST)
    this._createVersionAsync(file.id).catch((err) =>
      logger.warn('Versioning call failed (non-fatal)', { error: err.message })
    );

    return file;
  }

  /**
   * Retrieve a file's metadata by ID.
   * Only returns non-deleted files.
   */
  async getFile(id) {
    const file = await fileRepository.findById(id);
    if (!file || file.status === 'deleted') return null;
    return file;
  }

  /**
   * Transition a file from pending → active.
   * Called internally by Upload Session after upload.completed event.
   */
  async activateFile(id) {
    const file = await fileRepository.updateStatus(id, 'active');
    if (!file) return null;
    logger.info('File activated', { file_id: id });
    return file;
  }

  /**
   * Soft-delete a file.
   * Publishes `file.deleted` to Kafka for Garbage Collector & Search Index.
   */
  async deleteFile(id) {
    const existing = await fileRepository.findById(id);
    if (!existing || existing.status === 'deleted') return null;

    const deleted = await fileRepository.softDelete(id);
    if (!deleted) return null;

    // Hybrid REST + Kafka: respond to client, then publish event
    await kafka.publish(
      'file.deleted',
      {
        event: 'file.deleted',
        file_id: deleted.id,
        owner_id: deleted.owner_id,
        filename: deleted.filename,
        size: deleted.size,
      },
      deleted.id // use file_id as partition key for ordering
    );

    // Also fire audit event
    await kafka.publish('audit.event', {
      event: 'audit.event',
      actor: deleted.owner_id,
      action: 'FILE_DELETED',
      entity: deleted.id,
      entity_type: 'file',
    });

    logger.info('File deleted and events published', { file_id: id });
    return deleted;
  }

  /**
   * Get chunks associated with a file via Chunk Catalog (REST integration)
   */
  async getFileChunks(fileId) {
    try {
      const response = await axios.get(`${CHUNK_CATALOG_URL}/chunks`, {
        params: { file_id: fileId },
        timeout: 5000,
      });
      return response.data?.data || [];
    } catch (err) {
      logger.warn('Chunk Catalog unavailable', { error: err.message });
      return [];
    }
  }

  /**
   * Fire-and-forget: create initial version for newly registered file
   */
  async _createVersionAsync(fileId) {
    await axios.post(
      `${VERSIONING_URL}/versions`,
      { file_id: fileId, version_no: 1 },
      { timeout: 5000 }
    );
    logger.info('Initial version created', { file_id: fileId });
  }
}

module.exports = new FileService();
