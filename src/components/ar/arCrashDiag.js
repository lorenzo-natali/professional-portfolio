/**
 * Opt-in crash-isolation diagnostic modes for iPhone Safari A/B.
 * Absent ?arDiag= → production path unchanged.
 *
 * Enable with ?beyond=1&arDiag=<camera|render|mindar|frozen>
 */

/** @typedef {'camera' | 'render' | 'mindar' | 'frozen'} ArCrashDiagMode */

export const AR_CRASH_DIAG_PARAM = "arDiag";

export const AR_CRASH_DIAG_MODES = Object.freeze([
  "camera",
  "render",
  "mindar",
  "frozen",
]);

/**
 * @param {string | null | undefined} raw
 * @returns {ArCrashDiagMode | null}
 */
export function parseArCrashDiag(raw) {
  if (raw == null) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  return AR_CRASH_DIAG_MODES.includes(value)
    ? /** @type {ArCrashDiagMode} */ (value)
    : null;
}

/**
 * @param {ArCrashDiagMode | null | undefined} mode
 */
export function arCrashDiagSnapshotLabel(mode) {
  return mode ?? "off";
}

/**
 * Exact subsystem matrix for contract tests and the HUD.
 * @param {ArCrashDiagMode | null | undefined} mode
 */
export function getArCrashDiagCapabilities(mode) {
  switch (mode) {
    case "camera":
      return {
        mode: "camera",
        camera: true,
        mindAr: false,
        mindArWorker: false,
        threeRender: false,
        interestContent: false,
        freezeAfterAcquire: false,
      };
    case "render":
      return {
        mode: "render",
        camera: true,
        mindAr: false,
        mindArWorker: false,
        threeRender: true,
        interestContent: false,
        freezeAfterAcquire: false,
      };
    case "mindar":
      return {
        mode: "mindar",
        camera: true,
        mindAr: true,
        mindArWorker: true,
        threeRender: false,
        interestContent: false,
        freezeAfterAcquire: false,
      };
    case "frozen":
      return {
        mode: "frozen",
        camera: true,
        mindAr: true,
        mindArWorker: true,
        threeRender: true,
        interestContent: true,
        freezeAfterAcquire: true,
      };
    default:
      return {
        mode: null,
        camera: true,
        mindAr: true,
        mindArWorker: true,
        threeRender: true,
        interestContent: true,
        freezeAfterAcquire: false,
      };
  }
}

/**
 * @param {ArCrashDiagMode | null | undefined} mode
 */
export function isArCrashDiagEnabled(mode) {
  return mode != null;
}
