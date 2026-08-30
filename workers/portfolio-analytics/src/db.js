/**
 * D1 write helpers for Phase A analytics.
 *
 * Session semantics:
 * - portfolio_visit: INSERT OR IGNORE (idempotent create). Does not overwrite
 *   an existing session's metadata.
 * - session_end: UPDATE ended_at + active_ms for an existing session only.
 *   No orphan session is created for a lone session_end.
 * - interaction events: INSERT into events. If the session row is missing,
 *   a minimal session stub is INSERT OR IGNORE'd (started_at = event ts) so a
 *   lost/raced portfolio_visit does not drop interactions. Documented Phase A
 *   behaviour — not a full session reconstruction.
 *
 * Never write IP or raw User-Agent.
 */

/**
 * @typedef {{
 *   country: string | null,
 *   browser_family: string,
 *   device_class: string,
 *   received_at: string,
 * }} ServerMeta
 */

/**
 * @param {D1Database} db
 * @param {{
 *   session_id: string,
 *   visitor_id: string,
 *   started_at: string,
 *   referrer_class?: string | null,
 *   referrer_host?: string | null,
 *   landing_path?: string | null,
 *   meta: ServerMeta,
 * }} input
 */
export async function insertSessionIgnore(db, input) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO sessions (
         session_id, visitor_id, started_at, ended_at, active_ms,
         referrer_class, referrer_host, country, device_class, browser_family, landing_path
       ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.session_id,
      input.visitor_id,
      input.started_at,
      input.referrer_class ?? null,
      input.referrer_host ?? null,
      input.meta.country,
      input.meta.device_class,
      input.meta.browser_family,
      input.landing_path ?? null
    )
    .run();
}

/**
 * @param {D1Database} db
 * @param {{ session_id: string, ended_at: string, active_ms: number }} input
 * @returns {Promise<number>} rows changed
 */
export async function updateSessionEnd(db, input) {
  const result = await db
    .prepare(
      `UPDATE sessions
       SET ended_at = ?, active_ms = ?
       WHERE session_id = ?`
    )
    .bind(input.ended_at, input.active_ms, input.session_id)
    .run();
  return Number(result?.meta?.changes ?? 0);
}

/**
 * @param {D1Database} db
 * @param {string} sessionId
 */
export async function sessionExists(db, sessionId) {
  const row = await db
    .prepare(`SELECT 1 AS ok FROM sessions WHERE session_id = ? LIMIT 1`)
    .bind(sessionId)
    .first();
  return Boolean(row);
}

/**
 * @param {D1Database} db
 * @param {{
 *   session_id: string,
 *   visitor_id: string,
 *   ts: string,
 *   name: string,
 *   props: Record<string, unknown>,
 * }} input
 */
export async function insertEvent(db, input) {
  await db
    .prepare(
      `INSERT INTO events (session_id, visitor_id, ts, name, props_json)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      input.session_id,
      input.visitor_id,
      input.ts,
      input.name,
      JSON.stringify(input.props)
    )
    .run();
}

/**
 * Truncate optional referrer host if ever supplied later. Phase A does not
 * accept client referrer_host in the event schema; column reserved/null.
 * @param {unknown} host
 */
export function sanitizeReferrerHost(host) {
  if (typeof host !== "string") return null;
  const trimmed = host.trim().toLowerCase().slice(0, 64);
  if (!trimmed || trimmed.includes("/") || trimmed.includes(" ")) return null;
  return trimmed;
}
