import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createValidMindFixture } from "../mindTargetFixture";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
}));

vi.mock("../checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

vi.mock("three", () => {
  class AmbientLight {
    constructor() {
      this.isLight = true;
    }
  }
  class PlaneGeometry {}
  class MeshBasicMaterial {}
  class Mesh {
    constructor() {
      this.isMesh = true;
    }
  }
  return { AmbientLight, PlaneGeometry, MeshBasicMaterial, Mesh };
});

import { createMindARTrackingAdapter } from "./MindARTrackingAdapter";

describe("createMindARTrackingAdapter target gating", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never opens the camera when the target is invalid", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(null);
    const adapter = createMindARTrackingAdapter({ targetSrc: "./ar/targets/cv-page-1.mind" });
    const onUnsupported = vi.fn();
    const onError = vi.fn();
    const onReady = vi.fn();

    await adapter.start(document.createElement("div"), {
      onUnsupported,
      onError,
      onReady,
    });

    expect(onUnsupported).toHaveBeenCalledWith("target-unavailable");
    expect(onError).not.toHaveBeenCalled();
    expect(onReady).not.toHaveBeenCalled();
    expect(mocks.MindARThree).not.toHaveBeenCalled();
  });

  it("reaches scanning/ready when the target is valid", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());

    const start = vi.fn().mockResolvedValue(undefined);
    const addAnchor = vi.fn(() => ({ group: { add: vi.fn() } }));
    const scene = { add: vi.fn() };
    const renderer = {
      setAnimationLoop: vi.fn(),
      domElement: document.createElement("canvas"),
      dispose: vi.fn(),
    };

    mocks.MindARThree.mockImplementation(function MockMindARThree() {
      this.start = start;
      this.stop = vi.fn();
      this.addAnchor = addAnchor;
      this.renderer = renderer;
      this.scene = scene;
      this.camera = {};
    });

    const adapter = createMindARTrackingAdapter({ targetSrc: "./ar/targets/cv-page-1.mind" });
    const onReady = vi.fn();
    const onUnsupported = vi.fn();
    const onError = vi.fn();

    await adapter.start(document.createElement("div"), {
      onReady,
      onUnsupported,
      onError,
    });

    expect(mocks.loadArTargetBuffer).toHaveBeenCalled();
    expect(mocks.MindARThree).toHaveBeenCalledTimes(1);
    expect(mocks.MindARThree.mock.calls[0][0].imageTargetSrc).toBe("blob:mind-target");
    expect(start).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onUnsupported).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(adapter.isRunning()).toBe(true);

    await adapter.stop();
  });

  it("maps unparseable target runtime errors to target-unavailable", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mocks.MindARThree.mockImplementation(function MockMindARThree() {
      this.start = vi.fn().mockRejectedValue(new Error("Failed to import mind target dataList"));
      this.stop = vi.fn();
      this.addAnchor = vi.fn(() => ({ group: { add: vi.fn() } }));
      this.renderer = {
        setAnimationLoop: vi.fn(),
        dispose: vi.fn(),
        domElement: document.createElement("canvas"),
      };
      this.scene = { add: vi.fn() };
      this.camera = {};
    });

    const adapter = createMindARTrackingAdapter();
    const onUnsupported = vi.fn();
    const onError = vi.fn();

    await adapter.start(document.createElement("div"), { onUnsupported, onError });

    expect(onUnsupported).toHaveBeenCalledWith("target-unavailable");
    expect(onError).not.toHaveBeenCalled();
  });
});
