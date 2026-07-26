import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createProfessionalCard3D, getCardOpacity } from "./createProfessionalCard3D";
import { createProfessionalCardAnimation } from "./professionalCardAnimation";
import { createAnchorPoseStabilizer } from "./createAnchorPoseStabilizer";

/**
 * Integration path that mirrors production:
 * MindAR-style anchor (matrixAutoUpdate=false) → presentation → card → anim
 * with acquisition gating the entrance.
 */
describe("Professional Card stabilization integration", () => {
  let nowMs = 0;
  /** @type {Array<{ id: number, cb: FrameRequestCallback }>} */
  let rafQueue;
  let nextRafId = 1;

  beforeEach(() => {
    nowMs = 0;
    rafQueue = [];
    nextRafId = 1;
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      const id = nextRafId;
      nextRafId += 1;
      rafQueue.push({ id, cb });
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id) => {
      rafQueue = rafQueue.filter((entry) => entry.id !== id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function flushRaf(steps = 8) {
    for (let i = 0; i < steps; i += 1) {
      if (!rafQueue.length) break;
      const queue = rafQueue.splice(0, rafQueue.length);
      queue.forEach(({ cb }) => cb(nowMs));
    }
  }

  function writeMindARAnchorMatrix(anchor, { x, y, z, s = 1 }) {
    anchor.matrix.compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(),
      new THREE.Vector3(s, s, s),
    );
    // MindAR leaves TRS properties untouched / default.
    anchor.position.set(0, 0, 0);
    anchor.quaternion.identity();
    anchor.scale.set(1, 1, 1);
    anchor.matrixWorldNeedsUpdate = true;
  }

  function readWorldPose(object) {
    object.updateWorldMatrix(true, true);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    object.matrixWorld.decompose(pos, quat, scale);
    return { pos, quat, scale };
  }

  it("becomes visible after realistic found → acquire → entrance under MindAR matrices", () => {
    const scene = new THREE.Scene();
    const anchor = new THREE.Group();
    anchor.name = "mindar-anchor";
    anchor.matrixAutoUpdate = false;
    anchor.visible = false;
    scene.add(anchor);

    const presentation = new THREE.Group();
    presentation.name = "ar-professional-card-presentation";
    presentation.matrixAutoUpdate = false;
    anchor.add(presentation);

    const card = createProfessionalCard3D(THREE);
    presentation.add(card.group);
    expect(card.group.visible).toBe(false);
    expect(getCardOpacity(card)).toBe(0);

    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing: {
        stabilizeDelayMs: 0,
        outlineMs: 0,
        riseMs: 80,
        tiltMs: 0,
        flipMs: 0,
        settleMs: 0,
        loseFadeMs: 40,
        lostJitterMs: 200,
        sessionResetMs: 400,
      },
    });

    const onReady = vi.fn(() => animation.onTargetFound());
    const stabilizer = createAnchorPoseStabilizer(THREE, {
      rawAnchor: anchor,
      presentation,
      now: () => nowMs,
      onAcquisitionReady: onReady,
      config: {
        acquisitionMs: 60,
        minAcquisitionSamples: 3,
        maxAcquisitionMs: 180,
        translationTauSec: 0.1,
        rotationTauSec: 0.1,
        scaleTauSec: 0.1,
        positionDeadZone: 0.002,
        angularDeadZoneRad: 0.01,
        scaleDeadZone: 0.004,
        reacquisitionBlendMs: 80,
        sessionResetMs: 400,
      },
    });

    // Target found — MindAR would set visible and write world matrix.
    anchor.visible = true;
    writeMindARAnchorMatrix(anchor, { x: 0.4, y: 0.2, z: -1.2, s: 0.9 });
    stabilizer.onTargetFound();
    expect(stabilizer.getState().state).toBe("acquiring");
    expect(onReady).not.toHaveBeenCalled();
    expect(card.group.visible).toBe(false);

    // Several filtered pose updates (render loop).
    for (let i = 0; i < 12; i += 1) {
      nowMs += 16;
      writeMindARAnchorMatrix(anchor, {
        x: 0.4 + (i % 2 === 0 ? 0.0005 : -0.0005),
        y: 0.2,
        z: -1.2,
        s: 0.9,
      });
      stabilizer.update(0.016);
      flushRaf(4);
    }

    expect(onReady).toHaveBeenCalled();
    expect(stabilizer.getState().state).toBe("tracking");

    // Finish entrance.
    nowMs += 120;
    flushRaf(8);

    expect(animation.getState().phase).toBe("idle");
    expect(card.group.visible).toBe(true);
    expect(getCardOpacity(card)).toBeGreaterThan(0.9);
    expect(card.frontFace.visible).toBe(true);
    expect(card.body.visible).toBe(true);

    const world = readWorldPose(card.group);
    expect(Number.isFinite(world.pos.x)).toBe(true);
    expect(Number.isFinite(world.pos.y)).toBe(true);
    expect(Number.isFinite(world.pos.z)).toBe(true);
    expect(world.scale.x).toBeGreaterThan(0.3);
    // Plausible target-relative range near the MindAR anchor pose.
    expect(world.pos.distanceTo(new THREE.Vector3(0.4, 0.2, -1.2))).toBeLessThan(1.5);

    // Anchor tracked matrix must remain intact (not recomposed to identity).
    expect(anchor.matrix.elements[12]).toBeCloseTo(0.4, 2);
    expect(anchor.matrix.elements[14]).toBeCloseTo(-1.2, 2);

    // Remains visible across further filtered updates.
    for (let i = 0; i < 10; i += 1) {
      nowMs += 16;
      writeMindARAnchorMatrix(anchor, { x: 0.41, y: 0.2, z: -1.2, s: 0.9 });
      stabilizer.update(0.016);
    }
    expect(card.group.visible).toBe(true);
    expect(getCardOpacity(card)).toBeGreaterThan(0.9);

    // Brief loss / reacquire must not leave the card permanently hidden.
    stabilizer.onTargetLost();
    animation.onTargetLost();
    nowMs += 50;
    flushRaf(8);

    writeMindARAnchorMatrix(anchor, { x: 0.42, y: 0.21, z: -1.15, s: 0.9 });
    stabilizer.onTargetFound();
    for (let i = 0; i < 8; i += 1) {
      nowMs += 16;
      writeMindARAnchorMatrix(anchor, { x: 0.42, y: 0.21, z: -1.15, s: 0.9 });
      stabilizer.update(0.016);
      flushRaf(4);
    }

    expect(card.group.visible).toBe(true);
    expect(getCardOpacity(card)).toBeGreaterThan(0.5);
    expect(animation.getState().entrancePlayed).toBe(true);

    stabilizer.dispose();
    animation.dispose();
    card.dispose();
  });

  it("invariant: continuously found valid poses force a visible card within maxAcquisitionMs", () => {
    const anchor = new THREE.Group();
    anchor.matrixAutoUpdate = false;
    const presentation = new THREE.Group();
    presentation.matrixAutoUpdate = false;
    anchor.add(presentation);

    const card = createProfessionalCard3D(THREE);
    presentation.add(card.group);

    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing: {
        stabilizeDelayMs: 0,
        outlineMs: 0,
        riseMs: 40,
        tiltMs: 0,
        flipMs: 0,
        settleMs: 0,
        loseFadeMs: 30,
        lostJitterMs: 100,
        sessionResetMs: 300,
      },
    });

    const maxAcquisitionMs = 100;
    const stabilizer = createAnchorPoseStabilizer(THREE, {
      rawAnchor: anchor,
      presentation,
      now: () => nowMs,
      onAcquisitionReady: () => animation.onTargetFound(),
      config: {
        acquisitionMs: 5000,
        minAcquisitionSamples: 1000,
        maxAcquisitionMs,
        translationTauSec: 0.1,
        rotationTauSec: 0.1,
        scaleTauSec: 0.1,
        positionDeadZone: 0.002,
        angularDeadZoneRad: 0.01,
        scaleDeadZone: 0.004,
        reacquisitionBlendMs: 50,
        sessionResetMs: 300,
      },
    });

    anchor.visible = true;
    writeMindARAnchorMatrix(anchor, { x: 1, y: 0, z: -1, s: 1 });
    stabilizer.onTargetFound();

    const deadline = maxAcquisitionMs + 80;
    while (nowMs < deadline) {
      nowMs += 16;
      writeMindARAnchorMatrix(anchor, { x: 1, y: 0, z: -1, s: 1 });
      stabilizer.update(0.016);
      flushRaf(4);
    }

    expect(card.group.visible).toBe(true);
    expect(getCardOpacity(card)).toBeGreaterThan(0);
    expect(stabilizer.getState().readyNotified).toBe(true);

    stabilizer.dispose();
    animation.dispose();
    card.dispose();
  });
});
