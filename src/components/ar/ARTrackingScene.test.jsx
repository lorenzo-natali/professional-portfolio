import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
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

  it("starts the adapter once when active and clears DOM on unmount", () => {
    start.mockClear();
    stop.mockClear();

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
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
