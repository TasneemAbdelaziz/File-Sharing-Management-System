const quotaService = require('../services/quota.service');
const crypto = require('crypto');

function buildResponse(success, dataOrError, req) {
  const meta = {
    service: 'file-quota',
    request_id: req.headers['x-request-id'] || crypto.randomUUID()
  };
  if (success) {
    return { success: true, data: dataOrError, meta };
  } else {
    return { success: false, error: dataOrError, meta };
  }
}

async function getQuota(req, res) {
  try {
    const { user_id } = req.params;
    const quota = await quotaService.getQuota(user_id);
    if (!quota) {
      return res.status(404).json(buildResponse(false, {
        code: 'NOT_FOUND',
        message: 'Quota not found for user',
        details: {}
      }, req));
    }
    return res.status(200).json(buildResponse(true, quota, req));
  } catch (error) {
    console.error('Error getting quota:', error);
    return res.status(500).json(buildResponse(false, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: { error: error.message }
    }, req));
  }
}

async function checkQuota(req, res) {
  try {
    const { user_id, new_file_size } = req.body;
    
    if (!user_id || !new_file_size) {
      return res.status(400).json(buildResponse(false, {
        code: 'BAD_REQUEST',
        message: 'user_id and new_file_size are required',
        details: {}
      }, req));
    }

    const result = await quotaService.checkQuota(user_id, new_file_size);
    
    if (!result.allowed) {
      return res.status(403).json(buildResponse(false, {
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        details: { current_used: result.current_used, max_storage: result.max_storage }
      }, req));
    }

    return res.status(200).json(buildResponse(true, {
      message: 'Quota check passed',
      current_used: result.current_used, 
      max_storage: result.max_storage 
    }, req));

  } catch (error) {
    console.error('Error checking quota:', error);
    return res.status(500).json(buildResponse(false, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: { error: error.message }
    }, req));
  }
}

async function updateQuota(req, res) {
  try {
    const { user_id, used_storage } = req.body;
    if (!user_id || used_storage === undefined) {
      return res.status(400).json(buildResponse(false, {
        code: 'BAD_REQUEST',
        message: 'user_id and used_storage are required',
        details: {}
      }, req));
    }
    
    const result = await quotaService.updateQuota(user_id, used_storage);
    return res.status(200).json(buildResponse(true, result, req));
  } catch (error) {
    console.error('Error updating quota:', error);
    return res.status(500).json(buildResponse(false, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: { error: error.message }
    }, req));
  }
}

module.exports = {
  getQuota,
  checkQuota,
  updateQuota
};
