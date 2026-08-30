import { ANALYTICS_SCHEMA_VERSION } from "./analyticsConfig.js";

/** CORS-safelisted type for unload beacons / keepalive (avoids preflight on pagehide). */
export const UNLOAD_CONTENT_TYPE = "text/plain;charset=utf-8";

/** Alive-page POSTs (e.g. portfolio_visit) keep JSON Content-Type. */
export const ALIVE_CONTENT_TYPE = "application/json";

/**
 * @param {{
 *   endpoint: string,
 *   visitorId: string,
 *   sessionId: string,
 *   events: Array<{ name: string, ts: string, props?: Record<string, string | number> }>,
 *   fetchImpl?: typeof fetch,
 *   sendBeaconImpl?: Navigator["sendBeacon"] | null,
 *   preferBeacon?: boolean,
 * }} args
 * @returns {boolean} whether a delivery attempt was made (not whether server accepted)
 */
export function sendAnalyticsBatch({
  endpoint,
  visitorId,
  sessionId,
  events,
  fetchImpl,
  sendBeaconImpl,
  preferBeacon = false,
}) {
  if (!endpoint || !events?.length) return false;

  const body = JSON.stringify({
    v: ANALYTICS_SCHEMA_VERSION,
    visitor_id: visitorId,
    session_id: sessionId,
    sent_at: new Date().toISOString(),
    events,
  });

  const url = `${endpoint.replace(/\/$/, "")}/analytics`;

  // Unload path: CORS-safelisted text/plain so cross-origin sendBeacon / keepalive
  // does not require a preflight that pagehide cannot reliably complete.
  if (preferBeacon) {
    try {
      if (typeof sendBeaconImpl === "function") {
        const blob = new Blob([body], { type: UNLOAD_CONTENT_TYPE });
        if (sendBeaconImpl(url, blob)) return true;
      }
    } catch {
      // fall through to fetch
    }

    const doFetch =
      fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!doFetch) return false;

    try {
      void doFetch(url, {
        method: "POST",
        headers: { "content-type": UNLOAD_CONTENT_TYPE },
        body,
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      }).catch(() => {
        // Silent — analytics must never surface errors.
      });
      return true;
    } catch {
      return false;
    }
  }

  const doFetch =
    fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  if (!doFetch) return false;

  try {
    void doFetch(url, {
      method: "POST",
      headers: { "content-type": ALIVE_CONTENT_TYPE },
      body,
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    }).catch(() => {
      // Silent — analytics must never surface errors.
    });
    return true;
  } catch {
    return false;
  }
}
