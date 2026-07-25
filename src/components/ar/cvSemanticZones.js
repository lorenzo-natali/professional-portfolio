/**
 * Semantic zones on CV page 1 (source 1820×2574) — two-column English CV layout.
 *
 * Coordinates are normalized top-left space:
 * - u: 0 left → 1 right
 * - vTop: 0 top → 1 bottom
 *
 * Real layout:
 * - left column: photo, contacts, About Me, Skills, Tools & Tech
 * - upper-right: name, headline, summary, QR codes
 * - central/right: Work Experience
 * - lower-right: Education
 *
 * Stability:
 * - stable: profile, header, headline, currentRole, evidence rows tied to BoC bullets
 * - moderate: skills (left column order)
 * - fragile: education (shifts if experience grows)
 */

/** @typedef {{ u: number, vTop: number, note?: string }} ZonePoint */
/** @typedef {{ id: string, label: string, stability: 'stable' | 'moderate' | 'fragile', center: ZonePoint, extent?: { u: number, v: number } }} SemanticZone */

/** Upper-right QR / Portfolio / LinkedIn chrome — labels must stay outside. */
export const QR_AVOID_ZONE = {
  id: "qrAvoid",
  uMin: 0.72,
  uMax: 1,
  vTopMin: 0,
  vTopMax: 0.16,
};

/** @type {Record<string, SemanticZone>} */
export const CV_SEMANTIC_ZONES = {
  profile: {
    id: "profile",
    label: "Profile photograph",
    stability: "stable",
    center: { u: 0.19, vTop: 0.13, note: "Portrait block, upper-left column" },
    extent: { u: 0.16, v: 0.12 },
  },
  header: {
    id: "header",
    label: "Name / header band",
    stability: "stable",
    center: { u: 0.48, vTop: 0.08, note: "LORENZO NATALI name block" },
    extent: { u: 0.28, v: 0.05 },
  },
  headline: {
    id: "headline",
    label: "Professional headline",
    stability: "stable",
    center: { u: 0.5, vTop: 0.16, note: "Banking Risk | Tech. & AI Governance | Information Security" },
    extent: { u: 0.32, v: 0.04 },
  },
  skills: {
    id: "skills",
    label: "Skills (left column)",
    stability: "moderate",
    center: { u: 0.16, vTop: 0.55, note: "Left-column Skills list — not the right band" },
    extent: { u: 0.18, v: 0.18 },
  },
  currentRole: {
    id: "currentRole",
    label: "Current role heading (Bank of China)",
    stability: "stable",
    center: { u: 0.45, vTop: 0.3, note: "INTERNAL AUDITOR / Bank of China heading" },
    extent: { u: 0.36, v: 0.05 },
  },
  evidenceDora: {
    id: "evidenceDora",
    label: "DORA / BIA / BCP / DRP bullet",
    stability: "stable",
    center: { u: 0.5, vTop: 0.35, note: "First BoC operational resilience bullet" },
    extent: { u: 0.4, v: 0.03 },
  },
  evidenceIfrs: {
    id: "evidenceIfrs",
    label: "IFRS 9 / PD / LGD bullet",
    stability: "stable",
    center: { u: 0.48, vTop: 0.44, note: "BoC credit risk / IFRS 9 bullet" },
    extent: { u: 0.4, v: 0.03 },
  },
  evidenceControls: {
    id: "evidenceControls",
    label: "Control / audit-report bullet",
    stability: "stable",
    center: { u: 0.48, vTop: 0.52, note: "BoC control effectiveness / audit reports bullet" },
    extent: { u: 0.4, v: 0.03 },
  },
  education: {
    id: "education",
    label: "Education block",
    stability: "fragile",
    center: { u: 0.5, vTop: 0.8, note: "Lower-right Education section" },
    extent: { u: 0.4, v: 0.1 },
  },
};

/**
 * Resolve a zone center plus an additive normalized offset.
 * Offsets always ADD to the zone center (they never replace it).
 *
 * @param {string} zoneId
 * @param {{ u?: number, vTop?: number }} [offset]
 */
export function resolveZonePoint(zoneId, offset = {}) {
  const zone = CV_SEMANTIC_ZONES[zoneId];
  if (!zone) throw new Error(`Unknown CV zone: ${zoneId}`);
  return {
    u: clamp01(zone.center.u + (offset.u ?? 0)),
    vTop: clamp01(zone.center.vTop + (offset.vTop ?? 0)),
    zone,
  };
}

export function isInsideQrAvoidZone(u, vTop) {
  return (
    u >= QR_AVOID_ZONE.uMin &&
    u <= QR_AVOID_ZONE.uMax &&
    vTop >= QR_AVOID_ZONE.vTopMin &&
    vTop <= QR_AVOID_ZONE.vTopMax
  );
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
