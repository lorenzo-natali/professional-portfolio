import { DOCUMENT_PLANE_Z } from "./arDocumentPlane";

/** Lift AR marks slightly above the paper. */
export const LENS_Z = DOCUMENT_PLANE_Z + 0.004;
export const LENS_Z_LINE = DOCUMENT_PLANE_Z + 0.003;
export const LENS_Z_LABEL = DOCUMENT_PLANE_Z + 0.005;

export const MAX_GOVERNANCE_NODES = 4;
export const MAX_INTERPRETATION_CALLOUTS = 4;

/**
 * Staged reveal timings (ms) after stable target detection.
 * Reduced-motion skips delays and jumps to the final composition.
 */
export const LENS_SEQUENCE = {
  activationIn: 0,
  activationSettle: 1400,
  identityPath: 900,
  nodesStart: 1600,
  nodeStagger: 380,
  trajectory: 3000,
  calloutsStart: 3600,
  calloutStagger: 320,
};

export const ACTIVATION_CUE = {
  text: "Governance Lens Active",
  /** Near header, offset above name band */
  zoneId: "header",
  offset: { u: 0.02, vTop: -0.032 },
  activeOpacity: 0.92,
  settledOpacity: 0.35,
};

export const IDENTITY_PATH = {
  label: "Professional Identity",
  /** Approximate photo → name → headline */
  points: [
    { zoneId: "profile", offset: { u: 0.04, vTop: 0.0 } },
    { zoneId: "header", offset: { u: -0.02, vTop: 0.01 } },
    { zoneId: "headline", offset: { u: -0.04, vTop: 0.0 } },
  ],
  labelOffset: { u: 0.1, vTop: -0.018 },
};

/**
 * Trajectory nodes — concise labels only.
 * Order defines Banking Risk/IA → Tech Risk → InfoSec → AI Governance.
 */
export const GOVERNANCE_NODES = [
  {
    id: "internal-audit",
    label: "Internal Audit",
    zoneId: "currentRole",
    offset: { u: 0.2, vTop: -0.02 },
  },
  {
    id: "technology-risk",
    label: "Technology Risk",
    zoneId: "skills",
    offset: { u: -0.08, vTop: 0.04 },
  },
  {
    id: "information-security",
    label: "Information Security",
    zoneId: "skills",
    offset: { u: 0.02, vTop: -0.035 },
  },
  {
    id: "ai-governance",
    label: "AI Governance",
    zoneId: "headline",
    offset: { u: 0.16, vTop: 0.035 },
  },
];

/** Directional structure between nodes (professional trajectory). */
export const TRAJECTORY_EDGES = [
  ["internal-audit", "technology-risk"],
  ["technology-risk", "information-security"],
  ["information-security", "ai-governance"],
];

export const INTERPRETATION_CALLOUTS = [
  {
    id: "operational-resilience",
    label: "Operational Resilience",
    /** Evidence: DORA / BIA / BCP / DRP near current role */
    zoneId: "currentRole",
    offset: { u: 0.28, vTop: 0.045 },
    anchorOffset: { u: 0.08, vTop: 0.02 },
  },
  {
    id: "risk-analytics",
    label: "Risk Analytics",
    /** Evidence: IFRS 9 / PD / LGD */
    zoneId: "currentRole",
    offset: { u: -0.12, vTop: 0.06 },
    anchorOffset: { u: -0.02, vTop: 0.025 },
  },
  {
    id: "control-assurance",
    label: "Control Assurance",
    /** Evidence: audit reports / control testing */
    zoneId: "currentRole",
    offset: { u: 0.26, vTop: -0.055 },
    anchorOffset: { u: 0.05, vTop: -0.02 },
  },
  {
    id: "emerging-specialization",
    label: "Emerging Specialization",
    /** Evidence: AI governance frameworks / tooling */
    zoneId: "headline",
    offset: { u: 0.22, vTop: 0.07 },
    anchorOffset: { u: 0.08, vTop: 0.03 },
  },
];

export function getGovernanceNodes() {
  return GOVERNANCE_NODES.slice(0, MAX_GOVERNANCE_NODES);
}

export function getInterpretationCallouts() {
  return INTERPRETATION_CALLOUTS.slice(0, MAX_INTERPRETATION_CALLOUTS);
}
