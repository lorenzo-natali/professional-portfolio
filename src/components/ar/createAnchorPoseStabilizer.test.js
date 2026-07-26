import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  alignQuaternionHemisphere,
  createAnchorPoseStabilizer,
  smoothingAlpha,
} from "./createAnchorPoseStabilizer";

function makeHierarchy() {
  // Mirror MindAR anchors: matrixAutoUpdate disabled, matrix written directly.
  const rawAnchor = new THREE.Group();
  rawAnchor.name = "raw-anchor";
  rawAnchor.matrixAutoUpdate = false;
  rawAnchor.visible = false;
  const presentation = new THREE.Group();
  presentation.name = "ar-professional-card-presentation";
  rawAnchor.add(presentation);
  const cardRoot = new THREE.Group();
  cardRoot.name = "ar-professional-card";
  presentation.add(cardRoot);
  return { rawAnchor, presentation, cardRoot };
}

function setRawPose(rawAnchor, { x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1, s = 1 } = {}) {
  const pos = new THREE.Vector3(x, y, z);
  const quat = new THREE.Quaternion(qx, qy, qz, qw).normalize();
  const scale = new THREE.Vector3(s, s, s);
  rawAnchor.matrix.compose(pos, quat, scale);
  // Leave TRS properties at defaults — MindAR does not keep them in sync.
  rawAnchor.position.set(0, 0, 0);
  rawAnchor.quaternion.identity();
  rawAnchor.scale.set(1, 1, 1);
  rawAnchor.matrixWorldNeedsUpdate = true;
}

function readWorldPose(object) {
  // updateMatrixWorld on a child does not refresh parents — walk from the root.
  if (typeof object.updateWorldMatrix === "function") {
    object.updateWorldMatrix(true, true);
  } else {
    let root = object;
    while (root.parent) root = root.parent;
    root.updateMatrixWorld(true);
  }
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.matrixWorld.decompose(pos, quat, scale);
  return { pos, quat, scale };
}

