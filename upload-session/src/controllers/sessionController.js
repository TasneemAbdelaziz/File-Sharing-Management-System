const Joi = require('joi');
const sessionService = require('../services/sessionService');
const response = require('../utils/response');
const logger = require('../utils/logger');

// ── Validation schemas ──────────────────────────────────────────────────────

const startSessionSchema = Joi.object({ // Schema to validate start session request payload
  owner_id: Joi.string().uuid().required(), // Ensure owner_id is a valid UUID and required
  filename: Joi.string().min(1).max(512).required(), // Ensure filename is a non-empty string and required
  size: Joi.number().integer().min(0).required(), // Ensure size is a non-negative integer and required
  mime_type: Joi.string().max(255).optional(), // Optional MIME type field
  total_chunks: Joi.number().integer().min(1).optional(), // Optional total chunks field
});

const finishSessionSchema = Joi.object({
  chunk_ids: Joi.array().items(Joi.string().uuid()).optional().default([]),
});

// ── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /uploads/start
 * Begin a new upload session — register file in File Registry, return session ID
 */
const startSession = async (req, res) => { // Handler to start an upload session
  const { error: valErr, value } = startSessionSchema.validate(req.body, { abortEarly: false }); // Validate request body against schema
  if (valErr) { // If validation fails, return 400 Bad Request
    return res.status(400).json(
      response.error('VALIDATION_ERROR', 'Invalid request body', {
        details: valErr.details.map((d) => d.message), // Extract specific validation errors
      })
    );
  }

  try {
    const { session, file } = await sessionService.startSession(value); // Call service to start session and register file
    return res.status(201).json( // Return 201 Created on success
      response.success({
        session_id: session.id, // ID of the newly created session
        file_id: file.id, // ID of the file registered in File Registry
        status: session.status, // Current status of the session
        expires_at: session.expires_at, // Expiration timestamp
      })
    );
  } catch (err) { // Handle errors
    if (err.code === 'FILE_REGISTRY_UNAVAILABLE') { // Specific handling if File Registry is down
      return res.status(503).json( // Return 503 Service Unavailable
        response.error(err.code, 'File Registry is currently unavailable. Try again.')
      );
    }
    throw err; // Re-throw unexpected errors to global error handler
  }
};

/**
 * POST /uploads/:id/finish
 * Complete the upload session — validates state, publishes upload.completed
 * Client receives response immediately; 5 consumers process in background.
 */
const finishSession = async (req, res) => { // Handler to complete an upload session
  const { id } = req.params; // Extract session ID from URL

  if (!id.match(/^[0-9a-f-]{36}$/i)) { // Basic UUID format check
    return res.status(400).json(response.error('INVALID_ID', 'Session ID must be a valid UUID'));
  }

  const { error: valErr, value } = finishSessionSchema.validate(req.body, { abortEarly: false }); // Validate request body
  if (valErr) { // If validation fails, return 400 Bad Request
    return res.status(400).json(
      response.error('VALIDATION_ERROR', 'Invalid request body', {
        details: valErr.details.map((d) => d.message), // Map validation errors
      })
    );
  }

  try {
    const result = await sessionService.finishSession(id, value); // Call service to finish session
    return res.status(200).json( // Return 200 OK on success
      response.success({
        session_id: result.session.id, // Completed session ID
        file_id: result.session.file_id, // Associated file ID
        status: result.session.status, // Final status
        chunks_recorded: result.chunks.length, // Number of chunks processed
        message: 'Upload completed. Processing started in background.', // Informative message
      })
    );
  } catch (err) { // Map specific service errors to appropriate HTTP status codes
    const statusMap = {
      SESSION_NOT_FOUND: 404, // Not Found
      SESSION_EXPIRED: 410, // Gone
      SESSION_ALREADY_COMPLETED: 409, // Conflict
      SESSION_INVALID_STATE: 400, // Bad Request
      SESSION_COMPLETE_FAILED: 500, // Internal Server Error
    };
    const status = statusMap[err.code] || 500; // Default to 500 if unknown error code
    return res.status(status).json(
      response.error(err.code || 'INTERNAL_ERROR', err.message)
    );
  }
};

/**
 * GET /uploads/:id
 * Retrieve session details
 */
const getSession = async (req, res) => { // Handler to retrieve session details
  const { id } = req.params; // Extract session ID from URL
  const session = await sessionService.getSession(id); // Query service for session
  if (!session) { // If not found, return 404
    return res.status(404).json(response.error('SESSION_NOT_FOUND', 'Session not found'));
  }
  return res.status(200).json(response.success(session)); // Return session details on success
};

module.exports = { startSession, finishSession, getSession };
