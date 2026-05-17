const urlService = require('../services/url.service');
const crypto = require('crypto');

function buildResponse(success, dataOrError, req) {
  const meta = {
    service: 'presigned-url',
    request_id: req.headers['x-request-id'] || crypto.randomUUID()
  };
  if (success) {
    return { success: true, data: dataOrError, meta };
  } else {
    return { success: false, error: dataOrError, meta };
  }
}

async function generateUploadUrl(req, res) {
  try {
    const { file_id, user_id } = req.body;
    
    if (!file_id || !user_id) {
      return res.status(400).json(buildResponse(false, {
        code: 'BAD_REQUEST',
        message: 'file_id and user_id are required',
        details: {}
      }, req));
    }

    const { url, expires_at } = await urlService.createPresignedUrl(file_id, user_id, 'upload');

    return res.status(200).json(buildResponse(true, {
      message: 'Presigned upload URL generated successfully',
      file_id,
      url,
      expires_at
    }, req));

  } catch (error) {
    console.error('Error generating pre-signed upload URL:', error);
    return res.status(500).json(buildResponse(false, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: { error: error.message }
    }, req));
  }
}

async function generateDownloadUrl(req, res) {
  try {
    const { file_id, user_id } = req.body;
    
    if (!file_id || !user_id) {
      return res.status(400).json(buildResponse(false, {
        code: 'BAD_REQUEST',
        message: 'file_id and user_id are required',
        details: {}
      }, req));
    }

    const { url, expires_at } = await urlService.createPresignedUrl(file_id, user_id, 'download');

    return res.status(200).json(buildResponse(true, {
      message: 'Presigned download URL generated successfully',
      file_id,
      url,
      expires_at
    }, req));

  } catch (error) {
    console.error('Error generating pre-signed download URL:', error);
    return res.status(500).json(buildResponse(false, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: { error: error.message }
    }, req));
  }
}

module.exports = {
  generateUploadUrl,
  generateDownloadUrl
};
