import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  INTEREST_TAP_MOVE_THRESHOLD_PX,
  INTEREST_VISITOR_EULER_ORDER,
  INTEREST_VISITOR_MAX_PITCH_RAD,
  INTEREST_VISITOR_ROTATION_SENSITIVITY,
  applyVisitorRotationToGroup,
  clampVisitorPitch,
  computeVisitorRotationFromDrag,
  normalizeYaw,
  resetVisitorRotationGroup,
} from "./interestObjectsVisitorRotation";

describe("interestObjectsVisitorRotation math", () => {
  it("exports named sensitivity, pitch clamp, and tap threshold constants", () => {
    expect(INTEREST_VISITOR_ROTATION_SENSITIVITY).toBeCloseTo(0.005, 10);
    expect(INTEREST_VISITOR_MAX_PITCH_RAD).toBeCloseTo((65 * Math.PI) / 180, 10);
    expect(INTEREST_TAP_MOVE_THRESHOLD_PX).toBe(10);
    expect(INTEREST_VISITOR_EULER_ORDER).toBe("XYZ");
  });

  it("computes yaw from horizontal drag and pitch from vertical drag using frozen start", () => {
    const first = computeVisitorRotationFromDrag({
      startYaw: 0.2,
      startPitch: 0.1,
      deltaX: 20,
      deltaY: 0,
    });
    expect(first.yaw).toBeCloseTo(0.2 + 20 * 0.005, 10);
    expect(first.pitch).toBeCloseTo(0.1, 10);

    const second = computeVisitorRotationFromDrag({
      startYaw: 0.2,
      startPitch: 0.1,
      deltaX: 0,
      deltaY: -30,
    });
    expect(second.yaw).toBeCloseTo(0.2, 10);
    expect(second.pitch).toBeCloseTo(0.1 + -30 * 0.005, 10);

    // Total delta from start — not cumulative frame-to-frame mutation.
    const again = computeVisitorRotationFromDrag({
      startYaw: 0.2,
      startPitch: 0.1,
      deltaX: 20,
      deltaY: 0,
    });
    expect(again.yaw).toBeCloseTo(first.yaw, 12);
  });

  it("clamps pitch in both directions and rejects invalid drag input", () => {
    const max = INTEREST_VISITOR_MAX_PITCH_RAD;
    expect(clampVisitorPitch(max + 1)).toBeCloseTo(max, 10);
    expect(clampVisitorPitch(-max - 1)).toBeCloseTo(-max, 10);

    const over = computeVisitorRotationFromDrag({
      startYaw: 0,
      startPitch: 0,
      deltaX: 0,
      deltaY: 1e6,
    });
    expect(over.pitch).toBeCloseTo(max, 10);

    expect(
      computeVisitorRotationFromDrag({
        startYaw: Number.NaN,
        startPitch: 0,
        deltaX: 1,
        deltaY: 0,
      }),
    ).toBeNull();
    expect(
      computeVisitorRotationFromDrag({
        startYaw: 0,
        startPitch: 0,
        deltaX: 1,
        deltaY: 0,
        sensitivity: 0,
      }),
    ).toBeNull();
  });

  it("normalizes yaw deterministically into (-π, π]", () => {
    expect(normalizeYaw(0)).toBeCloseTo(0, 10);
    expect(normalizeYaw(Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(normalizeYaw(-Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(normalizeYaw(3 * Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(normalizeYaw(-3 * Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(normalizeYaw(Number.NaN)).toBe(0);
  });

  it("applies explicit XYZ euler with roll zero and rejects non-finite values", () => {
    const group = new THREE.Group();
    expect(applyVisitorRotationToGroup(THREE, group, 0.4, -0.2)).toBe(true);
    expect(group.rotation.order).toBe("XYZ");
    expect(group.rotation.x).toBeCloseTo(-0.2, 10);
    expect(group.rotation.y).toBeCloseTo(0, 10);
    expect(group.rotation.z).toBeCloseTo(0.4, 10);

    expect(applyVisitorRotationToGroup(THREE, group, Number.NaN, 0)).toBe(false);
    expect(group.rotation.z).toBeCloseTo(0.4, 10);

    resetVisitorRotationGroup(group);
    expect(group.rotation.x).toBeCloseTo(0, 10);
    expect(group.rotation.z).toBeCloseTo(0, 10);
  });
});
