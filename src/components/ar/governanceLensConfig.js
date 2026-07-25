import { DOCUMENT_PLANE_Z } from "./arDocumentPlane";

/** Lift AR marks slightly above the paper. */
export const LENS_Z = DOCUMENT_PLANE_Z + 0.004;
export const LENS_Z_LINE = DOCUMENT_PLANE_Z + 0.003;
export const LENS_Z_LABEL = DOCUMENT_PLANE_Z + 0.005;

/** Sparse first-production composition limits. */
export const MAX_GOVERNANCE_NODES = 3;
export const MAX_INTERPRETATION_CALLOUTS = 3;
/** Activation cue + identity + 3 nodes + 3 callouts; cue settles faint so peak readable labels stay ≤ 7. */
export const MAX_VISIBLE_LABELS = 7;

export const LABEL_HEIGHT_STANDARD = 0.08;
export const LABEL_HEIGHT_KEY = 0.1;
export const NODE_DIAMETER = 0.04;
export const NODE_RADIUS = NODE_DIAMETER / 2;
export const CALLOUT_MARK_RADIUS = NODE_RADIUS * 0.55;

/**
 * Staged reveal timings (ms) after stable target detection.
 * Reduced-motion skips delays and jumps to the final composition.
 */
export const LENS_SEQUENCE = {
  activationIn: 0,
  activationSettle: 1200,
  identityPath: 800,
  nodesStart: 1400,
  nodeStagger: 420,
  calloutsStart: 2800,
  calloutStagger: 380,
};

export const ACTIVATION_CUE = {
  text: "Governance Lens Active",
  zoneId: "header",
  /** Additive normalized offset from zone center — clear of QR chrome */
  offset: { u: -0.04, vTop: -0.035 },
  labelHeight: LABEL_HEIGHT_STANDARD,
  activeOpacity: 0.9,
  settledOpacity: 0.32,
};

/**
 * Photo → name → headline path.
 * All offsets are additive normalized deltas from the named zone.
 */
export const IDENTITY_PATH = {
  points: [
    { zoneId: "profile", offset: { u: 0.02, vTop: 0.0 } },
    { zoneId: "header", offset: { u: 0.0, vTop: 0.01 } },
    { zoneId: "headline", offset: { u: -0.02, vTop: 0.0 } },
  ],
  labelText: "Professional Identity",
  labelZoneId: "header",
  /** Centered above the name/headline bridge, left of QR */
  labelOffset: { u: 0.0, vTop: -0.03 },
  labelHeight: LABEL_HEIGHT_KEY,
};

/**
 * Domain nodes — Technology Risk is deferred (folded into Information Security / AI Governance).
 * Emerging Specialization is not a separate label; AI Governance carries that concept.
 */
export const GOVERNANCE_NODES = [
  {
    id: "internal-audit",
    text: "Internal Audit",
    zoneId: "currentRole",
    offset: { u: -0.02, vTop: -0.015 },
    labelOffset: { u: 0.14, vTop: -0.02 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
  {
    id: "information-security",
    text: "Information Security",
    zoneId: "skills",
    offset: { u: 0.05, vTop: -0.02 },
    /** Gutter between columns — clear of left-column Skills text */
    labelOffset: { u: 0.22, vTop: -0.03 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
  {
    id: "ai-governance",
    text: "AI Governance",
    zoneId: "headline",
    /** Left of headline / near AI Governance skill — outside QR */
    offset: { u: -0.14, vTop: 0.015 },
    labelOffset: { u: -0.16, vTop: 0.05 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
];

/**
 * Evidence callouts with leaders to BoC bullets.
 * Label offsets place plates in gutter space (right of evidence), clear of left column and QR.
 */
export const INTERPRETATION_CALLOUTS = [
  {
    id: "operational-resilience",
    text: "Operational Resilience",
    zoneId: "evidenceDora",
    evidenceOffset: { u: 0.0, vTop: 0.0 },
    labelOffset: { u: 0.28, vTop: -0.01 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
  {
    id: "risk-analytics",
    text: "Risk Analytics",
    zoneId: "evidenceIfrs",
    evidenceOffset: { u: 0.0, vTop: 0.0 },
    labelOffset: { u: 0.3, vTop: 0.0 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
  {
    id: "control-assurance",
    text: "Control Assurance",
    zoneId: "evidenceControls",
    evidenceOffset: { u: 0.0, vTop: 0.0 },
    labelOffset: { u: 0.3, vTop: 0.01 },
    labelHeight: LABEL_HEIGHT_STANDARD,
  },
];

/** Soft cyan / white palette — restrained, CV remains dominant. */
export const LENS_COLORS = {
  cyan: 0x6ec8d4,
  white: 0xffffff,
  plate: 0x0a1218,
};

export function getGovernanceNodes() {
  return GOVERNANCE_NODES.slice(0, MAX_GOVERNANCE_NODES);
}

export function getInterpretationCallouts() {
  return INTERPRETATION_CALLOUTS.slice(0, MAX_INTERPRETATION_CALLOUTS);
}

/** Labels that must not appear as separate production elements. */
export const DEFERRED_LABEL_TEXTS = ["Technology Risk", "Emerging Specialization"];
