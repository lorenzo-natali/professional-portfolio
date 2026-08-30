/**
 * CORS helpers. CORS is NOT authentication — direct non-browser calls remain possible.
 */

/**
 * @param {string | undefined | null} allowedOriginsCsv
 * @returns {string[]}
 */
export function parseAllowedOrigins(allowedOriginsCsv) {
  if (!allowedOriginsCsv || typeof allowedOriginsCsv !== "string") return [];
  return allowedOriginsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ""));
}

/**
 * @param {string | null} requestOrigin
 * @param {string[]} allowed
 * @returns {string | null} echo origin if allowed
 */
export function resolveCorsOrigin(requestOrigin, allowed) {
  if (!requestOrigin) return null;
  const normalized = requestOrigin.replace(/\/$/, "");
  return allowed.includes(normalized) ? normalized : null;
}

/**
 * @param {HeadersInit} [extra]
 * @param {string | null} allowOrigin
 */
export function corsHeaders(allowOrigin, extra = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    ...extra,
    "Cache-Control": "no-store",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
    headers["Access-Control-Max-Age"] = "86400";
    headers.Vary = "Origin";
  }
  return headers;
}

/**
 * @param {string | null} allowOrigin
 */
export function optionsResponse(allowOrigin) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(allowOrigin),
  });
}
