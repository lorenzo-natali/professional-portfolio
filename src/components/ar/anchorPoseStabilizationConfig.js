/**
 * Default pose presentation filter above the raw MindAR anchor.
 * Live WebAR interest objects typically override via INTEREST_OBJECTS_STABILIZATION;
 * unset fields still fall back to these defaults (notably sessionResetMs).
 *
 * Time constants are seconds; dead zones are in anchor-local units / radians.
 */

import { AR_SESSION_RESET_MS } from "./arSessionTiming";

export const ANCHOR_POSE_STABILIZATION = {
  /** Collect pose samples before revealing / starting entrance. */
  acquisitionMs: 320,
  minAcquisitionSamples: 6,
  /**
   * Hard bound: if the target stays found with valid poses, entrance must start
   * by this time even if the preferred sample count was not reached.
   */
  maxAcquisitionMs: 900,
  /** Exponential smoothing time constants (frame-rate independent). */
  translationTauSec: 0.14,
  rotationTauSec: 0.18,
  scaleTauSec: 0.16,
  /** Ignore sub-threshold noise relative to the current filtered pose. */
  positionDeadZone: 0.0022,
  angularDeadZoneRad: 0.012,
  scaleDeadZone: 0.004,
  /** Blend duration when re-acquiring after a brief freeze. */
  reacquisitionBlendMs: 220,
  /** Continuous loss longer than this clears the pose filter. */
  sessionResetMs: AR_SESSION_RESET_MS,
};
