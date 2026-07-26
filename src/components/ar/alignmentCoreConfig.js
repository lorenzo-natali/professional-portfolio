import { AR_SESSION_RESET_MS } from "./arSessionTiming";

/** Document UV center for the Alignment Core. */
export const ALIGNMENT_CORE_ORIGIN = {
  u: 0.5,
  vTop: 0.48,
};

/**
 * Layout in document units (CV width = 1).
 *
 * Separated span ≈ 2 * (shellSeparation + shellRadius) ≈ 0.70
 * → ~70% of the framed CV / useful mobile viewport width.
 */
export const ALIGNMENT_CORE_LAYOUT = {
  /** Lift above the CV plane. */
  offset: { x: 0, y: 0, z: 0.06 },
  rotation: { x: -0.12, y: 0, z: 0 },
  /** World radius of each sculptural shell. */
  shellRadius: 0.2,
  /**
   * Resting half-gap between shell centers before merge.
   * Leaves a readable central channel for the magnetic close.
   */
  shellSeparation: 0.15,
  /** Uniform scale of the completed assembly (post-merge visual size). */
  completedObjectScale: 1,
  /** Inner luminous core radius (revealed after merge). */
  coreRadius: 0.032,
  /** Soft halo around the core. */
  haloRadius: 0.055,
  /** Merged hit proxy radius — close to the closed sculpture silhouette. */
  mergedHitRadius: 0.22,
};

export const ALIGNMENT_CORE_MATERIALS = {
  graphite: "#2a3038",
  graphiteHighlight: "#3a4450",
  cyan: "#5ec8d6",
  cyanSoft: "#8fe7f2",
  violet: "#b794f6",
  violetDeep: "#8b6cc9",
  core: "#a8f0f8",
};

/**
 * Interaction + alignment thresholds.
 * Angular tolerance uses quaternion angle (radians).
 */
export const ALIGNMENT_CORE_INTERACTION = {
  /** ~15° — within the requested 12–18° band. */
  alignToleranceRad: (15 * Math.PI) / 180,
  rotationSensitivity: 0.0055,
  /** Full 360° — no clamp. */
  inertiaDamping: 0.92,
  inertiaGain: 0.85,
  dragThresholdPx: 5,
  mergeDurationMs: 900,
  pulseDurationMs: 1400,
  coreBreathPeriodMs: 3200,
  coreBreathAmplitude: 0.22,
};

export const ALIGNMENT_CORE_TIMING = {
  sessionResetMs: AR_SESSION_RESET_MS,
  /** Brief acquisition settle before interaction. */
  revealDelayMs: 0,
};
