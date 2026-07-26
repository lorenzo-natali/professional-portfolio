import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AR_CAMERA_DEBUG,
  isArCameraDebugEnabled,
  resetArCameraDebugLatch,
} from "./arDebug";
import {
  attachArCameraDiagnostics,
  collectCameraQualitySnapshot,
  computeCoverLayout,
  computeDisplayMetrics,
  redactMediaIdentifiers,
  refreshDisplayMetrics,
  waitForVideoDimensions,
} from "./arCameraDiagnostics";

function stubVideo({
  videoWidth = 1280,
  videoHeight = 720,
  clientWidth = 1500,
  clientHeight = 844,
  settings = {
    width: 1280,
    height: 720,
    frameRate: 30,
    facingMode: "environment",
    aspectRatio: 1280 / 720,
    deviceId: "secret-device",
    groupId: "secret-group",
    resizeMode: "none",
  },
  capabilities = {
    width: { min: 640, max: 1920 },
    height: { min: 480, max: 1080 },
    deviceId: "secret-device",
    groupId: "secret-group",
  },
  constraints = {
    facingMode: "environment",
    deviceId: "secret-device",
  },
} = {}) {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { configurable: true, get: () => videoWidth });
  Object.defineProperty(video, "videoHeight", { configurable: true, get: () => videoHeight });
  Object.defineProperty(video, "clientWidth", { configurable: true, get: () => clientWidth });
  Object.defineProperty(video, "clientHeight", { configurable: true, get: () => clientHeight });
  video.getBoundingClientRect = () => ({
    x: -555,
    y: 0,
    width: clientWidth,
    height: clientHeight,
    top: 0,
    left: -555,
    right: clientWidth - 555,
    bottom: clientHeight,
  });

  const track = {
    getSettings: vi.fn(() => ({ ...settings })),
    getConstraints: vi.fn(() => ({ ...constraints })),
    getCapabilities: capabilities == null ? undefined : vi.fn(() => ({ ...capabilities })),
  };
  Object.defineProperty(video, "srcObject", {
    configurable: true,
    value: {
      getVideoTracks: () => [track],
    },
  });
  return { video, track };
}

