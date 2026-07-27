import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMindARTrackingAdapter } from "./tracking/MindARTrackingAdapter";
import {
  captureArRuntimeFlags,
  resetArRuntimeFlagsForTests,
} from "./arRuntimeFlags";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  startLightweight: vi.fn(),
  createMonitor: vi.fn(),
}));

vi.mock("./checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("./createArCrashDiagMonitor", () => ({
  createArCrashDiagMonitor: (...args) => mocks.createMonitor(...args),
}));

vi.mock("./startArCrashDiagLightweightSession", () => ({
  startArCrashDiagLightweightSession: (...args) => mocks.startLightweight(...args),
}));

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

describe("MindARTrackingAdapter crash-diag branches", () => {
  beforeEach(() => {
    resetArRuntimeFlagsForTests();
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.startLightweight.mockReset();
    mocks.createMonitor.mockReset();
    mocks.createMonitor.mockImplementation((mode) => ({
      mode,
      instrumentController: vi.fn(),
      mountHud: vi.fn(),
      bindVideoFrameCounter: vi.fn(() => () => {}),
      bump: vi.fn(),
      note: vi.fn(),
      sampleRenderer: vi.fn(),
      markFrozen: vi.fn(),
      isFrozen: vi.fn(() => false),
      dispose: vi.fn(),
    }));
  });

  afterEach(async () => {
    resetArRuntimeFlagsForTests();
  });

  it("camera mode skips MindAR and .mind loading", async () => {
    captureArRuntimeFlags(
      {
        href: "https://host/?beyond=1&arDiag=camera",
        search: "?beyond=1&arDiag=camera",
        hash: "",
        pathname: "/",
      },
      { force: true },
    );

    mocks.startLightweight.mockImplementation(async (opts) => {
      opts.callbacks?.onReady?.();
      return {
        running: true,
        rafLoop: null,
        video: document.createElement("video"),
        cleanup: vi.fn(async () => {}),
      };
    });

    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onReady = vi.fn();

    await adapter.start(container, { onReady });

    expect(mocks.createMonitor).toHaveBeenCalledWith("camera");
    expect(mocks.startLightweight).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "camera", container }),
    );
    expect(mocks.loadArTargetBuffer).not.toHaveBeenCalled();
    expect(mocks.MindARThree).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalled();

    await adapter.stop();
    container.remove();
  });

  it("render mode uses lightweight session with three render capability", async () => {
    captureArRuntimeFlags(
      {
        href: "https://host/?arDiag=render",
        search: "?arDiag=render",
        hash: "",
        pathname: "/",
      },
      { force: true },
    );

    mocks.startLightweight.mockImplementation(async (opts) => {
      opts.callbacks?.onReady?.();
      return {
        running: true,
        rafLoop: { setAnimationLoop: vi.fn() },
        video: document.createElement("video"),
        cleanup: vi.fn(async () => {}),
      };
    });

    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    await adapter.start(container, { onReady: vi.fn() });

    expect(mocks.startLightweight).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "render" }),
    );
    expect(mocks.MindARThree).not.toHaveBeenCalled();
    await adapter.stop();
  });

  it("production path (no arDiag) still loads the mind target", async () => {
    captureArRuntimeFlags(
      {
        href: "https://host/",
        search: "",
        hash: "",
        pathname: "/",
      },
      { force: true },
    );
    mocks.loadArTargetBuffer.mockResolvedValue(null);

    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const onUnsupported = vi.fn();
    await adapter.start(document.createElement("div"), { onUnsupported });

    expect(mocks.startLightweight).not.toHaveBeenCalled();
    expect(mocks.loadArTargetBuffer).toHaveBeenCalled();
    expect(onUnsupported).toHaveBeenCalledWith("target-unavailable");
  });
});
