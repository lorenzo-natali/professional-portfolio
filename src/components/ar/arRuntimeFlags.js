import { AR_INTERESTS_CALIBRATE_SESSION_KEY } from "./interestObjectsCalibrateStorage";

/**
 * Centralized AR runtime flags, captured once from the real initial URL and
 * kept for the whole tab session. Production GitHub Pages builds must honor
 * these query params (not gated on DEV / localhost / hostname).
 */

/** @typedef {{
 *   arRuntimeAudit: boolean,
 *   arInterestsCalibrate: boolean,
 *   arViewportDebug: boolean,
 *   source: "initial-url" | "current-url" | "session" | "forced" | "none",
 *   calibrateSource: "search" | "hash" | "href" | "session" | "forced" | "none",
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

function falsy(value) {
  return value === "0" || value === "false" || value === "no";
}

function readParam(params, key) {
  try {
    return params.get(key);
  } catch {
    return null;
  }
}

function persistCalibrateSession(enabled) {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (enabled) sessionStorage.setItem(AR_INTERESTS_CALIBRATE_SESSION_KEY, "1");
    else sessionStorage.removeItem(AR_INTERESTS_CALIBRATE_SESSION_KEY);
  } catch {
    // ignore
  }
}

function readCalibrateSession() {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(AR_INTERESTS_CALIBRATE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Resolve calibrate flag from a location-like object without mutating latch.
 * @param {{ search?: string, hash?: string, href?: string }} loc
 */
export function resolveCalibrateFlagFromLocation(loc = {}) {
  const search = loc.search ?? "";
  const hash = loc.hash ?? "";
  const href = loc.href ?? "";

  /** @type {string | null} */
  let explicit = null;
  /** @type {ArRuntimeFlags["calibrateSource"]} */
  let calibrateSource = "none";

  try {
    const fromSearch = readParam(new URLSearchParams(search), "arInterestsCalibrate");
    if (fromSearch != null) {
      explicit = fromSearch;
      calibrateSource = "search";
    }
  } catch {
    // ignore
  }

  if (explicit == null && hash) {
    try {
      const qIndex = hash.indexOf("?");
      const hashQuery =
        qIndex >= 0 ? hash.slice(qIndex + 1) : hash.startsWith("#") ? hash.slice(1) : hash;
      const fromHash = readParam(new URLSearchParams(hashQuery), "arInterestsCalibrate");
      if (fromHash != null) {
        explicit = fromHash;
        calibrateSource = "hash";
      }
    } catch {
      // ignore
    }
  }

  if (explicit == null && href && /[?&#]arInterestsCalibrate=/i.test(href)) {
    try {
      const match = href.match(/[?&#]arInterestsCalibrate=([^&#]+)/i);
      if (match?.[1] != null) {
        explicit = decodeURIComponent(match[1]);
        calibrateSource = "href";
      }
    } catch {
      // ignore
    }
  }

  if (explicit != null) {
    if (falsy(explicit)) {
      persistCalibrateSession(false);
      return { enabled: false, calibrateSource };
    }
    if (truthy(explicit)) {
      persistCalibrateSession(true);
      return { enabled: true, calibrateSource };
    }
    return { enabled: false, calibrateSource };
  }

  if (readCalibrateSession()) {
    return { enabled: true, calibrateSource: "session" };
  }

  return { enabled: false, calibrateSource: "none" };
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

  const calibrate = resolveCalibrateFlagFromLocation({ search, hash, href });
  const audit = readBoolFlag(search, hash, href, "arRuntimeAudit");
  const viewportDebug = readBoolFlag(search, hash, href, "arViewportDebug");

  /** @type {ArRuntimeFlags["source"]} */
  let source = "none";
  if (calibrate.calibrateSource === "search" || audit || viewportDebug) source = "initial-url";
  else if (calibrate.calibrateSource === "hash" || calibrate.calibrateSource === "href")
    source = "initial-url";
  else if (calibrate.calibrateSource === "session") source = "session";

  latchedFlags = {
    arRuntimeAudit: audit,
    arInterestsCalibrate: calibrate.enabled,
    arViewportDebug: viewportDebug || audit,
    source,
    calibrateSource: calibrate.calibrateSource,
    href,
    pathname,
    search,
    hash,
    capturedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    window.__AR_RUNTIME_FLAGS = latchedFlags;
  }

  console.info("[ar-runtime-flags] captured", {
    ...latchedFlags,
    note:
      calibrate.enabled
        ? "calibrate ON — UI mounts after Activate Camera (MindAR start)"
        : "calibrate OFF",
  });

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
