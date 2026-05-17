const db = require('../db');

class FileRepository {
  /**
   * Create a new file record
   */
  async create({ owner_id, filename, size, mime_type = null, status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO files (owner_id, filename, size, mime_type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [owner_id, filename, size, mime_type, status]
    );
    return result.rows[0];
  }

  /**
   * Find a file by ID
   */
  async findById(id) {
    const result = await db.query(
      `SELECT * FROM files WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all files for an owner (excluding deleted)
   */
  async findByOwner(owner_id, { limit = 20, offset = 0 } = {}) {
    const result = await db.query(
      `SELECT * FROM files
       WHERE owner_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [owner_id, limit, offset]
    );
    return result.rows;
  }

  /**
   * Update file status
   */
  async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE files SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Soft-delete a file (mark as deleted, preserve row)
   */
  async softDelete(id) {
    const result = await db.query(
      `UPDATE files SET status = 'deleted' WHERE id = $1 AND status != 'deleted' RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Hard-delete (for testing / GC use only)
   */
  async hardDelete(id) {
    await db.query(`DELETE FROM files WHERE id = $1`, [id]);
  }

  /**
   * Count files per owner
   */
  async countByOwner(owner_id) {
    const result = await db.query(
      `SELECT COUNT(*) AS count FROM files WHERE owner_id = $1 AND status != 'deleted'`,
      [owner_id]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = new FileRepository();
