const knex = require('knex')(require('../db/knexfile'));

const LIMITS_TABLE = 'rate_limits';
const COUNTERS_TABLE = 'rate_counters';

async function getLimit(identity) {
  return knex(LIMITS_TABLE).where({ identity }).first();
}

async function upsertLimit(identity, limit_per_minute) {
  const existing = await getLimit(identity);
  if (existing) {
    const [row] = await knex(LIMITS_TABLE)
      .where({ identity })
      .update({ limit_per_minute, updated_at: knex.fn.now() })
      .returning('*');
    return row;
  }
  const [row] = await knex(LIMITS_TABLE)
    .insert({ identity, limit_per_minute })
    .returning('*');
  return row;
}

async function getCounter(identity, window_start) {
  return knex(COUNTERS_TABLE).where({ identity, window_start }).first();
}

async function incrementCounter(identity, window_start) {
  const existing = await getCounter(identity, window_start);
  if (existing) {
    const [row] = await knex(COUNTERS_TABLE)
      .where({ identity, window_start })
      .increment('count', 1)
      .returning('*');
    return row;
  }
  const [row] = await knex(COUNTERS_TABLE)
    .insert({ identity, window_start, count: 1 })
    .returning('*');
  return row;
}

async function pruneOldWindows(identity, current_window_start) {
  await knex(COUNTERS_TABLE)
    .where('identity', identity)
    .where('window_start', '<', current_window_start)
    .delete();
}

module.exports = { getLimit, upsertLimit, getCounter, incrementCounter, pruneOldWindows };
