/**
 * Centralized calibration for the AR Professional Card.
 * Tune position/scale/interaction on-device without changing card architecture.
 *
 * Document UV uses top-left style (u: left→right, vTop: top→bottom).
 * Origin targets the visual center of the CV page.
 */

/** Normalized document origin for the card center. */
export const PROFESSIONAL_CARD_ORIGIN = {
  u: 0.5,
  vTop: 0.5,
};

/**
 * Card dimensions in MindAR world units (document width = 1).
 * Aspect ≈ classic business card (~85×55 mm).
 */
export const PROFESSIONAL_CARD_SIZE = {
  width: 0.42,
  height: 0.245,
  thickness: 0.016,
  cornerRadius: 0.018,
};

/**
 * Resting placement relative to the document origin.
 * `riseHeight` is the final lift above the document plane after entrance.
 * Initial rotation is nearly front-facing for immediate readability.
 */
export const PROFESSIONAL_CARD_TRANSFORM = {
  /** Extra local offset from the UV origin (document-local units). */
  position: { x: 0, y: 0, z: 0.012 },
  scale: 1,
  /** Near front-facing; tiny tip for depth without wobble. */
  rotation: { x: -0.05, y: 0, z: 0 },
  riseHeight: 0.05,
};

/**
 * Direct touch manipulation limits (applied only to the interaction group).
 */
export const PROFESSIONAL_CARD_INTERACTION = {
  minScale: 0.72,
  maxScale: 1.8,
  /** Radians per CSS pixel for one-finger drag. */
  rotationSensitivity: 0.0052,
  /** Ignore sub-threshold pointer jitter before rotation starts (CSS px). */
  dragThresholdPx: 6,
  /** Vertical (local X) clamp — keeps the card readable. */
  clampXRad: { min: -1.2, max: 0.4 },
  /** Horizontal (local Y) clamp. */
  clampYRad: { min: -Math.PI * 0.95, max: Math.PI * 0.95 },
};

/**
 * Pose presentation filter above the raw MindAR anchor.
 * Time constants are seconds; dead zones are in anchor-local units / radians.
 */
export const PROFESSIONAL_CARD_STABILIZATION = {
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
  sessionResetMs: 1400,
};

/** Entrance + loss lifecycle timings (ms). No automatic tilt/flip. */
export const PROFESSIONAL_CARD_TIMING = {
  /** Wait after target-found before starting entrance (usually 0 when gated by acquisition). */
  stabilizeDelayMs: 0,
  riseMs: 420,
  /** Soft hide duration on target lost. */
  loseFadeMs: 220,
  /**
   * Brief lost windows shorter than this do not end the recognition session
   * (no full entrance replay on quick re-acquire).
   */
  lostJitterMs: 700,
  /** After this much continuous loss, the next found starts a new entrance. */
  sessionResetMs: 1400,
};

/** Reduced-motion: short fade/rise only. */
export const PROFESSIONAL_CARD_REDUCED_MOTION_TIMING = {
  stabilizeDelayMs: 0,
  riseMs: 280,
  loseFadeMs: 140,
  lostJitterMs: 700,
  sessionResetMs: 1400,
};

export const PROFESSIONAL_CARD_CONTENT = {
  front: {
    name: "Lorenzo Natali",
    title: "Banking Risk | Tech. & AI Governance | Information Security",
    detail: "AR Professional Identity",
  },
  back: {
    lines: ["Risk & Governance", "Technology & Information Security", "AI Governance"],
    footer: "Banking and assurance experience",
  },
};

export const PROFESSIONAL_CARD_COLORS = {
  surface: "#0b1220",
  surfaceEdge: "#152033",
  cyan: "#67e8f9",
  cyanSoft: "rgba(103, 232, 249, 0.55)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  outline: "#67e8f9",
};
