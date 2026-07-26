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

describe("ARCameraView full-screen overlays", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a full-bleed camera stage without framed chrome classes", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    const stage = container.querySelector("[data-ar-camera-stage='true']");
    expect(stage).toBeTruthy();
    expect(stage.className).toContain("ar-camera-stage");
    expect(stage.className).not.toContain("ar-camera-shell");
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });

  it("shows only Close and CV-detected status overlays — no About", async () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /About/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Align the first page of the CV")).not.toBeInTheDocument();
    expect(screen.queryByText("CV detected")).not.toBeInTheDocument();
    expect(container.querySelector("[data-ar-close-overlay='true']")).toBeTruthy();
    expect(container.querySelector("[data-ar-lens-selector='true']")).toBeNull();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });

    expect(await screen.findByText("CV detected")).toBeInTheDocument();
    expect(container.querySelector("[data-ar-status-overlay='true']")).toBeTruthy();

    await act(async () => {
      trackingHandlers.onTargetLost?.();
    });
    expect(screen.queryByText("CV detected")).not.toBeInTheDocument();
    expect(screen.queryByText("Reframe the CV to continue")).not.toBeInTheDocument();
  });

  it("does not trigger fallback on target lost", async () => {
    const onFallback = vi.fn();
    render(<ARCameraView onBack={vi.fn()} onFallback={onFallback} />);

    await act(async () => {
      trackingHandlers.onReady?.();
      trackingHandlers.onTargetLost?.();
      trackingHandlers.onTargetFound?.();
      trackingHandlers.onTargetLost?.();
    });

    expect(onFallback).not.toHaveBeenCalled();
  });

  it("does not render About panel or camera diagnostics", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    expect(container.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
    expect(screen.queryByText("About this experience")).not.toBeInTheDocument();
  });
});
