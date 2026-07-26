import { afterEach, describe, expect, it, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";
import ARCameraView from "./ARCameraView";
import { resetArCameraDebugLatch } from "./arDebug";

const trackingHandlers = {};

vi.mock("./ARTrackingScene", () => ({
  default: function MockARTrackingScene(props) {
    trackingHandlers.onReady = props.onReady;
    trackingHandlers.onTargetFound = props.onTargetFound;
    trackingHandlers.onTargetLost = props.onTargetLost;
    trackingHandlers.onError = props.onError;
    trackingHandlers.onUnsupported = props.onUnsupported;
    trackingHandlers.onVideoReady = props.onVideoReady;
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

function stubReadyVideo() {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: 390 });
  Object.defineProperty(container, "clientHeight", { value: 844 });
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: 1280 });
  Object.defineProperty(video, "videoHeight", { value: 720 });
  Object.defineProperty(video, "clientWidth", { value: 1500 });
  Object.defineProperty(video, "clientHeight", { value: 844 });
  video.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 1500,
    height: 844,
    top: 0,
    left: 0,
    right: 1500,
    bottom: 844,
  });
  Object.defineProperty(video, "srcObject", {
    value: {
      getVideoTracks: () => [
        {
          getSettings: () => ({
            width: 1280,
            height: 720,
            frameRate: 30,
            facingMode: "environment",
            deviceId: "secret-device",
          }),
          getConstraints: () => ({ facingMode: "environment" }),
          getCapabilities: () => ({ width: { max: 1920 }, deviceId: "secret-device" }),
        },
      ],
    },
  });
  container.appendChild(video);
  return { video, container };
}

describe("ARCameraView clean baseline HUD", () => {
  afterEach(() => {
    resetArCameraDebugLatch();
    window.history.replaceState({}, "", "/");
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

  it("does not render camera diagnostics without the debug flag", () => {
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    expect(container.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
  });

  it("shows diagnostics inside the AR stage when ?arCameraDebug=1 and video is ready", async () => {
    window.history.replaceState({}, "", "/professional-portfolio/?arCameraDebug=1");
    vi.spyOn(console, "info").mockImplementation(() => {});

    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    const stage = container.querySelector("[data-ar-camera-stage='true']");

    expect(stage.querySelector("[data-ar-camera-diagnostics='true']")).toBeTruthy();
    expect(
      stage.querySelector("[data-ar-camera-diagnostics='true']")?.getAttribute(
        "data-ar-camera-diagnostics-waiting",
      ),
    ).toBe("true");

    const { video, container: videoHost } = stubReadyVideo();
    await act(async () => {
      trackingHandlers.onVideoReady?.({ video, container: videoHost });
    });

    await act(async () => {
      await Promise.resolve();
    });

    const panel = stage.querySelector("[data-ar-camera-diagnostics='true']");
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toMatch(/Native:\s*1280\s*×\s*720/);
    expect(panel?.textContent).not.toContain("secret-device");
    expect(panel?.closest("[data-ar-camera-stage='true']")).toBe(stage);
  });

  it("ignores unrelated query parameters for diagnostics", () => {
    window.history.replaceState({}, "", "/?foo=1&bar=2");
    const { container } = render(<ARCameraView onBack={vi.fn()} onFallback={vi.fn()} />);
    expect(container.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
  });
});
