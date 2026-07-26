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
    // Do not fake rAF — Vitest's timer mock would swallow our queue-based driver.
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
    stabilizeDelayMs: 50,
    outlineMs: 0,
    riseMs: 100,
    tiltMs: 0,
    flipMs: 0,
    settleMs: 0,
    loseFadeMs: 40,
    lostJitterMs: 200,
    sessionResetMs: 400,
  };

  it("rises along document-local Z and finishes once after stabilize", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    expect(animation.getState().phase).toBe("stabilizing");
    expect(animation.getState().riseAxis).toBe("z");

    advance(50);
    expect(animation.getState().phase).toBe("playing");

    // Mid-entrance duplicate found must not start an overlapping timeline.
    animation.onTargetFound();
    expect(animation.getState().phase).toBe("playing");

    advance(120);
    expect(animation.getState().phase).toBe("idle");
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(card.anim.position.z).toBeCloseTo(PROFESSIONAL_CARD_TRANSFORM.riseHeight, 3);
    expect(card.anim.position.y).toBeCloseTo(0, 5);
    expect(card.frontFace.material.opacity).toBeCloseTo(1, 5);

    animation.dispose();
  });

  it("does not replay the entrance across brief found/lost jitter", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    advance(200);
    expect(animation.getState().entrancePlayed).toBe(true);
    const zAfterEntrance = card.anim.position.z;

    animation.onTargetLost();
    expect(animation.getState().phase).toBe("losing");
    advance(timing.loseFadeMs + 30);
    expect(animation.getState().phase).toBe("lost");
    expect(card.group.visible).toBe(false);

    animation.onTargetFound();
    advance(20);
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(animation.getState().phase).toBe("idle");
    expect(card.group.visible).toBe(true);
    expect(card.anim.position.z).toBeCloseTo(zAfterEntrance, 3);

    animation.dispose();
  });

  it("replays only after sessionResetMs and cleans timers on dispose", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    advance(200);
    animation.onTargetLost();
    advance(timing.loseFadeMs + 10);
    advance(timing.sessionResetMs + 20);
    expect(animation.getState().entrancePlayed).toBe(false);
    expect(animation.getState().sessionActive).toBe(false);

    animation.onTargetFound();
    advance(timing.stabilizeDelayMs + timing.riseMs + 40);
    expect(animation.getState().entrancePlayed).toBe(true);

    animation.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(animation.getState().phase).toBe("hidden");
  });

  it("handles loss during stabilizing and during playing without stale timers", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing,
    });

    animation.onTargetFound();
    expect(animation.getState().phase).toBe("stabilizing");
    animation.onTargetLost();
    expect(animation.getState().phase).toBe("lost");
    advance(timing.stabilizeDelayMs + 20);
    expect(animation.getState().phase).toBe("lost");
    expect(animation.getState().entrancePlayed).toBe(false);

    animation.onTargetFound();
    advance(timing.stabilizeDelayMs + 10);
    expect(animation.getState().phase).toBe("playing");
    animation.onTargetLost();
    advance(timing.loseFadeMs + 20);
    expect(animation.getState().phase).toBe("lost");

    animation.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reduced motion reaches a fully opaque idle pose without flip", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing: { ...timing, flipMs: 0, tiltMs: 0, outlineMs: 0 },
    });

    animation.onTargetFound();
    advance(200);
    const state = animation.getState();
    expect(state.reducedMotion).toBe(true);
    expect(state.timing.flipMs).toBe(0);
    expect(card.group.visible).toBe(true);
    expect(card.frontFace.material.opacity).toBeCloseTo(1, 5);
    expect(card.anim.position.z).toBeCloseTo(card.riseHeight, 3);
    expect(card.anim.rotation.y).toBeCloseTo(card.idleRotation.y, 3);
    expect(Math.abs(card.anim.rotation.y)).toBeLessThan(Math.PI / 2);

    animation.dispose();
  });

  it("progresses by elapsed time, not frame count", () => {
    const animation = createProfessionalCardAnimation(card, {
      reducedMotion: true,
      now: () => nowMs,
      timing: { ...timing, stabilizeDelayMs: 10, riseMs: 100 },
    });

    animation.onTargetFound();
    advance(10);
    expect(animation.getState().phase).toBe("playing");

    // One large time jump should complete the rise without many frames.
    nowMs += 120;
    flushRaf(3);
    expect(animation.getState().phase).toBe("idle");
    expect(card.anim.position.z).toBeCloseTo(card.riseHeight, 3);

    animation.dispose();
  });
});
