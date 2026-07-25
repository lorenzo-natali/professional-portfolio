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

vi.mock("three", async () => {
  const actual = await vi.importActual("three");
  return actual;
});

import { applyCameraLayerStacking, createMindARTrackingAdapter } from "./MindARTrackingAdapter";
import { isVisuallyPresentObject3D } from "../createAnchorProofObject";

describe("createMindARTrackingAdapter camera slice", () => {
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

  it("attaches a visible proof object to anchor.group and keeps renderer alpha enabled", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());

    const start = vi.fn().mockResolvedValue(undefined);
    const group = { children: [], add: vi.fn(function add(child) { this.children.push(child); }) };
    const addAnchor = vi.fn(() => ({ group, onTargetFound: null, onTargetLost: null }));
    const scene = { add: vi.fn() };
    const renderer = {
      setAnimationLoop: vi.fn(),
      setClearColor: vi.fn(),
      setClearAlpha: vi.fn(),
      domElement: document.createElement("canvas"),
      dispose: vi.fn(),
    };

    mocks.MindARThree.mockImplementation(function MockMindARThree(options) {
      this.options = options;
      this.start = start;
      this.stop = vi.fn();
      this.resize = vi.fn();
      this.addAnchor = addAnchor;
      this.renderer = renderer;
      this.scene = scene;
      this.camera = {};
      // Simulate MindAR video insertion with the problematic default z-index.
      const video = document.createElement("video");
      video.style.zIndex = "-2";
      options.container.appendChild(renderer.domElement);
      options.container.appendChild(video);
    });

    const adapter = createMindARTrackingAdapter({ targetSrc: "./ar/targets/cv-page-1.mind" });
    const host = document.createElement("div");
    const onReady = vi.fn();

    await adapter.start(host, { onReady, onUnsupported: vi.fn(), onError: vi.fn() });

    expect(start).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(group.add).toHaveBeenCalled();
    const proof = group.children[0];
    expect(isVisuallyPresentObject3D(proof)).toBe(true);

    const video = host.querySelector("video");
    expect(video.style.zIndex).toBe("0");
    expect(host.querySelector("canvas").style.zIndex).toBe("1");

    await adapter.stop();
  });

  it("maps unparseable target runtime errors to target-unavailable", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mocks.MindARThree.mockImplementation(function MockMindARThree() {
      this.start = vi.fn().mockRejectedValue(new Error("Failed to import mind target dataList"));
      this.stop = vi.fn();
      this.addAnchor = vi.fn(() => ({ group: { add: vi.fn(), children: [] } }));
      this.renderer = {
        setAnimationLoop: vi.fn(),
        setClearColor: vi.fn(),
        setClearAlpha: vi.fn(),
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

describe("applyCameraLayerStacking", () => {
  it("does not leave the MindAR video hidden behind an opaque ancestor fill", () => {
    const container = document.createElement("div");
    container.style.background = "black";
    const video = document.createElement("video");
    video.style.zIndex = "-2";
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    container.appendChild(video);

    const renderer = {
      setClearColor: vi.fn(),
      setClearAlpha: vi.fn(),
      domElement: canvas,
    };

    applyCameraLayerStacking(container, renderer);

    expect(container.style.background).toBe("transparent");
    expect(video.style.zIndex).toBe("0");
    expect(canvas.style.zIndex).toBe("1");
    expect(canvas.style.background).toBe("transparent");
    expect(renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
  });
});
