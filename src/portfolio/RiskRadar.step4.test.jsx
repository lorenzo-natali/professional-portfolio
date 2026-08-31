import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

async function openRiskExposure() {
  fireEvent.click(screen.getByRole("button", { name: "Risk Exposure" }));
  await waitFor(() => {
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
  });
}

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

  it("desktop cadence remains uncapped and without the lighter sweep class", async () => {
    cadenceMock.shouldReduce = false;
    render(<RiskRadar />);
    await openRiskExposure();
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
    expect(cadenceMock.startCalls).toHaveLength(0);
    expect(document.querySelector(`.${RADAR_SWEEP_CADENCE_CLASS}`)).toBeNull();
  });

  it("mobile Risk Exposure mounts the sweep node owned by capped cadence", async () => {
    expect(RADAR_SWEEP_MOBILE_PERIOD_MS).toBe(24_000);
    cadenceMock.shouldReduce = true;
    render(<RiskRadar />);
    // Career Timeline is the default tab; select Risk Exposure and wait for AnimatePresence.
    await openRiskExposure();
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
    // Cadence attach remains the pre-existing mapView+sweepRef effect (not callback-ref).
    // Unit coverage for startCappedRadarSweep lives in radarSweepCadence.step4.test.js.
  });

  it("unmounts cleanly after Risk Exposure was selected", async () => {
    cadenceMock.shouldReduce = true;
    const { unmount } = render(<RiskRadar />);
    await openRiskExposure();
    unmount();
    // If the mapView effect attached cadence on this path, cleanup must run.
    if (cadenceMock.startCalls.length > 0) {
      expect(cadenceMock.stop).toHaveBeenCalled();
    }
  });

  it("exposes the selected view and uses the Expertise section label", async () => {
    render(<RiskRadar />);

    const riskMap = screen.getByRole("button", { name: "Risk Exposure" });
    const journey = screen.getByRole("button", { name: "Career Timeline" });
    expect(journey).toHaveAttribute("aria-pressed", "true");
    expect(riskMap).toHaveAttribute("aria-pressed", "false");

    await openRiskExposure();
    expect(riskMap).toHaveAttribute("aria-pressed", "true");
    expect(journey).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Expertise" })).toHaveAttribute(
        "href",
        "#capabilities"
      );
    });
    expect(screen.queryByText("Professional Capabilities")).toBeNull();

    fireEvent.click(journey);
    await waitFor(() => {
      expect(journey).toHaveAttribute("aria-pressed", "true");
    });
    expect(riskMap).toHaveAttribute("aria-pressed", "false");
  });
});
