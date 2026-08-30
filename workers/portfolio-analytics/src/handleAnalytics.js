import { MAX_BODY_BYTES } from "./constants.js";
import {
  insertEvent,
  insertSessionIgnore,
  sessionExists,
  updateSessionEnd,
} from "./db.js";
import { deriveServerMetadata } from "./metadata.js";
import {
  consumeEventWriteQuota,
  consumeRequestQuota,
  readQuotaConfig,
  utcDayKey,
} from "./quota.js";
import { validateAnalyticsBody } from "./validate.js";

/**
 * @typedef {{
 *   DB: D1Database,
 *   ANALYTICS_ENABLED?: string,
 *   ANALYTICS_MAX_REQUESTS_PER_DAY?: string,
 *   ANALYTICS_MAX_EVENT_WRITES_PER_DAY?: string,
 * }} AnalyticsEnv
 */

/**
 * @param {unknown} value
 */
export function isAnalyticsEnabled(value) {
  if (value === undefined || value === null || value === "") return true;
  const normalized = String(value).trim().toLowerCase();
  return !(
    normalized === "0" ||
    normalized === "false" ||
    normalized === "off" ||
    normalized === "no"
  );
}

/**
 * Accept only application/json and text/plain (optional charset params).
 * text/plain is required so cross-origin unload beacons remain CORS-simple.
 * @param {string} contentType
 */
export function isAllowedAnalyticsContentType(contentType) {
  const mediaType = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return mediaType === "application/json" || mediaType === "text/plain";
}

/**
 * @param {number} status
 * @param {HeadersInit} [headers]
 * @param {BodyInit | null} [body]
 */
function jsonError(status, headers, body) {
  return new Response(body ?? null, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/**
 * Process POST /analytics. Pure of CORS header assembly (caller adds CORS).
 *
 * @param {Request} request
 * @param {AnalyticsEnv} env
 * @param {{ headers?: HeadersInit }} [opts]
 * @returns {Promise<Response>}
 */
export async function handleAnalyticsPost(request, env, opts = {}) {
  const baseHeaders = opts.headers ?? {};

  if (!isAnalyticsEnabled(env.ANALYTICS_ENABLED)) {
    // Harmless success-style response so future clients can no-op quietly.
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  if (!env.DB) {
    return jsonError(503, baseHeaders, '{"error":"unavailable"}');
  }

  const contentType = request.headers.get("content-type") || "";
  if (!isAllowedAnalyticsContentType(contentType)) {
    return jsonError(415, baseHeaders, '{"error":"unsupported_media_type"}');
  }

  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) {
    return jsonError(413, baseHeaders, '{"error":"payload_too_large"}');
  }

  let parsed;
  try {
    const text = new TextDecoder("utf-8").decode(raw);
    parsed = JSON.parse(text);
  } catch {
    return jsonError(400, baseHeaders, '{"error":"malformed_json"}');
  }

  const validated = validateAnalyticsBody(parsed);
  if (!validated.ok) {
    return jsonError(
      validated.httpStatus,
      baseHeaders,
      JSON.stringify({ error: validated.error.code })
    );
  }

  const quota = readQuotaConfig(env);
  const day = utcDayKey();

  try {
    const requestQuota = await consumeRequestQuota(
      env.DB,
      quota.maxRequestsPerDay,
      day
    );
    if (!requestQuota.allowed) {
      return jsonError(429, baseHeaders, '{"error":"quota_exceeded"}');
    }

    // Charge event-write quota for interaction rows we intend to insert.
    const plannedEventWrites = validated.value.events.length;
    const writeQuota = await consumeEventWriteQuota(
      env.DB,
      quota.maxEventWritesPerDay,
      day,
      plannedEventWrites
    );
    if (!writeQuota.allowed) {
      return jsonError(429, baseHeaders, '{"error":"quota_exceeded"}');
    }

    const meta = deriveServerMetadata(request);
    const { visitor_id, session_id, events } = validated.value;

    for (const event of events) {
      if (event.name === "portfolio_visit") {
        await insertSessionIgnore(env.DB, {
          session_id,
          visitor_id,
          started_at: event.ts,
          referrer_class:
            typeof event.props.referrer_class === "string"
              ? event.props.referrer_class
              : null,
          referrer_host: null,
          landing_path:
            typeof event.props.landing_path === "string"
              ? event.props.landing_path
              : null,
          meta,
        });
        await insertEvent(env.DB, {
          session_id,
          visitor_id,
          ts: event.ts,
          name: event.name,
          props: event.props,
        });
        continue;
      }

      if (event.name === "session_end") {
        const activeMs =
          typeof event.props.active_ms === "number" ? event.props.active_ms : 0;
        const changes = await updateSessionEnd(env.DB, {
          session_id,
          ended_at: event.ts,
          active_ms: activeMs,
        });
        // Only persist session_end event rows when a session was actually updated.
        if (changes > 0) {
          await insertEvent(env.DB, {
            session_id,
            visitor_id,
            ts: event.ts,
            name: event.name,
            props: event.props,
          });
        }
        continue;
      }

      // Interaction events
      const exists = await sessionExists(env.DB, session_id);
      if (!exists) {
        await insertSessionIgnore(env.DB, {
          session_id,
          visitor_id,
          started_at: event.ts,
          referrer_class: null,
          referrer_host: null,
          landing_path: null,
          meta,
        });
      }

      await insertEvent(env.DB, {
        session_id,
        visitor_id,
        ts: event.ts,
        name: event.name,
        props: event.props,
      });
    }

    return new Response(null, { status: 204, headers: baseHeaders });
  } catch {
    // Never leak SQL / stack / binding details.
    return jsonError(500, baseHeaders, '{"error":"internal_error"}');
  }
}
