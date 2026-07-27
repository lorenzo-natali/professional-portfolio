import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AR_DISCOVERY_PROMPT_DELAY_MS,
  AR_STATUS_COPY,
  createArStatusOnboarding,
} from "./arStatusOnboarding";

describe("createArStatusOnboarding", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows CV detected first, then the discovery prompt after the delay", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    const phases = [];
    onboarding.subscribe((phase) => phases.push(phase));

    expect(onboarding.getPhase()).toBe("idle");
    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");
    expect(AR_STATUS_COPY.detected).toBe("CV detected");

    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS - 1);
    expect(onboarding.getPhase()).toBe("detected");

    vi.advanceTimersByTime(1);
    expect(onboarding.getPhase()).toBe("prompt");
    expect(AR_STATUS_COPY.promptTitle).toBe("A few things I love beyond work");
    expect(AR_STATUS_COPY.promptHint).toBe("Tap an object to discover more");
    expect(onboarding).not.toHaveProperty("onInterestInteract");
    expect(phases).not.toContain("dismissed");

    onboarding.dispose();
    expect(phases.at(-1)).toBe("prompt");
  });

  it("keeps the prompt for the rest of the session with no dismissed state", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    // Object taps are unrelated to onboarding — API has no dismiss path.
    expect(typeof onboarding.onInterestInteract).toBe("undefined");
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.dispose();
  });

  it("does not restart the sequence on temporary target loss / reacquire", () => {
    vi.useFakeTimers();
    const onboarding = createArStatusOnboarding();
    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("detected");

    onboarding.onTargetLost();
    expect(onboarding.getPhase()).toBe("detected");

    vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.onTargetLost();
    onboarding.onTargetFound();
    onboarding.onTargetLost();
    onboarding.onTargetFound();
    expect(onboarding.getPhase()).toBe("prompt");

    onboarding.dispose();
  });
});
