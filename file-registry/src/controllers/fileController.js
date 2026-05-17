const Joi = require('joi');
const fileService = require('../services/fileService');
const response = require('../utils/response');
const logger = require('../utils/logger');

// ── Validation schemas ──────────────────────────────────────────────────────

const createFileSchema = Joi.object({
  owner_id: Joi.string().uuid().required(),
  filename: Joi.string().min(1).max(512).required(),
  size: Joi.number().integer().min(0).required(),
  mime_type: Joi.string().max(255).optional(),
});

// ── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /files
 * Register a new file (called by Upload Session or directly)
 */
const createFile = async (req, res) => {
  const { error: valErr, value } = createFileSchema.validate(req.body, { abortEarly: false });
  if (valErr) {
    return res.status(400).json(
      response.error('VALIDATION_ERROR', 'Invalid request body', {
        details: valErr.details.map((d) => d.message),
      })
    );
  }

  const file = await fileService.createFile(value);
  return res.status(201).json(response.success(file));
};

/**
 * GET /files/:id
 * Fetch file metadata by ID
 */
const getFile = async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json(response.error('INVALID_ID', 'File ID must be a valid UUID'));
  }

  const file = await fileService.getFile(id);
  if (!file) {
    return res.status(404).json(response.error('FILE_NOT_FOUND', `File ${id} not found`));
  }

  return res.status(200).json(response.success(file));
};

/**
 * DELETE /files/:id
 * Soft-delete a file and publish file.deleted event
 */
const deleteFile = async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json(response.error('INVALID_ID', 'File ID must be a valid UUID'));
  }

  const deleted = await fileService.deleteFile(id);
  if (!deleted) {
    return res.status(404).json(
      response.error('FILE_NOT_FOUND', `File ${id} not found or already deleted`)
    );
  }

  return res.status(200).json(
    response.success({ deleted: true, file_id: deleted.id }, { message: 'File deleted' })
  );
};

/**
 * PATCH /files/:id/activate (internal — called by Upload Session after completion)
 */
const activateFile = async (req, res) => {
  const { id } = req.params;
  const file = await fileService.activateFile(id);
  if (!file) {
    return res.status(404).json(response.error('FILE_NOT_FOUND', 'File not found'));
  }
  return res.status(200).json(response.success(file));
};

module.exports = { createFile, getFile, deleteFile, activateFile };
