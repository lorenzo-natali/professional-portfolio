import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import TickerStream from "./TickerStream.jsx";
import {
  getTickerFrameSchedulerDiagnostics,
  subscribeTickerFrame,
} from "./createTickerFrameScheduler.js";
import {
  getTickerVisibilityObserverDiagnostics,
  resetTickerVisibilityObserverForTests,
} from "./createTickerVisibilityObserver.js";
import { getTickerResizeObserverDiagnostics } from "./createTickerResizeObserver.js";

const sampleStream = {
  label: "Signals",
  accent: "cyan",
  direction: "left",
  items: ["Alpha", "Beta", "Gamma"],
};

describe("Step 3 ticker offscreen pause", () => {
  /** @type {Array<(entries: IntersectionObserverEntry[]) => void>} */
  let ioCallbacks = [];

  beforeEach(() => {
    resetTickerVisibilityObserverForTests();
    ioCallbacks = [];

    class MockIO {
      constructor(cb) {
        this.cb = cb;
        ioCallbacks.push(cb);
      }
      observe(el) {
        // First delivery: intersecting (matches optimistic start + observer settle).
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
  });

  afterEach(() => {
    cleanup();
    resetTickerVisibilityObserverForTests();
    vi.unstubAllGlobals();
  });

  it("uses one shared IntersectionObserver for multiple tickers", () => {
    render(
      <>
        <TickerStream stream={{ ...sampleStream, label: "A" }} />
        <TickerStream stream={{ ...sampleStream, label: "B", accent: "violet" }} />
      </>,
    );

    expect(getTickerVisibilityObserverDiagnostics().activeObserverCount).toBe(1);
    expect(getTickerVisibilityObserverDiagnostics().subscriberCount).toBe(2);
    expect(getTickerFrameSchedulerDiagnostics().activeSchedulerCount).toBe(1);
    expect(getTickerResizeObserverDiagnostics().activeObserverCount).toBeLessThanOrEqual(1);
  });

  it("pauses frame work while non-intersecting and resumes while intersecting", () => {
    render(<TickerStream stream={sampleStream} />);
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(1);

    const root = document.querySelector(".ticker-stream");
    expect(root).toBeTruthy();

    act(() => {
      for (const cb of ioCallbacks) {
        cb([{ isIntersecting: false, intersectionRatio: 0, target: root }]);
      }
    });
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(0);
    expect(getTickerFrameSchedulerDiagnostics().activeSchedulerCount).toBe(0);

    act(() => {
      for (const cb of ioCallbacks) {
        cb([{ isIntersecting: true, intersectionRatio: 1, target: root }]);
      }
    });
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(1);
    expect(getTickerFrameSchedulerDiagnostics().activeSchedulerCount).toBe(1);
  });

  it("cleans up visibility and frame subscriptions on unmount", () => {
    const { unmount } = render(<TickerStream stream={sampleStream} />);
    expect(getTickerVisibilityObserverDiagnostics().subscriberCount).toBe(1);
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(1);

    unmount();
    expect(getTickerVisibilityObserverDiagnostics().subscriberCount).toBe(0);
    expect(getTickerVisibilityObserverDiagnostics().activeObserverCount).toBe(0);
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(0);
    expect(getTickerFrameSchedulerDiagnostics().activeSchedulerCount).toBe(0);
  });

  it("does not create duplicate frame subscriptions while remaining visible", () => {
    render(<TickerStream stream={sampleStream} />);
    const root = document.querySelector(".ticker-stream");

    act(() => {
      for (const cb of ioCallbacks) {
        cb([{ isIntersecting: true, intersectionRatio: 1, target: root }]);
        cb([{ isIntersecting: true, intersectionRatio: 1, target: root }]);
      }
    });

    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(1);
  });

  it("keeps Step 1 shared rAF singleton behaviour", () => {
    const calls = [];
    const unsub = subscribeTickerFrame((t) => calls.push(t));
    expect(getTickerFrameSchedulerDiagnostics().activeSchedulerCount).toBe(1);
    unsub();
    expect(getTickerFrameSchedulerDiagnostics().subscriberCount).toBe(0);
  });
});
