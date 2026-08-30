/**
 * Global protective ceilings via D1 (no IP storage).
 * Per-IP limiting is intentionally deferred (see README).
 */

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parseCeiling(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * @param {{ ANALYTICS_MAX_REQUESTS_PER_DAY?: string, ANALYTICS_MAX_EVENT_WRITES_PER_DAY?: string }} env
 */
export function readQuotaConfig(env) {
  return {
    maxRequestsPerDay: parseCeiling(env.ANALYTICS_MAX_REQUESTS_PER_DAY, 5000),
    maxEventWritesPerDay: parseCeiling(
      env.ANALYTICS_MAX_EVENT_WRITES_PER_DAY,
      20000
    ),
  };
}

/**
 * @param {string} [iso]
 */
export function utcDayKey(iso = new Date().toISOString()) {
  return iso.slice(0, 10);
}

/**
 * Atomically check + increment request counter. Returns false if over ceiling.
 * maxRequestsPerDay === 0 disables the request ceiling.
 *
 * @param {D1Database} db
 * @param {number} maxRequestsPerDay
 * @param {string} day
 * @returns {Promise<{ allowed: boolean }>}
 */
export async function consumeRequestQuota(db, maxRequestsPerDay, day) {
  if (maxRequestsPerDay === 0) return { allowed: true };

  await db
    .prepare(
      `INSERT INTO ingest_counters (day, requests, event_writes)
       VALUES (?, 0, 0)
       ON CONFLICT(day) DO NOTHING`
    )
    .bind(day)
    .run();

  const row = await db
    .prepare(`SELECT requests FROM ingest_counters WHERE day = ?`)
    .bind(day)
    .first();

  const current = Number(row?.requests ?? 0);
  if (current >= maxRequestsPerDay) {
    return { allowed: false };
  }

  await db
    .prepare(
      `UPDATE ingest_counters SET requests = requests + 1 WHERE day = ?`
    )
    .bind(day)
    .run();

  return { allowed: true };
}

/**
 * @param {D1Database} db
 * @param {number} maxEventWritesPerDay
 * @param {string} day
 * @param {number} writeCount
 * @returns {Promise<{ allowed: boolean }>}
 */
export async function consumeEventWriteQuota(
  db,
  maxEventWritesPerDay,
  day,
  writeCount
) {
  if (maxEventWritesPerDay === 0) return { allowed: true };
  if (writeCount <= 0) return { allowed: true };

  await db
    .prepare(
      `INSERT INTO ingest_counters (day, requests, event_writes)
       VALUES (?, 0, 0)
       ON CONFLICT(day) DO NOTHING`
    )
    .bind(day)
    .run();

  const row = await db
    .prepare(`SELECT event_writes FROM ingest_counters WHERE day = ?`)
    .bind(day)
    .first();

  const current = Number(row?.event_writes ?? 0);
  if (current + writeCount > maxEventWritesPerDay) {
    return { allowed: false };
  }

  await db
    .prepare(
      `UPDATE ingest_counters SET event_writes = event_writes + ? WHERE day = ?`
    )
    .bind(writeCount, day)
    .run();

  return { allowed: true };
}
