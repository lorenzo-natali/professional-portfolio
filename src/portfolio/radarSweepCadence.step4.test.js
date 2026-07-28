import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RADAR_SWEEP_CADENCE_CLASS,
  RADAR_SWEEP_MOBILE_FRAME_MS,
  RADAR_SWEEP_MOBILE_PERIOD_MS,
  getRadarSweepPeriodMs,
  shouldReduceRadarSweepCadence,
  startCappedRadarSweep,
} from "./radarSweepCadence.js";

describe("Step 4–5 radar sweep cadence helpers", () => {
  /** @type {Array<(time: number) => void>} */
  let rafCallbacks = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      rafId += 1;
      rafCallbacks = [cb];
      return rafId;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      rafCallbacks = [];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll(".radar-sweep").forEach((el) => el.remove());
  });

  it("does not activate cadence reduction on desktop-sized non-iPhone viewports", () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)" },
    };
    expect(shouldReduceRadarSweepCadence(win)).toBe(false);
  });

  it("activates on the existing mobile radar breakpoint (max-width: 639px)", () => {
    const win = {
      matchMedia: (query) => ({
        matches: query.includes("max-width: 639px"),
      }),
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 14)" },
    };
    expect(shouldReduceRadarSweepCadence(win)).toBe(true);
  });

  it("activates on iPhone even when wider than 639px (landscape)", () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    };
    expect(shouldReduceRadarSweepCadence(win)).toBe(true);
  });

  it("uses a consistent ~24s mobile sweep period", () => {
    expect(RADAR_SWEEP_MOBILE_PERIOD_MS).toBe(24_000);
    expect(getRadarSweepPeriodMs()).toBe(24_000);
    expect(
      getRadarSweepPeriodMs({
        matchMedia: () => ({ matches: true }),
      }),
    ).toBe(24_000);
    expect(
      getRadarSweepPeriodMs({
        matchMedia: () => ({ matches: false }),
      }),
    ).toBe(24_000);
  });

  it("caps transform updates to ~30 FPS and cleans up the single rAF loop", () => {
    const el = document.createElement("div");
    el.className = "radar-sweep";
    document.body.appendChild(el);

    const stop = startCappedRadarSweep(el, {
      periodMs: RADAR_SWEEP_MOBILE_PERIOD_MS,
      frameIntervalMs: RADAR_SWEEP_MOBILE_FRAME_MS,
    });

    expect(el.classList.contains(RADAR_SWEEP_CADENCE_CLASS)).toBe(true);
    expect(rafCallbacks).toHaveLength(1);

    rafCallbacks[0](0);
    expect(el.style.transform).toBe("rotate(0deg)");

    const mid = rafCallbacks[0];
    mid(10);
    expect(el.style.transform).toBe("rotate(0deg)");

    rafCallbacks[0](1000);
    expect(el.style.transform).toBe(
      `rotate(${(1000 / RADAR_SWEEP_MOBILE_PERIOD_MS) * 360}deg)`,
    );

    stop();
    expect(el.classList.contains(RADAR_SWEEP_CADENCE_CLASS)).toBe(false);
    expect(el.style.transform).toBe("");
    expect(rafCallbacks).toHaveLength(0);
  });

  it("does not accumulate duplicate rAF loops from a single start", () => {
    const el = document.createElement("div");
    const stop = startCappedRadarSweep(el, {
      periodMs: RADAR_SWEEP_MOBILE_PERIOD_MS,
    });
    expect(rafCallbacks).toHaveLength(1);
    rafCallbacks[0](0);
    expect(rafCallbacks).toHaveLength(1);
    stop();
    expect(rafCallbacks).toHaveLength(0);
  });
});
