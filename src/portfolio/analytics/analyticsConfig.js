/** Phase B analytics client — storage keys and env contract. */

export const ANALYTICS_SCHEMA_VERSION = 1;

export const STORAGE_VISITOR_ID = "portfolio.analytics.vid";
export const STORAGE_EXCLUDE = "portfolio.analytics.exclude";
export const STORAGE_SESSION_ID = "portfolio.analytics.sid";
export const STORAGE_VISIT_SENT = "portfolio.analytics.visitSent";

/**
 * Read Vite env. Analytics stays off unless BOTH are set and enabled is strictly "true".
 * @param {{
 *   enabled?: string | boolean | null,
 *   endpoint?: string | null,
 *   dev?: boolean,
 * }} [overrides] test overrides
 */
export function resolveAnalyticsEnv(overrides = {}) {
  const enabledRaw =
    overrides.enabled !== undefined
      ? overrides.enabled
      : import.meta.env.VITE_PORTFOLIO_ANALYTICS_ENABLED;
  const endpointRaw =
    overrides.endpoint !== undefined
      ? overrides.endpoint
      : import.meta.env.VITE_PORTFOLIO_ANALYTICS_ENDPOINT;

  const enabled =
    enabledRaw === true ||
    (typeof enabledRaw === "string" && enabledRaw.trim().toLowerCase() === "true");

  const endpoint =
    typeof endpointRaw === "string" && endpointRaw.trim()
      ? endpointRaw.trim().replace(/\/$/, "")
      : "";

  const dev =
    overrides.dev !== undefined ? Boolean(overrides.dev) : Boolean(import.meta.env.DEV);

  return { enabled, endpoint, dev };
}
