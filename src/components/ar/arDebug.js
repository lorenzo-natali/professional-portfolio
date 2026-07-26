/**
 * Development-only AR debug flags.
 * Constants must remain false in production builds unless intentionally flipped for a local session.
 */

/** Document-plane proof frame on the MindAR anchor. */
export const AR_SHOW_ANCHOR_PROOF = false;

/**
 * Force AR camera-quality diagnostics on without a URL flag.
 * Keep false in committed production builds.
 */
export const AR_CAMERA_DEBUG = false;

export const CAMERA_DEBUG_QUERY = "arCameraDebug";

/** Page-session latch: once the URL flag is observed, keep diagnostics enabled until reload. */
let urlFlagLatched = false;

/**
 * Extract `arCameraDebug` from a querystring, full URL, search, or hash fragment.
 * Supports GitHub Pages forms such as:
 * - `?arCameraDebug=1`
 * - `/professional-portfolio/?arCameraDebug=1`
 * - `#/?arCameraDebug=1`
 * - `#arCameraDebug=1`
 *
 * @param {string} raw
 * @returns {string | null}
 */
export function extractArCameraDebugParam(raw) {
  if (typeof raw !== "string" || !raw) return null;

  const candidates = [];

  // Full URL or path+search
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      candidates.push(url.search);
      if (url.hash) candidates.push(url.hash);
    }
  } catch {
    // ignore invalid absolute URLs
  }

  if (raw.includes("?") || raw.includes("#") || raw.includes("=")) {
    candidates.push(raw);
  }

  for (const candidate of candidates) {
    const value = readParamFromFragment(candidate);
    if (value != null) return value;
  }
  return null;
}

function normalizeQueryPool(raw) {
  if (!raw) return "";
  const q = raw.indexOf("?");
  if (q >= 0) return raw.slice(q + 1);
  if (raw.startsWith("#")) return normalizeQueryPool(raw.slice(1));
  return raw.replace(/^[?#/]+/, "");
}

function readParamFromFragment(fragment) {
  if (typeof fragment !== "string" || !fragment) return null;

  const hashIndex = fragment.indexOf("#");
  const beforeHash = hashIndex >= 0 ? fragment.slice(0, hashIndex) : fragment;
  const hashPart = hashIndex >= 0 ? fragment.slice(hashIndex + 1) : "";

  const pools = [];
  if (beforeHash.includes("?") || beforeHash.includes("arCameraDebug=")) {
    pools.push(normalizeQueryPool(beforeHash));
  }
  if (hashPart) {
    pools.push(normalizeQueryPool(hashPart));
  }
  if (!pools.length && fragment.includes("arCameraDebug=")) {
    pools.push(normalizeQueryPool(fragment));
  }

  for (const pool of pools) {
    if (!pool) continue;
    try {
      const params = new URLSearchParams(pool);
      if (params.has(CAMERA_DEBUG_QUERY)) {
        return params.get(CAMERA_DEBUG_QUERY);
      }
    } catch {
      // continue
    }
    const match = pool.match(/(?:^|&)arCameraDebug=([^&]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function readDebugParamFromLocation() {
  if (typeof window === "undefined" || !window.location) return null;
  const { search, hash, href } = window.location;
  return (
    extractArCameraDebugParam(search) ??
    extractArCameraDebugParam(hash) ??
    extractArCameraDebugParam(href)
  );
}

/**
 * Diagnostics are enabled only via explicit URL/hash flag or the development constant.
 * @param {string | URLSearchParams | { search?: string, hash?: string, href?: string } | undefined} [source]
 */
export function isArCameraDebugEnabled(source) {
  if (AR_CAMERA_DEBUG) return true;

  try {
    let value = null;

    if (typeof source === "string") {
      value = extractArCameraDebugParam(source);
    } else if (source instanceof URLSearchParams) {
      value = source.has(CAMERA_DEBUG_QUERY) ? source.get(CAMERA_DEBUG_QUERY) : null;
    } else if (source && typeof source === "object") {
      value =
        extractArCameraDebugParam(source.search || "") ??
        extractArCameraDebugParam(source.hash || "") ??
        extractArCameraDebugParam(source.href || "");
    } else {
      value = readDebugParamFromLocation();
    }

    if (value === "1") {
      urlFlagLatched = true;
      return true;
    }

    // Keep enabled for this page session after the flag was observed (portal remounts / soft nav).
    if (source === undefined && urlFlagLatched) {
      return true;
    }
  } catch {
    return AR_CAMERA_DEBUG || urlFlagLatched;
  }

  return false;
}

/** @internal test helper */
export function resetArCameraDebugLatch() {
  urlFlagLatched = false;
}
