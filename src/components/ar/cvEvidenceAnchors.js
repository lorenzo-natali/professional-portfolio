/**
 * Precise evidence anchors on CV page 1 (1820×2574).
 * Normalized top-left coordinates (u: left→right, vTop: top→bottom).
 * Compact stable line regions — not individual glyphs.
 */

/** @typedef {{ u: number, vTop: number, note?: string }} AnchorPoint */
/** @typedef {{ id: string, label: string, stability: 'stable' | 'moderate' | 'fragile', center: AnchorPoint, extent?: { u: number, v: number } }} EvidenceAnchor */

/** Upper-right QR / Portfolio / LinkedIn chrome. */
export const QR_AVOID_ZONE = {
  id: "qrAvoid",
  uMin: 0.72,
  uMax: 1,
  vTopMin: 0,
  vTopMax: 0.16,
};

/** @type {Record<string, EvidenceAnchor>} */
export const CV_EVIDENCE_ANCHORS = {
  bocRoleTitle: {
    id: "bocRoleTitle",
    label: "Bank of China role title",
    stability: "stable",
    center: {
      u: 0.45,
      vTop: 0.3,
      note: "INTERNAL AUDITOR / Bank of China heading",
    },
    extent: { u: 0.34, v: 0.035 },
  },
  bulletDora: {
    id: "bulletDora",
    label: "DORA / BIA / BCP / DRP bullet",
    stability: "stable",
    center: {
      u: 0.5,
      vTop: 0.35,
      note: "First BoC operational resilience bullet",
    },
    extent: { u: 0.38, v: 0.028 },
  },
  bulletIfrs: {
    id: "bulletIfrs",
    label: "IFRS 9 / PD / LGD bullet",
    stability: "stable",
    center: {
      u: 0.48,
      vTop: 0.44,
      note: "BoC credit risk / IFRS 9 bullet",
    },
    extent: { u: 0.38, v: 0.028 },
  },
  bulletControls: {
    id: "bulletControls",
    label: "Control / audit-report bullet",
    stability: "stable",
    center: {
      u: 0.48,
      vTop: 0.52,
      note: "Control effectiveness / audit reports / working papers",
    },
    extent: { u: 0.38, v: 0.028 },
  },
};

/**
 * @param {string} anchorId
 * @param {{ u?: number, vTop?: number }} [offset]
 */
export function resolveEvidenceAnchor(anchorId, offset = {}) {
  const anchor = CV_EVIDENCE_ANCHORS[anchorId];
  if (!anchor) throw new Error(`Unknown evidence anchor: ${anchorId}`);
  return {
    u: clamp01(anchor.center.u + (offset.u ?? 0)),
    vTop: clamp01(anchor.center.vTop + (offset.vTop ?? 0)),
    anchor,
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
