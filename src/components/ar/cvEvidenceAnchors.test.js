import { describe, expect, it } from "vitest";
import {
  CV_EVIDENCE_ANCHORS,
  QR_AVOID_ZONE,
  isInsideQrAvoidZone,
  resolveEvidenceAnchor,
} from "./cvEvidenceAnchors";

describe("cvEvidenceAnchors", () => {
  it("defines the four Risk evidence anchors", () => {
    expect(Object.keys(CV_EVIDENCE_ANCHORS).sort()).toEqual(
      ["bocRoleTitle", "bulletControls", "bulletDora", "bulletIfrs"].sort(),
    );
  });

  it("matches the calibrated page-1 coordinates", () => {
    expect(resolveEvidenceAnchor("bocRoleTitle")).toMatchObject({ u: 0.45, vTop: 0.3 });
    expect(resolveEvidenceAnchor("bulletDora")).toMatchObject({ u: 0.5, vTop: 0.35 });
    expect(resolveEvidenceAnchor("bulletIfrs")).toMatchObject({ u: 0.48, vTop: 0.44 });
    expect(resolveEvidenceAnchor("bulletControls")).toMatchObject({ u: 0.48, vTop: 0.52 });
  });

  it("keeps QR avoid in the upper-right", () => {
    expect(QR_AVOID_ZONE.uMin).toBeGreaterThanOrEqual(0.7);
    expect(isInsideQrAvoidZone(0.85, 0.06)).toBe(true);
    expect(isInsideQrAvoidZone(0.5, 0.3)).toBe(false);
  });
});
