import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const cadenceMock = vi.hoisted(() => ({
  shouldReduce: false,
  startCalls: /** @type {HTMLElement[]} */ ([]),
  stop: vi.fn(),
}));

vi.mock("./radarSweepCadence.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    shouldReduceRadarSweepCadence: () => cadenceMock.shouldReduce,
    getRadarSweepPeriodMs: () => 12_000,
    startCappedRadarSweep: (element, options) => {
      cadenceMock.startCalls.push(element);
      const stop = actual.startCappedRadarSweep(element, options);
      return () => {
        cadenceMock.stop();
        stop();
      };
    },
  };
});

import RiskRadar from "./RiskRadar.jsx";
import { RADAR_SWEEP_CADENCE_CLASS } from "./radarSweepCadence.js";

describe("Step 4 RiskRadar integration", () => {
  beforeEach(() => {
    cadenceMock.shouldReduce = false;
    cadenceMock.startCalls = [];
    cadenceMock.stop.mockClear();
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      const id = 1;
      queueMicrotask(() => cb(0));
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("desktop cadence remains uncapped", () => {
    cadenceMock.shouldReduce = false;
    render(<RiskRadar />);
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
    expect(cadenceMock.startCalls).toHaveLength(0);
    expect(document.querySelector(`.${RADAR_SWEEP_CADENCE_CLASS}`)).toBeNull();
  });

  it("mobile cadence starts exactly one capped sweep loop", () => {
    cadenceMock.shouldReduce = true;
    render(<RiskRadar />);
    expect(cadenceMock.startCalls).toHaveLength(1);
    expect(cadenceMock.startCalls[0].classList.contains("radar-sweep")).toBe(true);
    expect(document.querySelector(`.${RADAR_SWEEP_CADENCE_CLASS}`)).toBeTruthy();
  });

  it("cleans up the capped loop on unmount", () => {
    cadenceMock.shouldReduce = true;
    const { unmount } = render(<RiskRadar />);
    expect(cadenceMock.startCalls).toHaveLength(1);
    unmount();
    expect(cadenceMock.stop).toHaveBeenCalledTimes(1);
  });
});
