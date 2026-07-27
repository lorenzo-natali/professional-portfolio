import { describe, expect, it } from "vitest";
import {
  INTEREST_TAP_MOVE_THRESHOLD_PX,
  INTEREST_VISITOR_ROTATION_SENSITIVITY,
  computeVisitorRotationFromDrag,
} from "./interestObjectsVisitorRotation";

/**
 * Documents the current production gesture classification behaviour.
 * This is evidence for the P2 responsiveness investigation — not a fix.
 */
describe("visitor rotate threshold discontinuity (current behaviour)", () => {
  it("applies zero rotation below threshold then full frozen-start delta at threshold", () => {
    const startYaw = 0.1;
    const startPitch = 0;
    /** @type {Array<{ dx: number, mode: string, yaw: number | null }>} */
    const timeline = [];
    let mode = "pending";

    for (const dx of [0, 3, 6, 9, 10, 15]) {
      const distance = Math.hypot(dx, 0);
      let yaw = null;
      if (mode === "pending") {
        if (distance >= INTEREST_TAP_MOVE_THRESHOLD_PX) {
          mode = "rotating";
          yaw = computeVisitorRotationFromDrag({
            startYaw,
            startPitch,
            deltaX: dx,
            deltaY: 0,
            sensitivity: INTEREST_VISITOR_ROTATION_SENSITIVITY,
          }).yaw;
        }
      } else {
        yaw = computeVisitorRotationFromDrag({
          startYaw,
          startPitch,
          deltaX: dx,
          deltaY: 0,
          sensitivity: INTEREST_VISITOR_ROTATION_SENSITIVITY,
        }).yaw;
      }
      timeline.push({ dx, mode, yaw });
    }

    expect(timeline.find((s) => s.dx === 9)?.yaw).toBeNull();
    expect(timeline.find((s) => s.dx === 9)?.mode).toBe("pending");

    const atThreshold = timeline.find((s) => s.dx === 10);
    expect(atThreshold?.mode).toBe("rotating");
    // Catch-up: first visible write includes the full 10px dead-zone delta.
    expect(atThreshold?.yaw).toBeCloseTo(
      startYaw + 10 * INTEREST_VISITOR_ROTATION_SENSITIVITY,
      10,
    );
  });
});
