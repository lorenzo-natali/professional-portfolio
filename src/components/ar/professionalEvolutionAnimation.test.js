import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createProfessionalEvolutionLayer } from "./createProfessionalEvolutionLayer";
import { createProfessionalEvolutionAnimation } from "./professionalEvolutionAnimation";
import { AR_SESSION_RESET_MS } from "./arSessionTiming";
import { PROFESSIONAL_CARD_STABILIZATION } from "./professionalCardConfig";
import { PROFESSIONAL_EVOLUTION_TIMING } from "./professionalEvolutionConfig";

function shortTiming(overrides = {}) {
  return {
    stabilizeDelayMs: 0,
    totalMs: 200,
    headingFadeMs: 40,
    lineDrawStartMs: 20,
    lineDrawMs: 80,
    stageStartsMs: [40, 70, 100, 130],
    stageFadeMs: 40,
    emphasisStartMs: 150,
    emphasisMs: 40,
    sessionResetMs: AR_SESSION_RESET_MS,
    loseFadeMs: 0,
    ...overrides,
  };
}

function flushFrames(times = 20, stepMs = 16) {
  for (let i = 0; i < times; i += 1) vi.advanceTimersByTime(stepMs);
}

describe("createProfessionalEvolutionAnimation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the entrance once per session and keeps state on brief tracking loss", () => {
    vi.useFakeTimers();
    const layer = createProfessionalEvolutionLayer(THREE);
    const animation = createProfessionalEvolutionAnimation(layer, {
      reducedMotion: true,
      now: () => performance.now(),
    });

    animation.onTargetFound();
    flushFrames(24);

    const afterEntrance = animation.getState();
    expect(afterEntrance.entrancePlayed).toBe(true);
    expect(afterEntrance.sessionActive).toBe(true);
    expect(layer.group.visible).toBe(true);

    animation.onTargetLost();
    expect(animation.getState().phase).toBe("lost");
    expect(layer.group.visible).toBe(true);
    expect(animation.getState().entrancePlayed).toBe(true);

    vi.advanceTimersByTime(200);
    animation.onTargetFound();
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(animation.getState().sessionActive).toBe(true);
    expect(layer.group.visible).toBe(true);

    animation.dispose();
    layer.dispose();
  });

  it("restores the initial state after a full session reset", () => {
    vi.useFakeTimers();
    const layer = createProfessionalEvolutionLayer(THREE);
    const animation = createProfessionalEvolutionAnimation(layer, {
      reducedMotion: true,
      timing: shortTiming({ sessionResetMs: 100, totalMs: 50, emphasisStartMs: 25 }),
    });

    animation.onTargetFound();
    flushFrames(10);
    expect(animation.getState().entrancePlayed).toBe(true);

    animation.onTargetLost();
    vi.advanceTimersByTime(120);
    expect(animation.getState().entrancePlayed).toBe(false);
    expect(animation.getState().sessionActive).toBe(false);
    expect(animation.getState().phase).toBe("hidden");
    expect(layer.group.visible).toBe(false);

    animation.dispose();
    layer.dispose();
  });

  it("cancels RAF on mid-entrance loss and resolves to completed state on reacquisition", () => {
    vi.useFakeTimers();
    const layer = createProfessionalEvolutionLayer(THREE);
    const animation = createProfessionalEvolutionAnimation(layer, {
      timing: shortTiming({ totalMs: 400 }),
      now: () => performance.now(),
    });

    animation.onTargetFound();
    flushFrames(4); // partial entrance
    expect(animation.getState().phase).toBe("playing");
    expect(animation.getState().entrancePlayed).toBe(false);
    expect(layer.line.scale.x).toBeLessThan(1);

    animation.onTargetLost();
    expect(animation.getState().phase).toBe("lost");
    const scaleWhileLost = layer.line.scale.x;

    // No further progress while lost.
    flushFrames(8);
    expect(layer.line.scale.x).toBeCloseTo(scaleWhileLost, 5);
    expect(animation.getState().entrancePlayed).toBe(false);

    animation.onTargetFound();
    expect(animation.getState().phase).toBe("idle");
    expect(animation.getState().entrancePlayed).toBe(true);
    expect(layer.group.visible).toBe(true);
    expect(layer.line.scale.x).toBeCloseTo(1, 2);
    expect(layer.heading.material.opacity).toBeGreaterThan(0.5);

    animation.dispose();
    layer.dispose();
  });

  it("dispose cancels RAF and timers and blocks stale callbacks", () => {
    vi.useFakeTimers();
    const layer = createProfessionalEvolutionLayer(THREE);
    const applySpy = vi.spyOn(layer, "applyProgress");
    const resetSpy = vi.spyOn(layer, "resetVisualState");
    const animation = createProfessionalEvolutionAnimation(layer, {
      timing: shortTiming({ totalMs: 500, sessionResetMs: 200 }),
      now: () => performance.now(),
    });

    animation.onTargetFound();
    flushFrames(2);
    expect(applySpy.mock.calls.length).toBeGreaterThan(0);
    const callsAtDispose = applySpy.mock.calls.length;

    animation.dispose();
    expect(animation.getState().disposed).toBe(true);

    flushFrames(40);
    vi.advanceTimersByTime(1000);

    expect(applySpy.mock.calls.length).toBe(callsAtDispose);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(animation.getState().entrancePlayed).toBe(false);
    expect(animation.getState().sessionActive).toBe(false);

    // Explicit API calls after dispose are no-ops.
    animation.onTargetFound();
    animation.onTargetLost();
    expect(applySpy.mock.calls.length).toBe(callsAtDispose);

    layer.dispose();
  });

  it("dispose during lost window prevents session-reset mutation", () => {
    vi.useFakeTimers();
    const layer = createProfessionalEvolutionLayer(THREE);
    const resetSpy = vi.spyOn(layer, "resetVisualState");
    const animation = createProfessionalEvolutionAnimation(layer, {
      timing: shortTiming({ sessionResetMs: 150 }),
      now: () => performance.now(),
    });

    animation.onTargetFound();
    flushFrames(20);
    expect(animation.getState().entrancePlayed).toBe(true);

    animation.onTargetLost();
    animation.dispose();
    vi.advanceTimersByTime(500);

    expect(resetSpy).not.toHaveBeenCalled();
    expect(layer.group.visible).toBe(true); // dispose does not hide; layer teardown owns mesh

    layer.dispose();
  });
});

describe("shared AR session-reset timing", () => {
  it("keeps stabilizer and Professional Evolution on the same threshold", () => {
    expect(AR_SESSION_RESET_MS).toBe(1400);
    expect(PROFESSIONAL_CARD_STABILIZATION.sessionResetMs).toBe(AR_SESSION_RESET_MS);
    expect(PROFESSIONAL_EVOLUTION_TIMING.sessionResetMs).toBe(AR_SESSION_RESET_MS);
  });
});
