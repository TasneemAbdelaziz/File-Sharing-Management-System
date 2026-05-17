const crypto = require('crypto');
const urlRepo = require('../repositories/url.repository');

async function createPresignedUrl(fileId, userId, action) {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Storage Gateway endpoint (simulated)
  const baseUrl = process.env.STORAGE_GATEWAY_URL || 'http://storage-gateway:9000';
  const signedUrl = `${baseUrl}/${action}/${fileId}?token=${token}`;
  
  // Expiration in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Store in DB
  const recordId = crypto.randomUUID();
  await urlRepo.saveUrl({
    id: recordId,
    file_id: fileId,
    url: signedUrl,
    expires_at: expiresAt
  });

  return { url: signedUrl, expires_at: expiresAt };
}

module.exports = {
  createPresignedUrl
};