describe("createAnchorPoseStabilizer", () => {
  let nowMs = 0;

  beforeEach(() => {
    nowMs = 0;
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const fastConfig = {
    acquisitionMs: 80,
    minAcquisitionSamples: 3,
    maxAcquisitionMs: 200,
    translationTauSec: 0.12,
    rotationTauSec: 0.12,
    scaleTauSec: 0.12,
    positionDeadZone: 0.002,
    angularDeadZoneRad: 0.01,
    scaleDeadZone: 0.004,
    reacquisitionBlendMs: 100,
    sessionResetMs: 300,
  };

  function createStabilizer(hierarchy, overrides = {}) {
    return createAnchorPoseStabilizer(THREE, {
      rawAnchor: hierarchy.rawAnchor,
      presentation: hierarchy.presentation,
      config: { ...fastConfig, ...overrides.config },
      now: () => nowMs,
      onAcquisitionReady: overrides.onAcquisitionReady,
    });
  }

  function acquire(stabilizer, rawAnchor, pose = { x: 1, y: 0.5, z: 0.2 }) {
    setRawPose(rawAnchor, pose);
    stabilizer.onTargetFound();
    for (let i = 0; i < 8; i += 1) {
      nowMs += 20;
      setRawPose(rawAnchor, {
        ...pose,
        x: pose.x + (i % 2 === 0 ? 0.0004 : -0.0004),
      });
      stabilizer.update(0.02);
    }
  }

  it("uses delta-time exponential smoothing (not a fixed per-frame lerp)", () => {
    expect(smoothingAlpha(1 / 60, 0.14)).toBeLessThan(smoothingAlpha(1 / 30, 0.14));
    expect(smoothingAlpha(0, 0.14)).toBe(0);
    expect(smoothingAlpha(1, 0)).toBe(1);
  });

  it("aligns quaternions onto the shortest-path hemisphere", () => {
    const reference = new THREE.Quaternion(0, 0, 0, 1);
    const flipped = new THREE.Quaternion(0, 0, 0, -1);
    const out = new THREE.Quaternion();
    alignQuaternionHemisphere(reference, flipped, out);
    expect(reference.dot(out)).toBeGreaterThan(0);
  });

  it("does not start acquisition-ready on the first noisy frame", () => {
    const hierarchy = makeHierarchy();
    const onReady = vi.fn();
    const stabilizer = createStabilizer(hierarchy, { onAcquisitionReady: onReady });

    setRawPose(hierarchy.rawAnchor, { x: 0.1 });
    stabilizer.onTargetFound();
    stabilizer.update(0.016);
    expect(onReady).not.toHaveBeenCalled();
    expect(stabilizer.getState().state).toBe("acquiring");

    acquire(stabilizer, hierarchy.rawAnchor, { x: 0.1, y: 0, z: 0 });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(stabilizer.getState().state).toBe("tracking");
    stabilizer.dispose();
  });

  it("keeps presentation world pose stable under sub-threshold noise", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 2, y: 1, z: 0.5 });

    const before = readWorldPose(hierarchy.presentation);
    for (let i = 0; i < 20; i += 1) {
      setRawPose(hierarchy.rawAnchor, {
        x: 2 + (i % 2 === 0 ? 0.0008 : -0.0008),
        y: 1 + (i % 2 === 0 ? 0.0005 : -0.0005),
        z: 0.5,
      });
      stabilizer.update(1 / 60);
    }
    const after = readWorldPose(hierarchy.presentation);

    expect(after.pos.distanceTo(before.pos)).toBeLessThan(0.0015);
    stabilizer.dispose();
  });

  it("follows deliberate larger movement smoothly without snapping", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 0, y: 0, z: 0 });

    setRawPose(hierarchy.rawAnchor, { x: 0.2, y: 0, z: 0 });
    const distances = [];
    for (let i = 0; i < 30; i += 1) {
      stabilizer.update(1 / 60);
      const world = readWorldPose(hierarchy.presentation);
      distances.push(world.pos.x);
    }

    // Monotonic approach toward the new pose; never jumps straight to 0.2 on frame 1.
    expect(distances[0]).toBeGreaterThan(0.01);
    expect(distances[0]).toBeLessThan(0.12);
    expect(distances[distances.length - 1]).toBeGreaterThan(0.15);
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1] - 1e-6);
    }
    stabilizer.dispose();
  });

  it("freezes the stable pose on brief target loss", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 1.5, y: 0.25, z: 0.1 });
    const frozen = readWorldPose(hierarchy.presentation);

    stabilizer.onTargetLost();
    expect(stabilizer.getState().state).toBe("frozen");

    setRawPose(hierarchy.rawAnchor, { x: 3, y: 2, z: 1, s: 1.2 });
    for (let i = 0; i < 10; i += 1) {
      stabilizer.update(1 / 60);
    }
    const held = readWorldPose(hierarchy.presentation);
    expect(held.pos.distanceTo(frozen.pos)).toBeLessThan(0.001);
    stabilizer.dispose();
  });

  it("blends from the frozen pose on quick reacquisition without a jump", () => {
    const hierarchy = makeHierarchy();
    const onReady = vi.fn();
    const stabilizer = createStabilizer(hierarchy, { onAcquisitionReady: onReady });
    acquire(stabilizer, hierarchy.rawAnchor, { x: 1, y: 0, z: 0 });
    expect(onReady).toHaveBeenCalledTimes(1);
    stabilizer.onTargetLost();

    setRawPose(hierarchy.rawAnchor, { x: 1.15, y: 0, z: 0 });
    stabilizer.onTargetFound();
    expect(onReady).toHaveBeenCalledTimes(2);
    expect(stabilizer.getState().state).toBe("blending");
    const first = readWorldPose(hierarchy.presentation);
    expect(first.pos.x).toBeCloseTo(1, 2);

    for (let i = 0; i < 5; i += 1) {
      stabilizer.update(0.02);
    }
    const mid = readWorldPose(hierarchy.presentation);
    expect(mid.pos.x).toBeGreaterThan(1.01);
    expect(mid.pos.x).toBeLessThan(1.14);

    for (let i = 0; i < 20; i += 1) {
      stabilizer.update(0.02);
    }
    expect(stabilizer.getState().state).toBe("tracking");
    stabilizer.dispose();
  });

  it("clears filter state after a full session reset", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 0.8, y: 0.1, z: 0 });
    expect(stabilizer.getState().hasFilter).toBe(true);

    stabilizer.onTargetLost();
    vi.advanceTimersByTime(fastConfig.sessionResetMs + 10);
    expect(stabilizer.getState().hasFilter).toBe(false);
    expect(stabilizer.getState().state).toBe("idle");
    stabilizer.dispose();
  });

  it("dispose clears timers and leaves a clean reopen state", () => {
    const hierarchy = makeHierarchy();
    const onReady = vi.fn();
    const stabilizer = createStabilizer(hierarchy, { onAcquisitionReady: onReady });
    acquire(stabilizer, hierarchy.rawAnchor, { x: 0.4 });
    stabilizer.onTargetLost();
    stabilizer.dispose();

    expect(stabilizer.getState().state).toBe("idle");
    expect(stabilizer.getState().hasFilter).toBe(false);

    // A new stabilizer on the same hierarchy starts clean.
    const again = createStabilizer(hierarchy, { onAcquisitionReady: onReady });
    expect(again.getState().state).toBe("idle");
    again.onTargetFound();
    expect(again.getState().state).toBe("acquiring");
    expect(onReady).toHaveBeenCalledTimes(1); // only the first acquire completed
    again.dispose();
  });

  it("keeps the card target-relative: presentation world follows filtered anchor, not screen axes", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 0.3, y: -0.2, z: 0.4 });

    // Deliberate move of the target pose — presentation world tracks it (filtered).
    setRawPose(hierarchy.rawAnchor, { x: 0.5, y: -0.2, z: 0.4 });
    for (let i = 0; i < 40; i += 1) {
      stabilizer.update(1 / 60);
    }
    const world = readWorldPose(hierarchy.presentation);
    expect(world.pos.x).toBeGreaterThan(0.42);
    expect(world.pos.y).toBeCloseTo(-0.2, 1);

    // Card local root stays a child of presentation (target-local stack intact).
    expect(hierarchy.cardRoot.parent).toBe(hierarchy.presentation);
    expect(hierarchy.presentation.parent).toBe(hierarchy.rawAnchor);
    stabilizer.dispose();
  });

  it("has a single authoritative presentation writer (matrixAutoUpdate disabled)", () => {
    const hierarchy = makeHierarchy();
    const stabilizer = createStabilizer(hierarchy);
    expect(hierarchy.presentation.matrixAutoUpdate).toBe(false);
    acquire(stabilizer, hierarchy.rawAnchor, { x: 0.25, y: 0, z: 0 });
    const stable = readWorldPose(hierarchy.presentation);

    // Rogue writes to the presentation matrix are overwritten by the stabilizer.
    hierarchy.presentation.matrix.makeTranslation(9, 9, 9);
    stabilizer.update(1 / 60);
    const restored = readWorldPose(hierarchy.presentation);
    expect(restored.pos.distanceTo(stable.pos)).toBeLessThan(0.02);
    expect(restored.pos.x).not.toBeCloseTo(9, 1);
    stabilizer.dispose();
  });

  it("regression: never calls updateMatrix on a MindAR-style anchor (preserves tracked matrix)", () => {
    const hierarchy = makeHierarchy();
    const tracked = new THREE.Matrix4().compose(
      new THREE.Vector3(1.5, 0.25, -2),
      new THREE.Quaternion(),
      new THREE.Vector3(0.8, 0.8, 0.8),
    );
    hierarchy.rawAnchor.matrix.copy(tracked);
    const updateSpy = vi.spyOn(hierarchy.rawAnchor, "updateMatrix");

    const stabilizer = createStabilizer(hierarchy);
    hierarchy.rawAnchor.visible = true;
    stabilizer.onTargetFound();
    for (let i = 0; i < 10; i += 1) {
      nowMs += 20;
      // MindAR re-writes the matrix each frame; TRS props stay at defaults.
      hierarchy.rawAnchor.matrix.copy(tracked);
      stabilizer.update(0.02);
    }

    expect(updateSpy).not.toHaveBeenCalled();
    expect(hierarchy.rawAnchor.matrix.elements[12]).toBeCloseTo(1.5, 5);
    expect(hierarchy.rawAnchor.matrix.elements[14]).toBeCloseTo(-2, 5);
    expect(stabilizer.getState().state).toBe("tracking");

    const world = readWorldPose(hierarchy.presentation);
    expect(world.pos.x).toBeCloseTo(1.5, 1);
    expect(world.scale.x).toBeGreaterThan(0.5);
    stabilizer.dispose();
  });

  it("bounded visibility: finishes acquisition by maxAcquisitionMs with any valid samples", () => {
    const hierarchy = makeHierarchy();
    const onReady = vi.fn();
    const stabilizer = createStabilizer(hierarchy, {
      onAcquisitionReady: onReady,
      config: {
        acquisitionMs: 500,
        minAcquisitionSamples: 50,
        maxAcquisitionMs: 120,
      },
    });

    setRawPose(hierarchy.rawAnchor, { x: 0.7, y: 0.1, z: 0.2 });
    stabilizer.onTargetFound();
    for (let i = 0; i < 8; i += 1) {
      nowMs += 20;
      setRawPose(hierarchy.rawAnchor, { x: 0.7, y: 0.1, z: 0.2 });
      stabilizer.update(0.02);
    }

    expect(onReady).toHaveBeenCalled();
    expect(stabilizer.getState().state).toBe("tracking");
    expect(stabilizer.getState().sampleCount).toBeLessThan(50);
    stabilizer.dispose();
  });
});
