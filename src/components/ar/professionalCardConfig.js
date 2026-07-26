/**
 * Centralized calibration for the AR Professional Card.
 * Tune position/scale/rise on-device without changing card architecture.
 *
 * Document UV uses top-left style (u: left→right, vTop: top→bottom).
 * Origin targets the stable header band (portrait / names / contact / QR region).
 */

/** Normalized document origin for the card's emergence point. */
export const PROFESSIONAL_CARD_ORIGIN = {
  u: 0.5,
  vTop: 0.105,
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
 * Resting / idle pose relative to the document origin.
 * `riseHeight` is the final lift above the document plane after entrance.
 */
export const PROFESSIONAL_CARD_TRANSFORM = {
  position: { x: 0, y: 0, z: 0.01 },
  scale: 1,
  /** Idle readable three-quarter pose (radians). */
  rotation: { x: -0.18, y: 0.38, z: 0.02 },
  riseHeight: 0.13,
};

/** Entrance + loss lifecycle timings (ms). */
export const PROFESSIONAL_CARD_TIMING = {
  /** Wait after target-found before starting entrance (tracking settle). */
  stabilizeDelayMs: 380,
  outlineMs: 320,
  riseMs: 720,
  tiltMs: 420,
  flipMs: 900,
  settleMs: 700,
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
  stabilizeDelayMs: 120,
  outlineMs: 0,
  riseMs: 360,
  tiltMs: 0,
  flipMs: 0,
  settleMs: 0,
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
