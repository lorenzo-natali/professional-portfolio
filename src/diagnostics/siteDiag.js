/**
 * Opt-in global portfolio diagnostic shells (?siteDiag=).
 * Absent → production App path unchanged (bootProduction + eager beyondBundle).
 *
 * Additive shells:
 *   blank | shell | motion | effects
 * Full App + subtractive variants:
 *   full | full-no-beyond | full-no-assistant | full-no-intro | full-no-preload | full-core
 */

import {
  getAppFeaturesForSiteDiagMode,
  isFullAppSiteDiagMode,
} from "./appFeatures.js";

export const SITE_DIAG_PARAM = "siteDiag";

export const SITE_DIAG_MODES = Object.freeze([
  "blank",
  "shell",
  "motion",
  "effects",
  "full",
  "full-no-beyond",
  "full-no-assistant",
  "full-no-intro",
  "full-no-preload",
  "full-core",
]);

/** Canonical subsystem ids used by mode matrices + init markers. */
export const SITE_DIAG_SUBSYSTEM_IDS = Object.freeze([
  "lifecycleTrace",
  "reactRoot",
  "staticText",
  "staticShell",
  "framerMotion",
  "framerMotionInfinite",
  "tickerRaf",
  "cssInfiniteAnimations",
  "portfolioAssistant",
  "portfolioIntro",
  "arBeyond",
  "arPreloadEager",
  "canvasWebgl",
  "fullPortfolioApp",
]);

/**
 * @typedef {"blank"|"shell"|"motion"|"effects"|"full"|"full-no-beyond"|"full-no-assistant"|"full-no-intro"|"full-no-preload"|"full-core"} SiteDiagMode
 */

function fullAppSubsystemSet(features) {
  const set = new Set([
    "lifecycleTrace",
    "reactRoot",
    "staticText",
    "staticShell",
    "framerMotion",
    "framerMotionInfinite",
    "tickerRaf",
    "cssInfiniteAnimations",
    "fullPortfolioApp",
  ]);
  if (features.assistant) set.add("portfolioAssistant");
  if (features.intro) set.add("portfolioIntro");
  if (features.beyond) {
    set.add("arBeyond");
    set.add("canvasWebgl");
  }
  if (features.beyond && features.preload) set.add("arPreloadEager");
  return set;
}

/** @type {Record<string, ReadonlySet<string>>} */
const MODE_ENABLED = Object.freeze({
  blank: Object.freeze(
    new Set(["lifecycleTrace", "reactRoot", "staticText"]),
  ),
  shell: Object.freeze(
    new Set(["lifecycleTrace", "reactRoot", "staticText", "staticShell"]),
  ),
  motion: Object.freeze(
    new Set([
      "lifecycleTrace",
      "reactRoot",
      "staticText",
      "staticShell",
      "framerMotion",
    ]),
  ),
  effects: Object.freeze(
    new Set([
      "lifecycleTrace",
      "reactRoot",
      "staticText",
      "staticShell",
      "framerMotion",
      "framerMotionInfinite",
      "tickerRaf",
      "cssInfiniteAnimations",
    ]),
  ),
  full: Object.freeze(fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full"))),
  "full-no-beyond": Object.freeze(
    fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full-no-beyond")),
  ),
  "full-no-assistant": Object.freeze(
    fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full-no-assistant")),
  ),
  "full-no-intro": Object.freeze(
    fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full-no-intro")),
  ),
  "full-no-preload": Object.freeze(
    fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full-no-preload")),
  ),
  "full-core": Object.freeze(
    fullAppSubsystemSet(getAppFeaturesForSiteDiagMode("full-core")),
  ),
});

let latchedMode = null;
let latched = false;

/**
 * @param {string | URLSearchParams | URL | Location | null | undefined} searchOrLocation
 * @returns {SiteDiagMode | null}
 */
export function parseSiteDiagMode(searchOrLocation) {
  let raw = null;
  if (typeof searchOrLocation === "string") {
    const q = searchOrLocation.startsWith("?")
      ? searchOrLocation.slice(1)
      : searchOrLocation.includes("?")
        ? searchOrLocation.slice(searchOrLocation.indexOf("?") + 1)
        : searchOrLocation;
    raw = new URLSearchParams(q).get(SITE_DIAG_PARAM);
  } else if (searchOrLocation instanceof URLSearchParams) {
    raw = searchOrLocation.get(SITE_DIAG_PARAM);
  } else if (searchOrLocation && typeof searchOrLocation.search === "string") {
    raw = new URLSearchParams(searchOrLocation.search).get(SITE_DIAG_PARAM);
  }

  if (raw == null || raw === "") return null;
  const normalized = String(raw).trim().toLowerCase();
  return SITE_DIAG_MODES.includes(normalized)
    ? /** @type {SiteDiagMode} */ (normalized)
    : null;
}

/**
 * @param {string | URLSearchParams | URL | Location | null | undefined} [searchOrLocation]
 * @returns {SiteDiagMode | null}
 */
export function captureSiteDiagMode(searchOrLocation) {
  if (latched) return latchedMode;
  const source =
    searchOrLocation ??
    (typeof window !== "undefined" ? window.location : null);
  latchedMode = parseSiteDiagMode(source);
  latched = true;
  return latchedMode;
}

/** @returns {SiteDiagMode | null} */
export function getSiteDiagMode() {
  if (!latched && typeof window !== "undefined") {
    return captureSiteDiagMode(window.location);
  }
  return latchedMode;
}

export function isSiteDiagEnabled() {
  return getSiteDiagMode() != null;
}

export function resetSiteDiagLatchForTests() {
  latched = false;
  latchedMode = null;
}

/**
 * @param {SiteDiagMode | null | undefined} mode
 * @returns {ReadonlyArray<{ id: string, enabled: boolean }>}
 */
export function getSiteDiagSubsystemMatrix(mode) {
  const enabled = mode && MODE_ENABLED[mode] ? MODE_ENABLED[mode] : new Set();
  return SITE_DIAG_SUBSYSTEM_IDS.map((id) => ({
    id,
    enabled: enabled.has(id),
  }));
}

/**
 * @param {SiteDiagMode | null | undefined} mode
 * @param {string} subsystemId
 */
export function isSiteDiagSubsystemEnabled(mode, subsystemId) {
  if (!mode || !MODE_ENABLED[mode]) return false;
  return MODE_ENABLED[mode].has(subsystemId);
}

export { isFullAppSiteDiagMode, getAppFeaturesForSiteDiagMode };

const INIT_LOG_MAX = 64;
/** @type {string[]} */
let initLog = [];

export function resetSiteDiagInitLog() {
  initLog = [];
}

/** @returns {ReadonlyArray<string>} */
export function getSiteDiagInitLog() {
  return initLog.slice();
}

/**
 * @param {string} subsystemId
 * @param {string} [detail]
 */
export function markSiteDiagInit(subsystemId, detail) {
  const entry = detail ? `${subsystemId}:${detail}` : String(subsystemId);
  initLog.push(entry.slice(0, 96));
  if (initLog.length > INIT_LOG_MAX) {
    initLog = initLog.slice(initLog.length - INIT_LOG_MAX);
  }
  if (typeof window !== "undefined") {
    window.__siteDiagInitLog = getSiteDiagInitLog();
  }
}
