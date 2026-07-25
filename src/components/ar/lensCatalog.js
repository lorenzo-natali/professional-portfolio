import { DOCUMENT_PLANE_Z } from "./arDocumentPlane";

/** Lift AR marks slightly above the paper. */
export const LENS_Z = DOCUMENT_PLANE_Z + 0.004;
export const LENS_Z_LINE = DOCUMENT_PLANE_Z + 0.003;
export const LENS_Z_LABEL = DOCUMENT_PLANE_Z + 0.005;

export const MAX_SIMULTANEOUS_ANNOTATIONS = 4;
export const PAGE_SAFE_MARGIN = 0.04;
export const LABEL_HEIGHT = 0.042;
export const LABEL_MAX_WIDTH = 0.22;
export const NODE_DIAMETER = 0.024;
export const NODE_RADIUS = NODE_DIAMETER / 2;

/** Staggered reveal after stable detection (ms). */
export const LENS_REVEAL = {
  firstAnnotation: 350,
  stagger: 480,
};

/**
 * Screen-fixed Lens selector entries.
 * Only Risk has production annotations in this milestone.
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   accent: string,
 *   accentHex: number,
 *   enabled: boolean,
 *   status: 'active' | 'upcoming',
 *   evidenceAnchors: string[],
 *   annotations: Array<{
 *     id: string,
 *     text: string,
 *     evidenceAnchorId: string,
 *     labelUv: { u: number, vTop: number },
 *   }>,
 * }} LensDefinition
 */

/** @type {LensDefinition[]} */
export const LENSES = [
  {
    id: "professional",
    label: "Professional",
    accent: "#94a3b8",
    accentHex: 0x94a3b8,
    enabled: false,
    status: "upcoming",
    evidenceAnchors: [],
    annotations: [],
  },
  {
    id: "risk",
    label: "Risk",
    accent: "#e8a45c",
    accentHex: 0xe8a45c,
    enabled: true,
    status: "active",
    evidenceAnchors: ["bocRoleTitle", "bulletDora", "bulletIfrs", "bulletControls"],
    annotations: [
      {
        id: "internal-audit",
        text: "Internal Audit",
        evidenceAnchorId: "bocRoleTitle",
        /** Right gutter free space beside role heading — clear of bullet text */
        labelUv: { u: 0.78, vTop: 0.275 },
      },
      {
        id: "operational-resilience",
        text: "Operational Resilience",
        evidenceAnchorId: "bulletDora",
        labelUv: { u: 0.78, vTop: 0.355 },
      },
      {
        id: "risk-analytics",
        text: "Risk Analytics",
        evidenceAnchorId: "bulletIfrs",
        labelUv: { u: 0.78, vTop: 0.445 },
      },
      {
        id: "control-assurance",
        text: "Control Assurance",
        evidenceAnchorId: "bulletControls",
        labelUv: { u: 0.78, vTop: 0.535 },
      },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    accent: "#5ec8d4",
    accentHex: 0x5ec8d4,
    enabled: false,
    status: "upcoming",
    evidenceAnchors: [],
    annotations: [],
  },
  {
    id: "ai",
    label: "AI",
    accent: "#c084fc",
    accentHex: 0xc084fc,
    enabled: false,
    status: "upcoming",
    evidenceAnchors: [],
    annotations: [],
  },
];

export const DEFAULT_LENS_ID = "risk";

/** Labels retired from the previous simultaneous Governance composition. */
export const RETIRED_GOVERNANCE_LABELS = [
  "Governance Lens Active",
  "Professional Identity",
  "Information Security",
  "AI Governance",
  "Technology Risk",
  "Emerging Specialization",
];

export function getLensById(lensId) {
  return LENSES.find((lens) => lens.id === lensId) ?? null;
}

export function getEnabledLenses() {
  return LENSES.filter((lens) => lens.enabled);
}

export function getLensAnnotations(lensId) {
  const lens = getLensById(lensId);
  if (!lens) return [];
  return lens.annotations.slice(0, MAX_SIMULTANEOUS_ANNOTATIONS);
}

export function listLensSelectorItems() {
  return LENSES.map(({ id, label, accent, enabled, status }) => ({
    id,
    label,
    accent,
    enabled,
    status,
  }));
}
