const { getDB } = require('../config/db');

async function saveUrl(urlData) {
  const db = getDB();
  await db('presigned_urls').insert(urlData);
  return urlData;
}

async function getUrlByTokenAndFile(urlStr, fileId) {
  const db = getDB();
  return db('presigned_urls')
    .where('url', urlStr)
    .andWhere('file_id', fileId)
    .first();
}

module.exports = {
  saveUrl,
  getUrlByTokenAndFile
};
