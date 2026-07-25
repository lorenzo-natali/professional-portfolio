import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ARTrackingScene from "./ARTrackingScene";

vi.mock("./tracking/useARTracking", () => ({
  useARTracking: () => ({
    adapter: {
      start: vi.fn(),
      stop: vi.fn(),
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
    expect(tracking.className).toContain("bg-transparent");
    expect(tracking.className).not.toMatch(/\bbg-black\b/);
    expect(tracking.className).not.toMatch(/\bbg-slate-/);
  });
});
