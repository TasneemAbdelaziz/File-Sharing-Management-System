const quotaRepo = require('../repositories/quota.repository');
const { publishQuotaExceeded } = require('../config/kafka');

async function getQuota(userId) {

  //database query wrapped in a function call. It asks the "Quota Repository" to
  //look into the database and find the specific quota record associated with a 
  //given userId
  let quota = await quotaRepo.getQuotaByUserId(userId);

  // If no quota is found for the user (maybe it's their first time), it creates a
  // new quota record for them with a default storage limit of 5 Gigabytes 
  //(5368709120 bytes)
  if (!quota) {
    quota = await quotaRepo.createQuota(userId, 5368709120); // 5GB default
  }
  return quota;
}

async function checkQuota(userId, newFileSize) {
  const quota = await getQuota(userId);
  const projectedUsage = Number(quota.used_storage) + Number(newFileSize);

  if (projectedUsage > Number(quota.max_storage)) {
    // Publish to Kafka: quota.exceeded
    await publishQuotaExceeded(userId, quota.used_storage, quota.max_storage, newFileSize);
    
    return {
      allowed: false,
      current_used: quota.used_storage,
      max_storage: quota.max_storage
    };
  }

  return {
    allowed: true,
    current_used: quota.used_storage,
    max_storage: quota.max_storage
  };
}

async function updateQuota(userId, usedStorage) {
  let quota = await quotaRepo.getQuotaByUserId(userId);
  if (!quota) {
    quota = await quotaRepo.createQuota(userId, 5368709120);
  }
  
  const updatedQuota = await quotaRepo.updateUsedStorage(userId, usedStorage);
  return {
    user_id: userId,
    used_storage: updatedQuota.used_storage,
    max_storage: updatedQuota.max_storage
  };
}

module.exports = {
  getQuota,
  checkQuota,
  updateQuota
};
