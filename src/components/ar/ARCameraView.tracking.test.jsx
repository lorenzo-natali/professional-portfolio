import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import ARCameraView from "./ARCameraView";

const trackingHandlers = {};

vi.mock("./ARTrackingScene", () => ({
  default: function MockARTrackingScene(props) {
    trackingHandlers.onReady = props.onReady;
    trackingHandlers.onTargetFound = props.onTargetFound;
    trackingHandlers.onTargetLost = props.onTargetLost;
    trackingHandlers.onError = props.onError;
    trackingHandlers.onUnsupported = props.onUnsupported;
    return <div data-testid="tracking-scene" />;
  },
}));

vi.mock("./tracking/ARTrackingProvider", () => ({
  ARTrackingProvider: ({ children }) => children,
}));

vi.mock("./usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => false,
}));

describe("ARCameraView tracking states", () => {
  it("does not trigger fallback on no detection or target lost", async () => {
    const onFallback = vi.fn();

    render(
      <ARCameraView onBack={vi.fn()} onExploreProjects={vi.fn()} onFallback={onFallback} />,
    );

    await act(async () => {
      trackingHandlers.onReady?.();
      trackingHandlers.onTargetLost?.();
    });

    expect(onFallback).not.toHaveBeenCalled();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
      trackingHandlers.onTargetLost?.();
    });

    expect(onFallback).not.toHaveBeenCalled();
  });
});
