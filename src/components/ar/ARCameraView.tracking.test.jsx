import { describe, expect, it, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";
import ARCameraView from "./ARCameraView";

const trackingHandlers = {};

vi.mock("./ARTrackingScene", () => ({
  default: function MockARTrackingScene(props) {
    trackingHandlers.onReady = props.onReady;
    trackingHandlers.onTargetFound = props.onTargetFound;
    trackingHandlers.onTargetLost = props.onTargetLost;
    trackingHandlers.onError = props.onError;
    trackingHandlers.onUnsupported = props.onUnsupported;
    return (
      <div
        data-testid="tracking-scene"
        data-ar-tracking-container="true"
        className="ar-tracking-container absolute inset-0 overflow-hidden bg-transparent"
      />
    );
  },
}));

vi.mock("./tracking/ARTrackingProvider", () => ({
  ARTrackingProvider: ({ children }) => children,
}));

describe("ARCameraView camera-slice HUD", () => {
  it("does not trigger fallback on no detection or target lost", async () => {
    const onFallback = vi.fn();

    render(<ARCameraView onBack={vi.fn()} onFallback={onFallback} />);

    await act(async () => {
      trackingHandlers.onReady?.();
      trackingHandlers.onTargetLost?.();
    });

    expect(onFallback).not.toHaveBeenCalled();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });
    await act(async () => {
      trackingHandlers.onTargetLost?.();
    });

    expect(onFallback).not.toHaveBeenCalled();
    expect(await screen.findByText("Tracking paused")).toBeInTheDocument();
  });

  it("keeps HUD screen-fixed and does not render viewport AR cards", async () => {
    render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    expect(screen.getByText("Searching for CV…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About this experience" })).toBeInTheDocument();

    expect(screen.queryByText("Interpretation")).not.toBeInTheDocument();
    expect(screen.queryByText("Governance model")).not.toBeInTheDocument();
    expect(screen.queryByText("Professional trajectory")).not.toBeInTheDocument();
    expect(screen.queryByText("Governance view ready")).not.toBeInTheDocument();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });

    expect(await screen.findByText("CV detected")).toBeInTheDocument();
    expect(screen.queryByText("Interpretation")).not.toBeInTheDocument();
    expect(screen.queryByText("Professional trajectory")).not.toBeInTheDocument();
  });

  it("uses a transparent tracking container class", () => {
    render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    const container = screen.getByTestId("tracking-scene");
    expect(container.className).toContain("bg-transparent");
    expect(container.className).not.toContain("bg-black");
  });
});
