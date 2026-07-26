import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createProfessionalCard3D } from "./createProfessionalCard3D";
import { createProfessionalCardAnimation } from "./professionalCardAnimation";
import { PROFESSIONAL_CARD_TRANSFORM } from "./professionalCardConfig";

describe("professionalCardAnimation lifecycle", () => {
  let nowMs = 0;
  let card;
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
    card = createProfessionalCard3D(THREE);
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

  function advance(ms) {
    const step = 16;
    let remaining = ms;
    while (remaining > 0) {
      const chunk = Math.min(step, remaining);
      nowMs += chunk;
      vi.advanceTimersByTime(chunk);
      flushRaf(8);
      remaining -= chunk;
    }
  }

  const timing = {
    stabilizeDelayMs: 0,
    riseMs: 100,
    loseFadeMs: 40,
    lostJitterMs: 200,
    sessionResetMs: 400,
  };

  it("rises along document-local Z into a stable front-readable pose", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    const interactionBefore = {
      x: card.interaction.rotation.x,
      y: card.interaction.rotation.y,
      scale: card.interaction.scale.x,
    };

    animation.onTargetFound();
    expect(animation.getState().phase).toBe("playing");
    expect(animation.getState().riseAxis).toBe("z");

    advance(140);
    expect(animation.getState().phase).toBe("idle");
    expect(card.anim.position.z).toBeCloseTo(PROFESSIONAL_CARD_TRANSFORM.riseHeight, 3);
    expect(card.anim.position.y).toBeCloseTo(0, 5);
    expect(card.anim.rotation.x).toBeCloseTo(0, 5);
    expect(card.anim.rotation.y).toBeCloseTo(0, 5);
    expect(card.frontFace.material.opacity).toBeCloseTo(1, 5);

    // Entrance must not rewrite the user interaction transform.
    expect(card.interaction.rotation.x).toBeCloseTo(interactionBefore.x, 5);
    expect(card.interaction.rotation.y).toBeCloseTo(interactionBefore.y, 5);
    expect(card.interaction.scale.x).toBeCloseTo(interactionBefore.scale, 5);

    animation.dispose();
  });

  it("does not automatically rotate the card after entrance", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    advance(160);
    const pose = {
      animX: card.anim.rotation.x,
      animY: card.anim.rotation.y,
      interactionX: card.interaction.rotation.x,
      interactionY: card.interaction.rotation.y,
      z: card.anim.position.z,
    };

    advance(400);
    expect(card.anim.rotation.x).toBeCloseTo(pose.animX, 5);
    expect(card.anim.rotation.y).toBeCloseTo(pose.animY, 5);
    expect(card.interaction.rotation.x).toBeCloseTo(pose.interactionX, 5);
    expect(card.interaction.rotation.y).toBeCloseTo(pose.interactionY, 5);
    expect(card.anim.position.z).toBeCloseTo(pose.z, 5);
    expect(rafQueue.length).toBe(0);

    animation.dispose();
  });

  it("preserves user interaction pose across brief loss and resets on session timeout", () => {
    const onSessionReset = vi.fn(() => card.resetInteractionPose());
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
      onSessionReset,
    });

    animation.onTargetFound();
    advance(160);
    card.interaction.rotation.y = 0.55;
    card.interaction.scale.setScalar(1.35);

    animation.onTargetLost();
    advance(timing.loseFadeMs + 20);
    expect(animation.getState().phase).toBe("lost");
    expect(card.interaction.rotation.y).toBeCloseTo(0.55, 5);
    expect(card.interaction.scale.x).toBeCloseTo(1.35, 5);

    animation.onTargetFound();
    advance(20);
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(card.group.visible).toBe(true);
    expect(card.interaction.rotation.y).toBeCloseTo(0.55, 5);
    expect(card.interaction.scale.x).toBeCloseTo(1.35, 5);

    animation.onTargetLost();
    advance(timing.loseFadeMs + 30);
    expect(animation.getState().phase).toBe("lost");
    // Session-reset timer starts only after soft-hide completes.
    vi.advanceTimersByTime(timing.sessionResetMs + 20);
    expect(onSessionReset).toHaveBeenCalled();
    expect(card.interaction.rotation.y).toBeCloseTo(card.initialRotation.y, 5);
    expect(card.interaction.scale.x).toBeCloseTo(card.initialScale, 5);

    animation.dispose();
  });

  it("does not replay the entrance across brief found/lost jitter", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    advance(160);
    expect(animation.getState().entrancePlayed).toBe(true);

    animation.onTargetLost();
    advance(timing.loseFadeMs + 20);
    animation.onTargetFound();
    advance(20);
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(animation.getState().phase).toBe("idle");

    animation.dispose();
  });
});
