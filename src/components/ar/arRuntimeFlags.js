/**
 * Centralized AR runtime flags, captured once from the real initial URL and
 * kept for the whole tab session. Production GitHub Pages builds must honor
 * these query params (not gated on DEV / localhost / hostname).
 */

/** @typedef {{
 *   arRuntimeAudit: boolean,
 *   arViewportDebug: boolean,
 *   arRotateAudit: boolean,
 *   source: "initial-url" | "current-url" | "session" | "forced" | "none",
 *   href: string,
 *   pathname: string,
 *   search: string,
 *   hash: string,
 *   capturedAt: number,
 * }} ArRuntimeFlags */

/** @type {ArRuntimeFlags | null} */
let latchedFlags = null;

function truthy(value) {
  return value === "1" || value === "true" || value === "yes";
}

function readParam(params, key) {
  try {
    return params.get(key);
  } catch {
    return null;
  }
}

function readBoolFlag(search, hash, href, key) {
  try {
    const fromSearch = readParam(new URLSearchParams(search), key);
    if (fromSearch != null) return truthy(fromSearch);
  } catch {
    // ignore
  }
  if (hash && hash.includes(key)) {
    try {
      const qIndex = hash.indexOf("?");
      const hashQuery = qIndex >= 0 ? hash.slice(qIndex + 1) : hash.replace(/^#/, "");
      const fromHash = readParam(new URLSearchParams(hashQuery), key);
      if (fromHash != null) return truthy(fromHash);
    } catch {
      // ignore
    }
  }
  if (href && new RegExp(`[?&#]${key}=`, "i").test(href)) {
    try {
      const match = href.match(new RegExp(`[?&#]${key}=([^&#]+)`, "i"));
      if (match?.[1] != null) return truthy(decodeURIComponent(match[1]));
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Capture flags from the real URL. First call wins (session latch).
 * @param {Location | { href?: string, pathname?: string, search?: string, hash?: string }} [loc]
 * @param {{ force?: boolean }} [options]
 * @returns {ArRuntimeFlags}
 */
export function captureArRuntimeFlags(loc, options = {}) {
  if (latchedFlags && !options.force) return latchedFlags;

  const locationRef =
    loc ||
    (typeof window !== "undefined"
      ? window.location
      : { href: "", pathname: "", search: "", hash: "" });

  const href = String(locationRef.href || "");
  const pathname = String(locationRef.pathname || "");
  const search = String(locationRef.search || "");
  const hash = String(locationRef.hash || "");

  const audit = readBoolFlag(search, hash, href, "arRuntimeAudit");
  const viewportDebug = readBoolFlag(search, hash, href, "arViewportDebug");
  const rotateAudit = readBoolFlag(search, hash, href, "arRotateAudit");

  /** @type {ArRuntimeFlags["source"]} */
  let source = "none";
  if (audit || viewportDebug || rotateAudit) source = "initial-url";

  latchedFlags = {
    arRuntimeAudit: audit,
    arViewportDebug: viewportDebug,
    arRotateAudit: rotateAudit,
    source,
    href,
    pathname,
    search,
    hash,
    capturedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    window.__AR_RUNTIME_FLAGS = latchedFlags;
  }

  console.info("[ar-runtime-flags] captured", latchedFlags);

  return latchedFlags;
}

/**
 * Session-latched flags. Captures from window.location on first use.
 * @returns {ArRuntimeFlags}
 */
export function getArRuntimeFlags() {
  if (latchedFlags) return latchedFlags;
  return captureArRuntimeFlags();
}

/** @returns {ArRuntimeFlags | null} */
export function peekArRuntimeFlags() {
  return latchedFlags;
}

/** Test helper — clears the latch. */
export function resetArRuntimeFlagsForTests() {
  latchedFlags = null;
  if (typeof window !== "undefined" && window.__AR_RUNTIME_FLAGS) {
    delete window.__AR_RUNTIME_FLAGS;
  }
}
