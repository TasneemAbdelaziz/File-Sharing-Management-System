const knex = require('knex')(require('../db/knexfile'));

const TABLE = 'api_keys';

async function create({ id, owner, key_hash, scopes_json, expires_at }) {
  const [row] = await knex(TABLE)
    .insert({ id, owner, key_hash, scopes_json, expires_at })
    .returning('*');
  return row;
}

async function findByKeyHash(key_hash) {
  return knex(TABLE).where({ key_hash }).first();
}

async function findById(id) {
  return knex(TABLE).where({ id }).first();
}

async function revoke(id) {
  const [row] = await knex(TABLE)
    .where({ id })
    .update({ revoked_at: knex.fn.now() })
    .returning('*');
  return row;
}

async function findByOwner(owner) {
  return knex(TABLE).where({ owner }).orderBy('created_at', 'desc');
}

module.exports = { create, findByKeyHash, findById, revoke, findByOwner };
