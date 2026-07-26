/**
 * Central configuration for AR Layer 2 — Professional Evolution.
 * Placement uses document UV (u left→right, vTop top→bottom).
 */

import { AR_SESSION_RESET_MS } from "./arSessionTiming";

/** Data-driven career trajectory (direction, not equal job titles). */
export const PROFESSIONAL_EVOLUTION_STAGES = [
  { id: "internal-audit", label: "INTERNAL AUDIT" },
  { id: "technology-risk", label: "TECHNOLOGY RISK" },
  { id: "information-security", label: "INFORMATION SECURITY" },
  /** Forward-looking direction — not framed as a completed equivalent role. */
  { id: "ai-governance", label: "AI GOVERNANCE", emphasis: true, direction: true },
];

export const PROFESSIONAL_EVOLUTION_COPY = {
  heading: "PROFESSIONAL EVOLUTION",
  /** Kept short for iPhone legibility; set null to hide. */
  supporting: "FROM ASSURANCE TOWARD TECHNOLOGY, SECURITY & AI GOVERNANCE",
};

/**
 * Anchor near the Experience section without covering BoC role bullets.
 * Tunable on-device without touching render code.
 */
export const PROFESSIONAL_EVOLUTION_ORIGIN = {
  /** Centered over the Experience column, just above the BoC role block. */
  u: 0.58,
  vTop: 0.248,
};

export const PROFESSIONAL_EVOLUTION_LAYOUT = {
  /** Local offset from UV origin (document units). */
  offset: { x: 0, y: 0.01, z: 0.014 },
  /** Content band width / height in document units (width = 1). */
  width: 0.72,
  height: 0.1,
  /** Slight tip so the band reads as printed above the page. */
  rotation: { x: -0.04, y: 0, z: 0 },
  /** Final entrance lift along document Z. */
  riseHeight: 0.018,
  /** Horizontal trajectory (stages left → right). */
  trajectory: "horizontal",
  typography: {
    headingWorldHeight: 0.028,
    supportingWorldHeight: 0.018,
    stageWorldHeight: 0.022,
    maxHeadingWidth: 0.55,
    maxSupportingWidth: 0.62,
    maxStageWidth: 0.2,
  },
  spacing: {
    headingToSupport: 0.032,
    supportToLine: 0.028,
    lineToStages: 0.034,
    stageGapRatio: 0.22,
  },
  colors: {
    heading: "#e8eef5",
    supporting: "#9aa8b8",
    stage: "#d5dee8",
    /** Restrained portfolio violet — forward direction only. */
    stageEmphasis: "#c4b5fd",
    /** Cyan remains the primary trajectory colour. */
    line: "#5ec8d6",
    node: "#7ad4e0",
    nodeEmphasis: "#b794f6",
    /** Light translucent backing — integrated with the CV, not a dark card. */
    plate: "rgba(248, 250, 252, 0.16)",
    plateEmphasis: "rgba(196, 181, 253, 0.14)",
  },
};

export const PROFESSIONAL_EVOLUTION_TIMING = {
  stabilizeDelayMs: 0,
  /** Total choreographed entrance ≈ 3.4s */
  totalMs: 3400,
  headingFadeMs: 550,
  lineDrawStartMs: 350,
  lineDrawMs: 1200,
  stageStartsMs: [900, 1450, 2000, 2550],
  stageFadeMs: 420,
  emphasisStartMs: 3000,
  emphasisMs: 400,
  /** Shared with pose stabilizer — do not diverge. */
  sessionResetMs: AR_SESSION_RESET_MS,
  loseFadeMs: 0,
};

export const PROFESSIONAL_EVOLUTION_REDUCED_MOTION_TIMING = {
  ...PROFESSIONAL_EVOLUTION_TIMING,
  totalMs: 200,
  headingFadeMs: 80,
  lineDrawStartMs: 0,
  lineDrawMs: 80,
  stageStartsMs: [40, 60, 80, 100],
  stageFadeMs: 60,
  emphasisStartMs: 120,
  emphasisMs: 60,
};
