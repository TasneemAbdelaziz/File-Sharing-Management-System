const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const keysRepo = require('../repositories/keys.repository');
const kafka = require('../kafka/producer');

function generateRawKey() {
  return `nxs_${crypto.randomBytes(32).toString('hex')}`;
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function createKey({ owner, scopes = [], expires_at = null }) {
  if (!owner) throw Object.assign(new Error('owner is required'), { status: 400 });

  const rawKey = generateRawKey();
  const key_hash = hashKey(rawKey);
  const id = uuidv4();
  const scopes_json = JSON.stringify(scopes);

  const record = await keysRepo.create({ id, owner, key_hash, scopes_json, expires_at });

  await kafka.publish('api_key.created', {
    key_id: id,
    owner,
    scopes,
    created_at: record.created_at,
  });

  return {
    id: record.id,
    owner: record.owner,
    key: rawKey,
    scopes,
    expires_at: record.expires_at,
    created_at: record.created_at,
  };
}

async function verifyKey({ key }) {
  if (!key) throw Object.assign(new Error('key is required'), { status: 400 });

  const key_hash = hashKey(key);
  const record = await keysRepo.findByKeyHash(key_hash);

  if (!record) {
    return { valid: false, reason: 'Key not found' };
  }

  if (record.revoked_at) {
    return { valid: false, reason: 'Key has been revoked' };
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'Key has expired' };
  }

  let scopes = [];
  try {
    scopes = JSON.parse(record.scopes_json);
  } catch (_) {
    scopes = [];
  }

  return {
    valid: true,
    key_id: record.id,
    owner: record.owner,
    scopes,
    expires_at: record.expires_at,
  };
}

async function revokeKey(id) {
  const existing = await keysRepo.findById(id);
  if (!existing) throw Object.assign(new Error('API key not found'), { status: 404 });
  if (existing.revoked_at) throw Object.assign(new Error('Key is already revoked'), { status: 409 });

  const record = await keysRepo.revoke(id);

  await kafka.publish('api_key.revoked', {
    key_id: id,
    owner: record.owner,
    revoked_at: record.revoked_at,
  });

  return {
    id: record.id,
    owner: record.owner,
    revoked_at: record.revoked_at,
  };
}

module.exports = { createKey, verifyKey, revokeKey };
