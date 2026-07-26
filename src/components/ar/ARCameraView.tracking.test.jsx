import { afterEach, describe, expect, it, vi } from "vitest";
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
        className="ar-tracking-container"
      />
    );
  },
}));

vi.mock("./tracking/ARTrackingProvider", () => ({
  ARTrackingProvider: ({ children }) => children,
}));

describe("ARCameraView clean baseline HUD", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses an absolute camera stage inside the viewport shell", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    const stage = container.querySelector("[data-ar-camera-stage='true']");
    expect(stage).toBeTruthy();
    expect(stage.className).toContain("ar-camera-stage");
    expect(stage.className).not.toContain("ar-camera-shell");
  });

  it("keeps only status, Close and About — no Lens selector or Risk labels", async () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About this experience" })).toBeInTheDocument();
    expect(screen.getByText("Align the first page of the CV")).toBeInTheDocument();
    expect(container.querySelector("[data-ar-lens-selector='true']")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Risk/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Governance Lens Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal Audit")).not.toBeInTheDocument();
    expect(screen.queryByText("Operational Resilience")).not.toBeInTheDocument();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });

    expect(await screen.findByText("CV detected")).toBeInTheDocument();
    expect(container.querySelector("[data-ar-lens-selector='true']")).toBeNull();
  });

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
    expect(await screen.findByText("Reframe the CV to continue")).toBeInTheDocument();
  });

  it("does not render camera diagnostics UI", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    expect(container.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
    expect(container.querySelector(".ar-camera-diagnostics")).toBeNull();
  });
});
