/**
 * Privacy-conscious referrer classification + landing path (Phase A allowlist).
 */

const REFERRER_CLASSES = new Set([
  "linkedin",
  "github",
  "google",
  "direct",
  "other",
]);

/**
 * @param {string | null | undefined} referrer
 * @returns {"linkedin"|"github"|"google"|"direct"|"other"}
 */
export function classifyReferrer(referrer) {
  if (!referrer || typeof referrer !== "string") return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (!host) return "direct";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  if (host === "github.com" || host.endsWith(".github.com")) return "github";
  if (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "google.it" ||
    host.endsWith(".google.it") ||
    /^www\.google\.[a-z.]+$/.test(host)
  ) {
    return "google";
  }
  return "other";
}

/**
 * Path only — drop query/hash. Cap length to Worker MAX_PATH_LENGTH (128).
 * @param {string | null | undefined} pathname
 */
export function normalizeLandingPath(pathname) {
  let path = typeof pathname === "string" && pathname ? pathname : "/";
  if (!path.startsWith("/")) path = `/${path}`;
  // Strip accidental query/hash if a full URL-ish string was passed.
  path = path.split("?")[0].split("#")[0];
  if (path.length > 128) path = path.slice(0, 128);
  return path || "/";
}

export function isAllowedReferrerClass(value) {
  return REFERRER_CLASSES.has(value);
}
