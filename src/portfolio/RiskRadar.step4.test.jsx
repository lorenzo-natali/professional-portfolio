import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
    getRadarSweepPeriodMs: () => actual.RADAR_SWEEP_MOBILE_PERIOD_MS,
    startCappedRadarSweep: (element, options) => {
      cadenceMock.startCalls.push(element);
      const stop = actual.startCappedRadarSweep(element, {
        ...options,
        periodMs: options?.periodMs ?? actual.RADAR_SWEEP_MOBILE_PERIOD_MS,
      });
      return () => {
        cadenceMock.stop();
        stop();
      };
    },
  };
});

import RiskRadar from "./RiskRadar.jsx";
import {
  RADAR_SWEEP_CADENCE_CLASS,
  RADAR_SWEEP_MOBILE_PERIOD_MS,
} from "./radarSweepCadence.js";

describe("Step 4–5 RiskRadar integration", () => {
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

  it("desktop cadence remains uncapped and without the lighter sweep class", () => {
    cadenceMock.shouldReduce = false;
    render(<RiskRadar />);
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
    expect(cadenceMock.startCalls).toHaveLength(0);
    expect(document.querySelector(`.${RADAR_SWEEP_CADENCE_CLASS}`)).toBeNull();
  });

  it("mobile applies the cadence-capped visual class with a 24s period constant", () => {
    expect(RADAR_SWEEP_MOBILE_PERIOD_MS).toBe(24_000);
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

  it("exposes the selected view and uses the Expertise section label", () => {
    render(<RiskRadar />);

    const riskMap = screen.getByRole("button", { name: "Risk Exposure" });
    const journey = screen.getByRole("button", { name: "Career Timeline" });
    expect(riskMap).toHaveAttribute("aria-pressed", "true");
    expect(journey).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "Expertise" })).toHaveAttribute(
      "href",
      "#capabilities"
    );
    expect(screen.queryByText("Professional Capabilities")).toBeNull();

    fireEvent.click(journey);
    expect(riskMap).toHaveAttribute("aria-pressed", "false");
    expect(journey).toHaveAttribute("aria-pressed", "true");
  });
});
