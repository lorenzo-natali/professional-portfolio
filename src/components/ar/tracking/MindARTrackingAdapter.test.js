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

import {
  applyCameraLayerStacking,
  createMindARTrackingAdapter,
  layersMatchContainer,
} from "./MindARTrackingAdapter";
import { isVisuallyPresentObject3D } from "../createAnchorProofObject";

function mockMindAR({ resize = vi.fn(), withCssHost = true } = {}) {
  const group = {
    children: [],
    add: vi.fn(function add(child) {
      this.children.push(child);
    }),
  };
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
    this.start = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn();
    this.resize = resize;
    this.addAnchor = addAnchor;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = {};
    options.container.appendChild(renderer.domElement);
    if (withCssHost) {
      const cssHost = document.createElement("div");
      cssHost.style.position = "absolute";
      options.container.appendChild(cssHost);
    }
    const video = document.createElement("video");
    video.style.zIndex = "-2";
    options.container.appendChild(video);
  });

  return { group, addAnchor, renderer, resize };
}

describe("createMindARTrackingAdapter camera slice", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
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

  it("starts exactly one MindAR session with a clean anchor and no Risk Lens content", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group, addAnchor, renderer, resize } = mockMindAR();

    const adapter = createMindARTrackingAdapter({
      targetSrc: "./ar/targets/cv-page-1.mind",
      showAnchorProof: false,
    });
    const shell = document.createElement("div");
    shell.setAttribute("data-ar-viewport-shell", "true");
    Object.defineProperty(shell, "clientWidth", { value: 390 });
    Object.defineProperty(shell, "clientHeight", { value: 700 });
    const host = document.createElement("div");
    shell.appendChild(host);
    document.body.appendChild(shell);

    const onReady = vi.fn();
    await adapter.start(host, { onReady, onUnsupported: vi.fn(), onError: vi.fn() });

    expect(mocks.MindARThree).toHaveBeenCalledTimes(1);
    expect(addAnchor).toHaveBeenCalledTimes(1);
    expect(group.add).not.toHaveBeenCalled();
    expect(group.children.some((child) => child?.name === "ar-lens-layer")).toBe(false);
    expect(group.children.some((child) => child?.name === "ar-governance-lens")).toBe(false);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(resize).toHaveBeenCalled();
    expect(host.querySelector("video").style.zIndex).toBe("0");

    const ctorOptions = mocks.MindARThree.mock.calls[0][0];
    expect(ctorOptions).not.toHaveProperty("video");
    expect(ctorOptions).not.toHaveProperty("filterVideoConstraints");

    await adapter.stop();
    shell.remove();
  });

  it("exposes the MindAR video through onVideoReady without changing camera constraints", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const host = document.createElement("div");
    const onVideoReady = vi.fn();

    await adapter.start(host, {
      onReady: vi.fn(),
      onVideoReady,
      onUnsupported: vi.fn(),
      onError: vi.fn(),
    });

    expect(onVideoReady).toHaveBeenCalledTimes(1);
    const payload = onVideoReady.mock.calls[0][0];
    expect(payload.container).toBe(host);
    expect(payload.video).toBeInstanceOf(HTMLVideoElement);
    expect(payload.video.tagName).toBe("VIDEO");

    const ctorOptions = mocks.MindARThree.mock.calls[0][0];
    expect(ctorOptions.uiLoading).toBe("no");
    expect(JSON.stringify(ctorOptions)).not.toMatch(/width|height|frameRate/);

    await adapter.stop();
  });

  it("notifies target lost/found without leaving the camera session", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { addAnchor } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const onTargetFound = vi.fn();
    const onTargetLost = vi.fn();
    const onUnsupported = vi.fn();
    const onError = vi.fn();

    await adapter.start(document.createElement("div"), {
      onReady: vi.fn(),
      onTargetFound,
      onTargetLost,
      onUnsupported,
      onError,
    });

    const wired = addAnchor.mock.results[0].value;
    wired.onTargetFound();
    wired.onTargetLost();
    wired.onTargetFound();

    expect(onTargetFound).toHaveBeenCalledTimes(2);
    expect(onTargetLost).toHaveBeenCalledTimes(1);
    expect(onUnsupported).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(adapter.isRunning()).toBe(true);

    await adapter.stop();
  });

  it("attaches a proof object only when the debug flag is enabled", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group } = mockMindAR();

    const adapter = createMindARTrackingAdapter({ showAnchorProof: true });
    await adapter.start(document.createElement("div"), { onReady: vi.fn() });

    expect(group.add).toHaveBeenCalled();
    expect(isVisuallyPresentObject3D(group.children[0])).toBe(true);

    await adapter.stop();
  });

  it("re-runs MindAR resize after visualViewport changes and cleans listeners on stop", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());

    const listeners = {};
    const vvListeners = {};
    vi.spyOn(window, "addEventListener").mockImplementation((type, fn) => {
      listeners[type] = fn;
    });
    const removeSpy = vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 390,
        height: 700,
        offsetLeft: 0,
        offsetTop: 0,
        addEventListener: (type, fn) => {
          vvListeners[type] = fn;
        },
        removeEventListener: vi.fn(),
      },
    });

    const resize = vi.fn();
    mockMindAR({ resize });

    const adapter = createMindARTrackingAdapter({ targetSrc: "./ar/targets/cv-page-1.mind" });
    const shell = document.createElement("div");
    shell.setAttribute("data-ar-viewport-shell", "true");
    const host = document.createElement("div");
    shell.appendChild(host);

    await adapter.start(host, { onReady: vi.fn() });
    const callsAfterStart = resize.mock.calls.length;

    listeners.resize?.();
    listeners.orientationchange?.();
    vvListeners.resize?.();

    expect(resize.mock.calls.length).toBeGreaterThan(callsAfterStart);
    expect(shell.style.position).toBe("fixed");
    expect(shell.style.transform).toBe("none");
    expect(shell.style.width).toBe("390px");

    await adapter.stop();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(window.visualViewport.removeEventListener).toHaveBeenCalled();
  });

  it("clears injected tracking DOM on scene cleanup path via stop", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mockMindAR();

    const adapter = createMindARTrackingAdapter();
    const host = document.createElement("div");
    await adapter.start(host, { onReady: vi.fn() });
    expect(host.querySelector("video")).toBeTruthy();
    expect(host.querySelector("canvas")).toBeTruthy();

    await adapter.stop();
    expect(adapter.isRunning()).toBe(false);
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
    const cssHost = document.createElement("div");
    container.appendChild(canvas);
    container.appendChild(cssHost);
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
    expect(cssHost.style.pointerEvents).toBe("none");
    expect(canvas.style.background).toBe("transparent");
    expect(renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
  });

  it("reports when canvas and CSS3D host match the container box", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 390 });
    Object.defineProperty(container, "clientHeight", { value: 700 });
    const canvas = document.createElement("canvas");
    canvas.style.width = "390px";
    canvas.style.height = "700px";
    const cssHost = document.createElement("div");
    cssHost.style.width = "390px";
    cssHost.style.height = "700px";
    container.appendChild(canvas);
    container.appendChild(cssHost);

    expect(layersMatchContainer(container)).toBe(true);

    cssHost.style.height = "500px";
    expect(layersMatchContainer(container)).toBe(false);
  });
});
