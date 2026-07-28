/**
 * App feature flags for production and siteDiag subtractive variants.
 * Production defaults keep current behavior when App is booted via bootProduction.
 */

/** @typedef {{
 *   beyond: boolean,
 *   assistant: boolean,
 *   intro: boolean,
 *   preload: boolean,
 * }} AppFeatures */

/** @type {Readonly<AppFeatures>} */
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
  return {
    ...DEFAULT_APP_FEATURES,
    ...(partial || {}),
  };
}

/**
 * Map siteDiag mode → App feature flags.
 * null → not an App-backed mode (blank/shell/motion/effects).
 * @param {string | null | undefined} mode
 * @returns {AppFeatures | null}
 */
export function getAppFeaturesForSiteDiagMode(mode) {
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
      return resolveAppFeatures({
        beyond: false,
        assistant: false,
        intro: false,
        preload: false,
      });
    default:
      return null;
  }
}

export function isFullAppSiteDiagMode(mode) {
  return getAppFeaturesForSiteDiagMode(mode) != null;
}
