import { describe, expect, it, vi, afterEach } from "vitest";
import { StrictMode } from "react";
import { render, waitFor, act } from "@testing-library/react";
import ARTrackingScene from "./ARTrackingScene";

const start = vi.fn();
const stop = vi.fn();

vi.mock("./tracking/useARTracking", () => ({
  useARTracking: () => ({
    adapter: {
      start,
      stop,
      isRunning: () => false,
    },
  }),
}));

describe("ARTrackingScene container", () => {
  afterEach(() => {
    start.mockReset();
    stop.mockReset();
  });

  it("is transparent so it cannot hide the MindAR video", () => {
    const { container } = render(
      <ARTrackingScene
        active={false}
        onReady={vi.fn()}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );

    const tracking = container.querySelector("[data-ar-tracking-container='true']");
    expect(tracking).toBeTruthy();
    expect(tracking.className).toContain("ar-tracking-container");
    expect(tracking.className).not.toMatch(/\bbg-black\b/);
    expect(tracking.className).not.toMatch(/\bbg-slate-/);
  });

  it("starts the adapter once when active and awaits stop on unmount without clearing DOM early", async () => {
    let resolveStop;
    const stopDone = new Promise((resolve) => {
      resolveStop = resolve;
    });
    start.mockResolvedValue(undefined);
    stop.mockImplementation(() => stopDone);

    const { unmount, container } = render(
      <ARTrackingScene
        active
        onReady={vi.fn()}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );

    expect(start).toHaveBeenCalledTimes(1);
    const tracking = container.querySelector("[data-ar-tracking-container='true']");
    tracking.innerHTML = "<video></video><canvas></canvas>";

    unmount();
    expect(stop).toHaveBeenCalled();
    // DOM must not be wiped by React before adapter stop settles.
    expect(tracking.innerHTML).toContain("video");

    await act(async () => {
      resolveStop();
      await stopDone;
    });
    await waitFor(() => {
      // Unmount stop + optional late-start then(stop) when settlement races cancel.
      expect(stop.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("Close/unmount during async start suppresses late onReady via cancelled guard", async () => {
    let resolveStart;
    const startGate = new Promise((resolve) => {
      resolveStart = resolve;
    });
    const onReady = vi.fn();
    const onError = vi.fn();
    start.mockImplementation((_container, callbacks) =>
      startGate.then(() => {
        callbacks.onReady?.();
        callbacks.onError?.(new Error("late"));
      }),
    );
    stop.mockResolvedValue(undefined);

    const { unmount } = render(
      <ARTrackingScene
        active
        onReady={onReady}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={onError}
        onUnsupported={vi.fn()}
      />,
    );

    expect(start).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      resolveStart();
      await startGate;
    });

    await waitFor(() => {
      expect(stop).toHaveBeenCalled();
    });
    expect(onReady).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("delayed start completion after unmount triggers stop and ignores callbacks", async () => {
    let resolveStart;
    const startGate = new Promise((resolve) => {
      resolveStart = resolve;
    });
    const onReady = vi.fn();
    start.mockImplementation((_container, callbacks) =>
      startGate.then(() => {
        callbacks.onReady?.();
        return undefined;
      }),
    );
    stop.mockResolvedValue(undefined);

    const { unmount } = render(
      <ARTrackingScene
        active
        onReady={onReady}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );

    unmount();
    expect(stop).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStart();
      await startGate;
    });

    await waitFor(() => {
      // Unmount stop + late-start then(stop)
      expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(onReady).not.toHaveBeenCalled();
  });

  it("StrictMode double mount leaves one live session at a time", async () => {
    let live = 0;
    let maxLive = 0;
    /** @type {Promise<void>} */
    let chain = Promise.resolve();

    // Serialize like the real adapter so StrictMode remount cannot overlap live sessions.
    stop.mockImplementation(() => {
      chain = chain.then(() => {
        live = 0;
      });
      return chain;
    });

    start.mockImplementation((_container, callbacks) => {
      chain = chain.then(async () => {
        live = 1;
        maxLive = Math.max(maxLive, live);
        callbacks.onReady?.();
      });
      return chain;
    });

    const onReady = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <ARTrackingScene
          active
          onReady={onReady}
          onTargetFound={vi.fn()}
          onTargetLost={vi.fn()}
          onError={vi.fn()}
          onUnsupported={vi.fn()}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    expect(maxLive).toBe(1);
    expect(live).toBe(1);
    // StrictMode: start → stop → start (at least one stop between mounts).
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(start.mock.calls.length).toBeGreaterThanOrEqual(2);

    unmount();
    await waitFor(() => {
      expect(live).toBe(0);
    });
  });

  it("stop is invoked safely when effect cleans up repeatedly", async () => {
    start.mockResolvedValue(undefined);
    stop.mockResolvedValue(undefined);

    const { rerender, unmount } = render(
      <ARTrackingScene
        active
        onReady={vi.fn()}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );

    rerender(
      <ARTrackingScene
        active={false}
        onReady={vi.fn()}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );
    rerender(
      <ARTrackingScene
        active
        onReady={vi.fn()}
        onTargetFound={vi.fn()}
        onTargetLost={vi.fn()}
        onError={vi.fn()}
        onUnsupported={vi.fn()}
      />,
    );
    unmount();

    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
    await expect(Promise.all(stop.mock.results.map((r) => r.value))).resolves.toBeTruthy();
  });
});
