import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createProfessionalCard3D, getCardOpacity } from "./createProfessionalCard3D";
import { createProfessionalCardAnimation } from "./professionalCardAnimation";
import { createAnchorPoseStabilizer } from "./createAnchorPoseStabilizer";
import { createCardGestureController } from "./createCardGestureController";

describe("Professional Card stabilization + interaction integration", () => {
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
    anchor.position.set(0, 0, 0);
    anchor.quaternion.identity();
    anchor.scale.set(1, 1, 1);
    anchor.matrixWorldNeedsUpdate = true;
  }

  it("becomes visible, stays still after entrance, and keeps gestures off the raw anchor", () => {
    const scene = new THREE.Scene();
    const anchor = new THREE.Group();
    anchor.matrixAutoUpdate = false;
    anchor.visible = false;
    scene.add(anchor);

    const presentation = new THREE.Group();
    presentation.name = "ar-professional-card-presentation";
    presentation.matrixAutoUpdate = false;
    anchor.add(presentation);

    const card = createProfessionalCard3D(THREE);
    presentation.add(card.group);

    const dom = document.createElement("div");
    document.body.appendChild(dom);
    dom.setPointerCapture = vi.fn();
    dom.releasePointerCapture = vi.fn();

    const gestures = createCardGestureController({
      domElement: dom,
      interaction: card.interaction,
      initialRotation: card.initialRotation,
      initialScale: card.initialScale,
    });

    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing: {
        stabilizeDelayMs: 0,
        riseMs: 80,
        loseFadeMs: 40,
        lostJitterMs: 200,
        sessionResetMs: 400,
      },
      onSessionReset: () => gestures.reset(),
    });

    const stabilizer = createAnchorPoseStabilizer(THREE, {
      rawAnchor: anchor,
      presentation,
      now: () => nowMs,
      onAcquisitionReady: () => animation.onTargetFound(),
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

    const tracked = new THREE.Matrix4().compose(
      new THREE.Vector3(0.4, 0.2, -1.2),
      new THREE.Quaternion(),
      new THREE.Vector3(0.9, 0.9, 0.9),
    );

    anchor.visible = true;
    writeMindARAnchorMatrix(anchor, { x: 0.4, y: 0.2, z: -1.2, s: 0.9 });
    stabilizer.onTargetFound();

    for (let i = 0; i < 12; i += 1) {
      nowMs += 16;
      writeMindARAnchorMatrix(anchor, { x: 0.4, y: 0.2, z: -1.2, s: 0.9 });
      stabilizer.update(0.016);
      flushRaf(4);
    }

    nowMs += 120;
    flushRaf(8);
    expect(animation.getState().phase).toBe("idle");
    expect(card.group.visible).toBe(true);
    expect(getCardOpacity(card)).toBeGreaterThan(0.9);
    expect(card.anim.rotation.y).toBeCloseTo(0, 5);

    // User gesture — must not mutate MindAR matrix.
    const beforeAnchor = anchor.matrix.clone();
    const fire = (type, props) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, props);
      dom.dispatchEvent(event);
    };
    fire("pointerdown", { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50, button: 0 });
    fire("pointermove", { pointerId: 1, pointerType: "touch", clientX: 60, clientY: 50 });
    fire("pointermove", { pointerId: 1, pointerType: "touch", clientX: 110, clientY: 30 });

    expect(card.interaction.rotation.y).not.toBeCloseTo(card.initialRotation.y, 3);
    expect(anchor.matrix.equals(beforeAnchor)).toBe(true);
    expect(anchor.matrix.elements[12]).toBeCloseTo(0.4, 2);

    // Brief loss preserves user orientation.
    const userY = card.interaction.rotation.y;
    stabilizer.onTargetLost();
    animation.onTargetLost();
    nowMs += 50;
    flushRaf(8);
    writeMindARAnchorMatrix(anchor, { x: 0.42, y: 0.21, z: -1.15, s: 0.9 });
    stabilizer.onTargetFound();
    for (let i = 0; i < 8; i += 1) {
      nowMs += 16;
      stabilizer.update(0.016);
      flushRaf(4);
    }
    expect(card.interaction.rotation.y).toBeCloseTo(userY, 5);
    expect(card.group.visible).toBe(true);

    // Full session reset restores defaults.
    stabilizer.onTargetLost();
    animation.onTargetLost();
    for (let i = 0; i < 8; i += 1) {
      nowMs += 16;
      flushRaf(4);
    }
    expect(animation.getState().phase).toBe("lost");
    vi.advanceTimersByTime(450);
    expect(card.interaction.rotation.y).toBeCloseTo(card.initialRotation.y, 5);

    gestures.dispose();
    stabilizer.dispose();
    animation.dispose();
    card.dispose();
    dom.remove();
    void tracked;
  });
});
