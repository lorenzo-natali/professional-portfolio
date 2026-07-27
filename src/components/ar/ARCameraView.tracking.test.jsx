import { afterEach, describe, expect, it, vi } from "vitest";
import { render, act, screen, cleanup } from "@testing-library/react";
import ARCameraView from "./ARCameraView";
import { AR_DISCOVERY_PROMPT_DELAY_MS, AR_STATUS_COPY } from "./arStatusOnboarding";

const trackingHandlers = {};

vi.mock("./ARTrackingScene", () => ({
  default: function MockARTrackingScene(props) {
    trackingHandlers.onReady = props.onReady;
    trackingHandlers.onTargetFound = props.onTargetFound;
    trackingHandlers.onTargetLost = props.onTargetLost;
    trackingHandlers.onInterestOpen = props.onInterestOpen;
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
    cleanup();
    vi.useRealTimers();
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

  it("shows CV detected first, then the discovery prompt in the same status area", async () => {
    vi.useFakeTimers();
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByText(AR_STATUS_COPY.detected)).not.toBeInTheDocument();
    expect(container.querySelector("[data-ar-close-overlay='true']")).toBeTruthy();
    expect(trackingHandlers.onInterestOpen).toBeUndefined();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });

    expect(screen.getByText(AR_STATUS_COPY.detected)).toBeInTheDocument();
    expect(container.querySelector("[data-ar-status-phase='detected']")).toBeTruthy();
    expect(screen.queryByText(AR_STATUS_COPY.promptTitle)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    });

    expect(screen.queryByText(AR_STATUS_COPY.detected)).not.toBeInTheDocument();
    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();
    expect(screen.getByText(AR_STATUS_COPY.promptHint)).toBeInTheDocument();
    expect(container.querySelector("[data-ar-status-phase='prompt']")).toBeTruthy();
    expect(container.querySelectorAll("[data-ar-status-overlay='true']")).toHaveLength(1);
  });

  it("keeps the discovery prompt across temporary target loss and does not restart", async () => {
    vi.useFakeTimers();
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    await act(async () => {
      trackingHandlers.onTargetFound?.();
      vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    });
    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();

    await act(async () => {
      trackingHandlers.onTargetLost?.();
      trackingHandlers.onTargetFound?.();
      trackingHandlers.onTargetLost?.();
      trackingHandlers.onTargetFound?.();
    });

    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();
    expect(screen.queryByText(AR_STATUS_COPY.detected)).not.toBeInTheDocument();
    expect(container.querySelector("[data-ar-status-phase='prompt']")).toBeTruthy();
  });

  it("leaves the discovery prompt visible after interest cards are opened", async () => {
    vi.useFakeTimers();
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    await act(async () => {
      trackingHandlers.onTargetFound?.();
      vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    });
    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();

    // Interest taps no longer flow into onboarding; prompt must stay.
    expect(trackingHandlers.onInterestOpen).toBeUndefined();
    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();
    expect(screen.getByText(AR_STATUS_COPY.promptHint)).toBeInTheDocument();
    expect(container.querySelector("[data-ar-status-phase='prompt']")).toBeTruthy();
    expect(container.querySelector("[data-ar-status-phase='dismissed']")).toBeNull();
  });

  it("resets onboarding when a new AR session mounts", async () => {
    vi.useFakeTimers();
    const first = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);

    await act(async () => {
      trackingHandlers.onTargetFound?.();
      vi.advanceTimersByTime(AR_DISCOVERY_PROMPT_DELAY_MS);
    });
    expect(screen.getByText(AR_STATUS_COPY.promptTitle)).toBeInTheDocument();
    first.unmount();

    render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    await act(async () => {
      trackingHandlers.onTargetFound?.();
    });
    expect(screen.getByText(AR_STATUS_COPY.detected)).toBeInTheDocument();
    expect(screen.queryByText(AR_STATUS_COPY.promptTitle)).not.toBeInTheDocument();
  });

  it("keeps compact safe-area status positioning classes", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    act(() => {
      trackingHandlers.onTargetFound?.();
    });
    const status = container.querySelector("[data-ar-status-overlay='true']");
    expect(status?.className).toContain("pt-[max(0.65rem,env(safe-area-inset-top))]");
    expect(status?.className).toContain("top-0");
    expect(status?.className).toContain("justify-center");
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
