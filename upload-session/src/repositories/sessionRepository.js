const db = require('../db');

class SessionRepository {
  /**
   * Create a new upload session
   */
  async create({ file_id, owner_id, filename, total_size, total_chunks, expires_at }) { // Inserts a new session record into the database
    const result = await db.query( // Execute INSERT query
      `INSERT INTO upload_sessions
         (file_id, owner_id, filename, total_size, total_chunks, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING *`, // Return the inserted row
      [file_id, owner_id, filename, total_size, total_chunks, expires_at] // Bind parameters
    );
    return result.rows[0]; // Return the first (and only) row
  }

  /**
   * Find a session by ID
   */
  async findById(id) {
    const result = await db.query(
      `SELECT * FROM upload_sessions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Mark session as completed
   */
  async complete(id) { // Updates a session's status to 'completed'
    const result = await db.query( // Execute UPDATE query
      `UPDATE upload_sessions
       SET status = 'completed'
       WHERE id = $1 AND status = 'active'
       RETURNING *`, // Ensure it only updates if currently 'active', and return the updated row
      [id]
    );
    return result.rows[0] || null; // Return updated row or null if not found/not active
  }

  /**
   * Mark session as failed
   */
  async fail(id) {
    const result = await db.query(
      `UPDATE upload_sessions SET status = 'failed' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Expire sessions past their expiry time
   */
  async expireStale() {
    const result = await db.query(
      `UPDATE upload_sessions
       SET status = 'expired'
       WHERE status = 'active' AND expires_at < NOW()
       RETURNING id`,
      []
    );
    return result.rows;
  }

  /**
   * List sessions by owner
   */
  async findByOwner(owner_id) {
    const result = await db.query(
      `SELECT * FROM upload_sessions WHERE owner_id = $1 ORDER BY created_at DESC`,
      [owner_id]
    );
    return result.rows;
  }

  /**
   * Hard-delete (for testing)
   */
  async hardDelete(id) {
    await db.query(`DELETE FROM upload_sessions WHERE id = $1`, [id]);
  }
}

module.exports = new SessionRepository();
