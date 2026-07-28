/**
 * App feature flags for production and siteDiag subtractive / bisection variants.
 * Production defaults keep current behavior when App is booted via bootProduction.
 */

import { getSectionsForSiteDiagMode } from "../portfolio/sectionCatalog.js";

/** @typedef {{
 *   beyond: boolean,
 *   assistant: boolean,
 *   intro: boolean,
 *   preload: boolean,
 *   sections?: string[] | null,
 * }} AppFeatures */

/** @type {Readonly<Omit<AppFeatures, "sections">>} */
export const DEFAULT_APP_FEATURES = Object.freeze({
  beyond: true,
  assistant: true,
  intro: true,
  preload: true,
});

/**
 * @param {Partial<AppFeatures> | null | undefined} partial
 * @returns {AppFeatures}
 */
export function resolveAppFeatures(partial) {
  const base = {
    ...DEFAULT_APP_FEATURES,
    ...(partial || {}),
  };
  if (Array.isArray(partial?.sections)) {
    base.sections = [...partial.sections];
  }
  return base;
}

const CORE_OFF = Object.freeze({
  beyond: false,
  assistant: false,
  intro: false,
  preload: false,
});

/**
 * Map siteDiag mode → App feature flags.
 * null → not an App-backed mode (blank/shell/motion/effects).
 * @param {string | null | undefined} mode
 * @returns {AppFeatures | null}
 */
export function getAppFeaturesForSiteDiagMode(mode) {
  const sectionSlice = getSectionsForSiteDiagMode(mode);

  switch (mode) {
    case "full":
      return resolveAppFeatures({
        beyond: true,
        assistant: true,
        intro: true,
        preload: true,
      });
    case "full-no-beyond":
      return resolveAppFeatures({
        beyond: false,
        assistant: true,
        intro: true,
        preload: false,
      });
    case "full-no-assistant":
      return resolveAppFeatures({
        beyond: true,
        assistant: false,
        intro: true,
        preload: true,
      });
    case "full-no-intro":
      return resolveAppFeatures({
        beyond: true,
        assistant: true,
        intro: false,
        preload: true,
      });
    case "full-no-preload":
      return resolveAppFeatures({
        beyond: true,
        assistant: true,
        intro: true,
        preload: false,
      });
    case "full-core":
      return resolveAppFeatures({ ...CORE_OFF });
    case "full-top-half":
    case "full-bottom-half":
    case "full-q1":
    case "full-q2":
    case "full-q3":
    case "full-q4":
      return resolveAppFeatures({
        ...CORE_OFF,
        sections: sectionSlice ? [...sectionSlice] : [],
      });
    default:
      return null;
  }
}

export function isFullAppSiteDiagMode(mode) {
  return getAppFeaturesForSiteDiagMode(mode) != null;
}

export function isSectionBisectSiteDiagMode(mode) {
  return getSectionsForSiteDiagMode(mode) != null;
}
