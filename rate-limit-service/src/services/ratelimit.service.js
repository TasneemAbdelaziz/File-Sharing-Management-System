const ratelimitRepo = require('../repositories/ratelimit.repository');
const kafka = require('../kafka/producer');

const DEFAULT_LIMIT_PER_MINUTE = 60;

function getCurrentWindowStart() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

async function checkRateLimit({ identity }) {
  if (!identity) throw Object.assign(new Error('identity is required'), { status: 400 });

  const windowStart = getCurrentWindowStart();

  const limitRecord = await ratelimitRepo.getLimit(identity);
  const limitPerMinute = limitRecord ? limitRecord.limit_per_minute : DEFAULT_LIMIT_PER_MINUTE;

  const counter = await ratelimitRepo.incrementCounter(identity, windowStart);
  const currentCount = counter.count;

  await ratelimitRepo.pruneOldWindows(identity, windowStart);

  const allowed = currentCount <= limitPerMinute;
  const remaining = Math.max(0, limitPerMinute - currentCount);

  if (!allowed) {
    await kafka.publish('rate_limit.exceeded', {
      identity,
      limit_per_minute: limitPerMinute,
      current_count: currentCount,
      window_start: windowStart,
      exceeded_at: new Date(),
    });
  }

  return {
    allowed,
    identity,
    limit_per_minute: limitPerMinute,
    current_count: currentCount,
    remaining,
    window_start: windowStart,
  };
}

async function setLimit({ identity, limit_per_minute }) {
  if (!identity) throw Object.assign(new Error('identity is required'), { status: 400 });
  if (!limit_per_minute || limit_per_minute < 1) {
    throw Object.assign(new Error('limit_per_minute must be a positive integer'), { status: 400 });
  }
  return ratelimitRepo.upsertLimit(identity, limit_per_minute);
}

module.exports = { checkRateLimit, setLimit };
