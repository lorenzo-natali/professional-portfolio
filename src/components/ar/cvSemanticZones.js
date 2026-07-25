/**
 * Legacy semantic-zone module.
 * Precise evidence anchors live in `cvEvidenceAnchors.js`.
 */

import {
  CV_EVIDENCE_ANCHORS,
  QR_AVOID_ZONE,
  isInsideQrAvoidZone,
  resolveEvidenceAnchor,
} from "./cvEvidenceAnchors";

export { QR_AVOID_ZONE, isInsideQrAvoidZone };

/** @deprecated Use CV_EVIDENCE_ANCHORS */
export const CV_SEMANTIC_ZONES = CV_EVIDENCE_ANCHORS;

/** @deprecated Use resolveEvidenceAnchor */
export function resolveZonePoint(zoneId, offset = {}) {
  return resolveEvidenceAnchor(zoneId, offset);
}

export function listZoneStability() {
  return Object.values(CV_EVIDENCE_ANCHORS).map((z) => ({
    id: z.id,
    stability: z.stability,
    note: z.center.note,
  }));
}
