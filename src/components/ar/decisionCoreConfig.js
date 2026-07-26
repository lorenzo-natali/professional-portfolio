/**
 * Decision Core — signature AR artifact configuration.
 * Placement / gesture / stabilization remain in professionalCardConfig (shared infra).
 */

export const DECISION_CORE_STAGES = [
  {
    id: "discover",
    label: "DISCOVER",
    tokens: ["Business Context", "AI Inventory", "Stakeholders"],
  },
  {
    id: "assess",
    label: "ASSESS",
    tokens: ["NIST AI RMF", "ISO 42001", "COBIT"],
  },
  {
    id: "control",
    label: "CONTROL",
    tokens: ["ISO 27001", "DORA"],
  },
  {
    id: "assure",
    label: "ASSURE",
    tokens: ["IIA", "COSO", "AUDIT"],
  },
  {
    id: "govern",
    label: "GOVERN",
    tokens: ["Accountability", "Oversight", "Policy"],
  },
  {
    id: "evolve",
    label: "EVOLVE",
    tokens: ["Monitoring", "Feedback", "Improvement"],
  },
];

/** World-unit size of the artifact (document width = 1). */
export const DECISION_CORE_SIZE = {
  /** Overall radius to blade tips at rest. */
  radius: 0.155,
  coreRadius: 0.038,
  coreShellRadius: 0.048,
  hubRadius: 0.062,
  hubTube: 0.008,
  /** Wider, flatter segments so the form reads as one industrial object. */
  bladeLength: 0.072,
  bladeWidth: 0.052,
  bladeThickness: 0.014,
  bladeLift: 0.0,
  /** Radial expand distance on first tap (document units ≈ mm-scale feel). */
  expandDistance: 0.016,
  /** Beyond the blade tip so labels sit outside the silhouette. */
  labelOffset: 0.168,
  tokenRadius: 0.198,
};

export const DECISION_CORE_MATERIALS = {
  graphite: "#2c3138",
  aluminium: "#c8ced6",
  glass: "#8a9aaa",
  cyan: "#5ec8d6",
  cyanDeep: "#2a6f7a",
  labelBg: "rgba(12, 16, 22, 0.82)",
  labelText: "#e8eef4",
  tokenBg: "rgba(18, 24, 32, 0.88)",
  tokenText: "#b7c4d0",
};

export const DECISION_CORE_TIMING = {
  labelVisibleMs: 2000,
  expandMs: 220,
  collapseMs: 180,
  tokenFadeMs: 200,
  glowPulseMs: 520,
};

/** Idle / highlight emissive intensities for the core. */
export const DECISION_CORE_GLOW = {
  idle: 0.22,
  pulsePeak: 0.55,
  highlight: 0.38,
};
