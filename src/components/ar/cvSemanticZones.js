/**
 * Semantic zones on CV page 1 (source 1820×2574).
 *
 * Coordinates are normalized top-left space:
 * - u: 0 left → 1 right
 * - vTop: 0 top → 1 bottom
 *
 * Anchors target regions (photo block, name band, role block), not single words,
 * so minor copy edits should not break alignment.
 *
 * Stability:
 * - stable: header, profile, headline, currentRole — major layout landmarks
 * - moderate: skills — depends on column balance / section order
 * - fragile: education — lower-page shifts if experience length changes
 */

/** @typedef {{ u: number, vTop: number, note?: string }} ZonePoint */
/** @typedef {{ id: string, label: string, stability: 'stable' | 'moderate' | 'fragile', center: ZonePoint, extent?: { u: number, v: number } }} SemanticZone */

/** @type {Record<string, SemanticZone>} */
export const CV_SEMANTIC_ZONES = {
  header: {
    id: "header",
    label: "Name / header band",
    stability: "stable",
    center: { u: 0.52, vTop: 0.055, note: "Right of photo, name line" },
    extent: { u: 0.28, v: 0.05 },
  },
  profile: {
    id: "profile",
    label: "Profile photograph",
    stability: "stable",
    center: { u: 0.14, vTop: 0.095, note: "Portrait block, upper-left" },
    extent: { u: 0.16, v: 0.12 },
  },
  headline: {
    id: "headline",
    label: "Professional headline",
    stability: "stable",
    center: { u: 0.54, vTop: 0.118, note: "Title / positioning line under name" },
    extent: { u: 0.32, v: 0.04 },
  },
  skills: {
    id: "skills",
    label: "Skills / competency cluster",
    stability: "moderate",
    center: { u: 0.72, vTop: 0.26, note: "Right-side skills / keywords band" },
    extent: { u: 0.2, v: 0.1 },
  },
  currentRole: {
    id: "currentRole",
    label: "Current role (Bank of China)",
    stability: "stable",
    center: { u: 0.38, vTop: 0.4, note: "First experience entry block" },
    extent: { u: 0.36, v: 0.08 },
  },
  education: {
    id: "education",
    label: "Education block",
    stability: "fragile",
    center: { u: 0.38, vTop: 0.78, note: "Lower-page education section" },
    extent: { u: 0.36, v: 0.08 },
  },
};

/** Offsets (normalized) applied so labels sit beside regions rather than on text. */
export const ZONE_LABEL_OFFSETS = {
  header: { u: 0.0, vTop: -0.028 },
  profile: { u: -0.02, vTop: 0.02 },
  headline: { u: 0.18, vTop: 0.0 },
  skills: { u: 0.06, vTop: -0.02 },
  currentRole: { u: 0.22, vTop: -0.015 },
  education: { u: 0.2, vTop: 0.0 },
};

/**
 * Resolve a zone center (+ optional offset) to normalized top-left coords.
 * @param {string} zoneId
 * @param {{ u?: number, vTop?: number }} [offset]
 */
export function resolveZonePoint(zoneId, offset = {}) {
  const zone = CV_SEMANTIC_ZONES[zoneId];
  if (!zone) throw new Error(`Unknown CV zone: ${zoneId}`);
  const baseOffset = ZONE_LABEL_OFFSETS[zoneId] || { u: 0, vTop: 0 };
  return {
    u: clamp01(zone.center.u + (offset.u ?? baseOffset.u ?? 0)),
    vTop: clamp01(zone.center.vTop + (offset.vTop ?? baseOffset.vTop ?? 0)),
    zone,
  };
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

export function listZoneStability() {
  return Object.values(CV_SEMANTIC_ZONES).map((z) => ({
    id: z.id,
    stability: z.stability,
    note: z.center.note,
  }));
}
