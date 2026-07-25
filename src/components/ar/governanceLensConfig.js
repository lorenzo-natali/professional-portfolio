/**
 * @deprecated Prefer `lensCatalog` / `cvEvidenceAnchors`.
 * Compatibility shims for transitional imports.
 */
export {
  LABEL_HEIGHT as LABEL_HEIGHT_STANDARD,
  LABEL_HEIGHT as LABEL_HEIGHT_KEY,
  LABEL_MAX_WIDTH,
  MAX_SIMULTANEOUS_ANNOTATIONS as MAX_GOVERNANCE_NODES,
  MAX_SIMULTANEOUS_ANNOTATIONS as MAX_INTERPRETATION_CALLOUTS,
  MAX_SIMULTANEOUS_ANNOTATIONS as MAX_VISIBLE_LABELS,
  NODE_DIAMETER,
  NODE_RADIUS,
  LENS_Z,
  LENS_Z_LABEL,
  LENS_Z_LINE,
  RETIRED_GOVERNANCE_LABELS as DEFERRED_LABEL_TEXTS,
  getLensAnnotations as getGovernanceNodes,
  getLensAnnotations as getInterpretationCallouts,
} from "./lensCatalog";
