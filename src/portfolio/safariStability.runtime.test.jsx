import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, cleanup } from "@testing-library/react";
import { StrictMode } from "react";
import TickerStream from "./TickerStream.jsx";
import {
  getTickerScheduler,
  getTickerSchedulerDiagnostics,
  resetTickerSchedulerForTests,
} from "./createTickerScheduler.js";
import { applyIosStabilityProfile, isIosWebKit } from "./iosStability.js";

const sampleStream = {
  label: "Signals",
  accent: "cyan",
  direction: "left",
  items: ["Alpha", "Beta", "Gamma"],
};

describe("createTickerScheduler ownership", () => {
  /** @type {Array<(entries: IntersectionObserverEntry[]) => void>} */
  let ioCallbacks = [];

  beforeEach(() => {
    resetTickerSchedulerForTests();
    ioCallbacks = [];

    class MockIO {
      constructor(cb) {
        this.cb = cb;
        ioCallbacks.push(cb);
      }
      observe(el) {
        this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }]);
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", MockIO);

    class MockRO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", MockRO);

    let rafQueue = [];
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      const id = rafQueue.length + 1;
      rafQueue.push({ id, cb });
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id) => {
      rafQueue = rafQueue.filter((item) => item.id !== id);
    });
    // Expose for tests that need to drain
    window.__testDrainRaf = () => {
      const batch = [...rafQueue];
      rafQueue = [];
      batch.forEach(({ cb, id }) => {
        // re-queue pattern: scheduler schedules next frame inside tick
        cb(performance.now());
        // keep pending ids tracked loosely
        void id;
      });
    };
  });

  afterEach(() => {
    cleanup();
    resetTickerSchedulerForTests();
    vi.unstubAllGlobals();
    delete window.__testDrainRaf;
    delete document.documentElement.dataset.iosStability;
  });

  it("full-top-half style: multiple tickers share at most one active scheduler", () => {
    render(
      <>
        <TickerStream stream={{ ...sampleStream, label: "A" }} />
        <TickerStream stream={{ ...sampleStream, label: "B", accent: "violet" }} />
      </>,
    );

    const diag = getTickerSchedulerDiagnostics();
    expect(diag.subscriberCount).toBe(2);
    expect(diag.activeSchedulerCount).toBeLessThanOrEqual(1);
    // With visible subscribers the shared loop is scheduled
    expect(diag.activeSchedulerCount).toBe(1);
  });

  it("pauses the shared rAF when all ticker tracks are offscreen", () => {
    render(
      <>
        <TickerStream stream={{ ...sampleStream, label: "A" }} />
        <TickerStream stream={{ ...sampleStream, label: "B" }} />
      </>,
    );

    expect(getTickerSchedulerDiagnostics().activeSchedulerCount).toBe(1);

    act(() => {
      // Simulate IntersectionObserver reporting both offscreen
      for (const cb of ioCallbacks) {
        const els = document.querySelectorAll("[data-ticker-stream] .flex.w-max");
        els.forEach((target) => {
          cb([{ isIntersecting: false, intersectionRatio: 0, target }]);
        });
      }
    });

    expect(getTickerSchedulerDiagnostics().activeSchedulerCount).toBe(0);
    expect(getTickerSchedulerDiagnostics().visibleCount).toBe(0);
  });

  it("does not duplicate global scheduler ownership after StrictMode remount", () => {
    const { unmount } = render(
      <StrictMode>
        <TickerStream stream={sampleStream} />
        <TickerStream stream={{ ...sampleStream, label: "B" }} />
      </StrictMode>,
    );

    const mid = getTickerSchedulerDiagnostics();
    expect(mid.subscriberCount).toBe(2);
    expect(mid.activeSchedulerCount).toBe(1);

    unmount();
    expect(getTickerSchedulerDiagnostics().subscriberCount).toBe(0);
    expect(getTickerSchedulerDiagnostics().activeSchedulerCount).toBe(0);

    // Fresh mount after remount still a single owner
    render(
      <StrictMode>
        <TickerStream stream={sampleStream} />
      </StrictMode>,
    );
    expect(getTickerSchedulerDiagnostics().subscriberCount).toBe(1);
    expect(getTickerSchedulerDiagnostics().activeSchedulerCount).toBe(1);
    expect(getTickerScheduler()).toBe(getTickerScheduler());
  });
});

describe("iOS stability profile", () => {
  afterEach(() => {
    delete document.documentElement.dataset.iosStability;
    delete window.__portfolioIosStability;
  });

  it("detects iPhone Safari UA and sets data-ios-stability", () => {
    expect(
      isIosWebKit(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
    expect(isIosWebKit("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120")).toBe(
      false,
    );
  });

  it("applyIosStabilityProfile writes the html attribute when active", () => {
    const orig = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(applyIosStabilityProfile()).toBe(true);
    expect(document.documentElement.dataset.iosStability).toBe("1");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => orig,
    });
  });
});
