import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AR_DISCOVERY_PROMPT_DELAY_MS,
  AR_STATUS_COPY,
  AR_TARGET_LOSS_GRACE_MS,
  createArStatusOnboarding,
} from "./arStatusOnboarding";

describe("createArStatusOnboarding", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in searching with the looking-for-CV copy", () => {
    const onboarding = createArStatusOnboarding();
    expect(onboarding.getPhase()).toBe("searching");
    expect(AR_STATUS_COPY.searching).toBe(
      "Point your camera at the first page of my CV",
    );
    onboarding.dispose();
  });

  it("shows CV detected on found, then the discovery prompt after 1250ms", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    const phases = [];
    onboarding.subscribe((phase) => phases.push(phase));

    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");
    expect(AR_STATUS_COPY.detected).toBe("CV detected");

    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS - 1);
    expect(onboarding.getPhase()).toBe("detected");

    vi.advanceTimersByTime(1);
    expect(onboarding.getPhase()).toBe("prompt");
    expect(AR_STATUS_COPY.promptTitle).toBe("A few things I love beyond work");
    expect(AR_STATUS_COPY.promptHint).toBe("Tap an object to discover more");
    expect(AR_STATUS_COPY.promptHintSecondary).toBe("Drag to rotate");
    expect(onboarding).not.toHaveProperty("onInterestInteract");
    expect(phases).not.toContain("dismissed");
    expect(phases).not.toContain("idle");

    onboarding.dispose();
  });

  it("ignores a loss shorter than the grace period", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetLost();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS - 1);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.dispose();
  });

  it("can still advance to prompt if the delay elapses during a brief loss grace", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS - 100);
    expect(onboarding.getPhase()).toBe("detected");

    onboarding.onTargetLost();
    vi.advanceTimersByTime(100);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.dispose();
  });

  it("returns to searching after a confirmed loss of at least 500ms", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetLost();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("searching");

    onboarding.dispose();
  });

  it("restarts detected → prompt after a confirmed loss and reacquire", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    onboarding.onTargetLost();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("searching");

    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.dispose();
  });

  it("cancels a pending prompt timer when loss is confirmed", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");

    onboarding.onTargetLost();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("searching");

    // Stale prompt timer must not fire later.
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("searching");

    onboarding.dispose();
  });

  it("does not create stale transitions from repeated found/lost bursts", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();

    onboarding.onTargetFound();
    onboarding.onTargetLost();
    onboarding.onTargetFound();
    onboarding.onTargetLost();
    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");

    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetLost();
    onboarding.onTargetLost();
    vi.advanceTimersByTime(AR_TARGET_LOSS_GRACE_MS);
    expect(onboarding.getPhase()).toBe("searching");

    onboarding.dispose();
  });

  it("clears all timers on dispose so late callbacks are inert", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    const phases = [];
    onboarding.subscribe((phase) => phases.push(phase));

    onboarding.onTargetFound();
    onboarding.onTargetLost();
    onboarding.dispose();

    const afterDispose = phases.length;
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS + AR_TARGET_LOSS_GRACE_MS);
    expect(phases.length).toBe(afterDispose);
  });
});