describe("ar camera diagnostics", () => {
  beforeEach(() => {
    vi.stubGlobal("devicePixelRatio", 3);
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 3 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetArCameraDebugLatch();
    window.history.replaceState({}, "", "/");
  });

  it("keeps diagnostics disabled by default", () => {
    expect(AR_CAMERA_DEBUG).toBe(false);
    expect(isArCameraDebugEnabled("")).toBe(false);
    expect(isArCameraDebugEnabled("?foo=1")).toBe(false);
  });

  it("enables diagnostics when the query flag is present", () => {
    expect(isArCameraDebugEnabled("?arCameraDebug=1")).toBe(true);
    expect(isArCameraDebugEnabled("?arCameraDebug=0")).toBe(false);
    window.history.replaceState({}, "", "/ar?arCameraDebug=1");
    expect(isArCameraDebugEnabled()).toBe(true);
  });

  it("waits for non-zero video dimensions", async () => {
    let width = 0;
    let height = 0;
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { configurable: true, get: () => width });
    Object.defineProperty(video, "videoHeight", { configurable: true, get: () => height });

    const pending = waitForVideoDimensions(video, { timeoutMs: 500, intervalMs: 20 });
    setTimeout(() => {
      width = 1280;
      height = 720;
    }, 40);
    await expect(pending).resolves.toBe(video);
  });

  it("does not throw when settings or capabilities are absent", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 640 });
    Object.defineProperty(video, "videoHeight", { value: 480 });
    Object.defineProperty(video, "clientWidth", { value: 390 });
    Object.defineProperty(video, "clientHeight", { value: 844 });
    Object.defineProperty(video, "srcObject", {
      value: {
        getVideoTracks: () => [
          {
            getSettings: () => {
              throw new Error("unavailable");
            },
            getConstraints: undefined,
            getCapabilities: undefined,
          },
        ],
      },
    });

    expect(() => collectCameraQualitySnapshot(video)).not.toThrow();
    const snapshot = collectCameraQualitySnapshot(video);
    expect(snapshot?.video.videoWidth).toBe(640);
    expect(snapshot?.settings).toEqual({});
  });

  it("computes cover scale and crop for a landscape stream in a portrait shell", () => {
    const cover = computeCoverLayout(1280, 720, 390, 844);
    expect(cover.coverScale).toBeCloseTo(844 / 720, 5);
    expect(cover.coverCssWidth).toBeCloseTo(844 * (1280 / 720), 5);
    expect(cover.cropHorizontalPct).toBeGreaterThan(70);
    expect(cover.cropVerticalPct).toBeCloseTo(0, 5);
  });

  it("classifies physical upscaling from DPR-aware scale", () => {
    const metrics = computeDisplayMetrics(1280, 720, 1500, 844, 3, {
      coverScale: 1500 / 1280,
      cropHorizontalPct: 74,
      cropVerticalPct: 0,
    });
    expect(metrics.coverScale).toBeCloseTo(1500 / 1280, 5);
    expect(metrics.nativePerCss).toBeCloseTo(1280 / 1500, 5);
    expect(metrics.physicalScale).toBeCloseTo((1500 * 3) / 1280, 5);
    expect(metrics.upscaled).toBe(true);
  });

  it("redacts deviceId and groupId identifiers", () => {
    const redacted = redactMediaIdentifiers({
      deviceId: "abc",
      groupId: "grp",
      facingMode: "environment",
      nested: { deviceId: "xyz", width: 1280 },
    });
    expect(redacted.deviceId).toBe("[redacted]");
    expect(redacted.groupId).toBe("[redacted]");
    expect(redacted.nested.deviceId).toBe("[redacted]");
    expect(redacted.facingMode).toBe("environment");
    expect(redacted.nested.width).toBe(1280);
  });

  it("collects a snapshot with redacted selected identifiers", () => {
    const { video, track } = stubVideo();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 390 });
    Object.defineProperty(container, "clientHeight", { value: 844 });
    container.appendChild(video);

    const snapshot = collectCameraQualitySnapshot(video, { container });
    expect(snapshot.selected.deviceId).toBe("[redacted]");
    expect(snapshot.settings.deviceId).toBe("[redacted]");
    expect(snapshot.capabilities.groupId).toBe("[redacted]");
    expect(snapshot.metrics.upscaled).toBe(true);
    expect(track.getSettings).toHaveBeenCalled();
  });

  it("viewport refresh recalculates only display metrics without requiring track APIs", () => {
    const { video, track } = stubVideo();
    const first = collectCameraQualitySnapshot(video);
    track.getSettings.mockClear();
    track.getConstraints.mockClear();

    Object.defineProperty(video, "clientWidth", { configurable: true, get: () => 1200 });
    Object.defineProperty(video, "clientHeight", { configurable: true, get: () => 675 });
    const refreshed = refreshDisplayMetrics(first, video);
    expect(track.getSettings).not.toHaveBeenCalled();
    expect(refreshed.video.clientWidth).toBe(1200);
    expect(refreshed.selected).toEqual(first.selected);
    expect(refreshed.metrics.coverScale).toBeCloseTo(1200 / 1280, 5);
  });

  it("attach is a no-op without the debug flag and cleans listeners when enabled", async () => {
    const { video } = stubVideo();
    const onSnapshot = vi.fn();
    const noopCleanup = attachArCameraDiagnostics({ video, onSnapshot });
    expect(typeof noopCleanup).toBe("function");
    expect(onSnapshot).not.toHaveBeenCalled();
    noopCleanup();

    window.history.replaceState({}, "", "/?arCameraDebug=1");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const cleanup = attachArCameraDiagnostics({ video, onSnapshot, logInitial: true });
    await vi.waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    expect(info).toHaveBeenCalledWith("[ar-camera-quality]", expect.any(Object));
    const logged = info.mock.calls[0][1];
    expect(JSON.stringify(logged)).not.toContain("secret-device");
    cleanup();
  });
});
