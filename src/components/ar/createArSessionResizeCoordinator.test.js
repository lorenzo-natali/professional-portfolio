import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createArSessionResizeCoordinator,
  detachMindArWindowResizeListener,
  disableUnusedMindArCss3d,
  resolveSessionPixelRatio,
} from "./createArSessionResizeCoordinator";
import { createValidMindFixture } from "./mindTargetFixture";
import { createMindARTrackingAdapter } from "./tracking/MindARTrackingAdapter";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  createInterestObjectsLayer: vi.fn(),
  createInterestObjectsAnimation: vi.fn(),
  createInterestObjectsTapController: vi.fn(),
}));

vi.mock("./checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("./createInterestObjectsLayer", () => ({
  createInterestObjectsLayer: (...args) => mocks.createInterestObjectsLayer(...args),
}));

vi.mock("./createInterestObjectsAnimation", () => ({
  createInterestObjectsAnimation: (...args) => mocks.createInterestObjectsAnimation(...args),
}));

vi.mock("./createInterestObjectsTapController", () => ({
  createInterestObjectsTapController: (...args) =>
    mocks.createInterestObjectsTapController(...args),
}));

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

function makeLayer(visible = false) {
  const placement = new THREE.Group();
  placement.name = "ar-interest-objects-placement";
  placement.visible = visible;
  if (visible) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial(),
    );
    placement.add(mesh);
  }
  return {
    placement,
    group: placement,
    entries: [],
    items: [],
    setVisible: vi.fn((v) => {
      placement.visible = v;
    }),
    applyEntranceProgress: vi.fn(),
    resetVisualState: vi.fn(),
    applyPoseEdit: vi.fn(),
    getConfigSnapshot: vi.fn(),
    getEntry: vi.fn(),
    startLoading: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
}

function makeAnim(phase = "hidden") {
  const state = { phase, disposed: false, played: false, sessionActive: false };
  return {
    onAcquisitionReady: vi.fn(),
    onItemLoaded: vi.fn(),
    markLoadFinished: vi.fn(),
    resetSession: vi.fn(),
    play: vi.fn(),
    isPlaying: vi.fn(() => state.phase === "playing"),
    getState: vi.fn(() => ({ ...state })),
    dispose: vi.fn(),
    /** @param {string} next */
    setPhase(next) {
      state.phase = next;
    },
  };
}

describe("createArSessionResizeCoordinator", () => {
  /** @type {HTMLElement} */
  let container;
  /** @type {any} */
  let mindar;
  let sessionGeneration;
  let sessionToken;

  beforeEach(() => {
    container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 640 });
    document.body.appendChild(container);

    sessionGeneration = 1;
    sessionToken = 1;

    const renderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      getPixelRatio: vi.fn(() => 2),
      domElement: document.createElement("canvas"),
    };
    const cssRenderer = {
      setSize: vi.fn(),
      domElement: document.createElement("div"),
    };
    container.appendChild(renderer.domElement);
    container.appendChild(cssRenderer.domElement);

    mindar = {
      container,
      renderer,
      cssRenderer,
      camera: new THREE.PerspectiveCamera(),
      video: document.createElement("video"),
      resize: vi.fn(() => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        cssRenderer.setSize(container.clientWidth, container.clientHeight);
        mindar.camera.aspect = container.clientWidth / container.clientHeight;
        mindar.camera.updateProjectionMatrix();
      }),
      _resizeHandler: vi.fn(),
    };
    window.addEventListener("resize", mindar._resizeHandler);
    Object.defineProperty(mindar.video, "videoWidth", { value: 1280 });
    Object.defineProperty(mindar.video, "videoHeight", { value: 720 });
    container.appendChild(mindar.video);
  });

  afterEach(() => {
    detachMindArWindowResizeListener(mindar);
    container.remove();
  });

  it("coalesces N resize requests in the same frame to one apply", async () => {
    const applied = vi.fn();
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
      onApplied: applied,
    });
    coordinator.assumeOwnership(mindar);

    coordinator.request("a");
    coordinator.request("b");
    coordinator.request("c");
    expect(mindar.resize).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(mindar.resize).toHaveBeenCalledTimes(1);
    });
    expect(applied).toHaveBeenCalledTimes(1);
    expect(coordinator.getApplyCount()).toBe(1);
    coordinator.dispose();
  });

  it("skips renderer.setSize when dimensions are unchanged", () => {
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
    });
    coordinator.assumeOwnership(mindar);
    coordinator.flushNow("first", { force: true });
    const afterFirst = mindar.renderer.setSize.mock.calls.length;

    coordinator.flushNow("again");
    expect(mindar.renderer.setSize.mock.calls.length).toBe(afterFirst);
    expect(mindar.resize.mock.calls.length).toBe(1);
    coordinator.dispose();
  });

  it("applies WebGL size and camera projection once when size changes", () => {
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
      useCss3d: false,
    });
    coordinator.assumeOwnership(mindar);
    // CSS3D setSize stubbed; track WebGL + camera.
    const projSpy = vi.spyOn(mindar.camera, "updateProjectionMatrix");
    coordinator.flushNow("initial", { force: true });
    expect(mindar.renderer.setSize).toHaveBeenCalledTimes(1);
    expect(projSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(container, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 800 });
    coordinator.flushNow("rotated");
    expect(mindar.renderer.setSize).toHaveBeenCalledTimes(2);
    expect(projSpy).toHaveBeenCalledTimes(2);
    coordinator.dispose();
  });

  it("ignores stale resize callbacks after dispose / session bump", async () => {
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
    });
    coordinator.request("pending");
    coordinator.dispose();
    sessionGeneration = 2;
    await Promise.resolve();
    await new Promise((r) => requestAnimationFrame(r));
    expect(mindar.resize).not.toHaveBeenCalled();
  });

  it("detaches MindAR window resize listener when assuming ownership", () => {
    const handler = mindar._resizeHandler;
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
    });
    expect(detachMindArWindowResizeListener(mindar)).toBe(true);
    coordinator.assumeOwnership(mindar);
    expect(mindar._resizeHandler).toBeNull();
    window.dispatchEvent(new Event("resize"));
    expect(handler).not.toHaveBeenCalled();
    coordinator.dispose();
  });

  it("teardown cancels pending resize work", async () => {
    const coordinator = createArSessionResizeCoordinator({
      getSessionGeneration: () => sessionGeneration,
      sessionToken,
      getMindarThree: () => mindar,
      getContainer: () => container,
      getShell: () => null,
      getRuntimeVariant: () => null,
    });
    coordinator.request("storm");
    coordinator.dispose();
    await new Promise((r) => requestAnimationFrame(r));
    expect(mindar.resize).not.toHaveBeenCalled();
    expect(coordinator.isDisposed()).toBe(true);
  });

  it("disableUnusedMindArCss3d removes DOM and no-ops setSize", () => {
    expect(container.contains(mindar.cssRenderer.domElement)).toBe(true);
    disableUnusedMindArCss3d(mindar);
    expect(container.contains(mindar.cssRenderer.domElement)).toBe(false);
    expect(() => mindar.cssRenderer.setSize(1, 1)).not.toThrow();
  });

  it("resolveSessionPixelRatio preserves device DPR by default", () => {
    expect(resolveSessionPixelRatio(null, 3)).toBe(3);
    expect(resolveSessionPixelRatio("half-resolution", 3)).toBe(1.5);
  });
});

describe("adapter resize + render ownership", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.createInterestObjectsLayer.mockReset();
    mocks.createInterestObjectsAnimation.mockReset();
    mocks.createInterestObjectsTapController.mockReset();
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mocks.createInterestObjectsLayer.mockImplementation(() => makeLayer(false));
    mocks.createInterestObjectsAnimation.mockImplementation(() => makeAnim("hidden"));
    mocks.createInterestObjectsTapController.mockImplementation(() => ({
      dispose: vi.fn(),
      close: vi.fn(),
      update: vi.fn(),
      cancelActiveGesture: vi.fn(),
      getGestureMode: vi.fn(() => "idle"),
      getOpenId: vi.fn(() => null),
      hitLayer: document.createElement("div"),
    }));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function installMindARMock() {
    const renderer = {
      setAnimationLoop: vi.fn(),
      setClearColor: vi.fn(),
      setClearAlpha: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      getPixelRatio: vi.fn(() => 2),
      domElement: document.createElement("canvas"),
      dispose: vi.fn(),
      render: vi.fn(),
    };
    const cssRenderer = {
      setSize: vi.fn(),
      domElement: document.createElement("div"),
    };
    const group = new THREE.Group();
    /** @type {any} */
    let instance = null;

    mocks.MindARThree.mockImplementation(function MockMindARThree(options) {
      instance = this;
      this.container = options.container;
      this.renderer = renderer;
      this.cssRenderer = cssRenderer;
      this.scene = { add: vi.fn(), environment: null };
      this.camera = new THREE.PerspectiveCamera();
      this.anchors = [];
      this._resizeHandler = vi.fn(() => this.resize());
      window.addEventListener("resize", this._resizeHandler);
      options.container.appendChild(renderer.domElement);
      options.container.appendChild(cssRenderer.domElement);
      this.addAnchor = vi.fn(() => {
        const anchor = { group, onTargetFound: null, onTargetLost: null, visible: false };
        this.anchors.push(anchor);
        return anchor;
      });
      this.start = vi.fn(async () => {
        this.video = document.createElement("video");
        Object.defineProperty(this.video, "videoWidth", { value: 1280 });
        Object.defineProperty(this.video, "videoHeight", { value: 720 });
        options.container.appendChild(this.video);
      });
      this.stop = vi.fn(async () => {});
      this.resize = vi.fn(() => {
        const width = options.container.clientWidth || 300;
        const height = options.container.clientHeight || 150;
        renderer.setSize(width, height);
        cssRenderer.setSize(width, height);
        this.camera.aspect = width / Math.max(1, height);
        this.camera.updateProjectionMatrix();
      });
    });

    return { renderer, cssRenderer, group, getInstance: () => instance };
  }

  it("installs one setAnimationLoop and clears it once on stop", async () => {
    const { renderer } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    expect(renderer.setAnimationLoop).toHaveBeenCalledTimes(1);
    expect(typeof renderer.setAnimationLoop.mock.calls[0][0]).toBe("function");

    await adapter.stop();
    const nullCalls = renderer.setAnimationLoop.mock.calls.filter((c) => c[0] === null);
    expect(nullCalls.length).toBe(1);

    await adapter.stop();
    expect(renderer.setAnimationLoop.mock.calls.filter((c) => c[0] === null)).toHaveLength(1);
    container.remove();
  });

  it("repeated start does not leave multiple live loops", async () => {
    const { renderer } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    await adapter.start(container, {});
    const liveCallbacks = renderer.setAnimationLoop.mock.calls.filter(
      (c) => typeof c[0] === "function",
    );
    expect(liveCallbacks.length).toBe(2);
    // Latest assignment wins; stop clears once.
    await adapter.stop();
    expect(renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    container.remove();
  });

  it("empty/no-drawable scene does not call renderer.render continuously", async () => {
    mocks.createInterestObjectsLayer.mockImplementation(() => makeLayer(false));
    const { renderer, group } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    const loop = renderer.setAnimationLoop.mock.calls.find((c) => typeof c[0] === "function")?.[0];
    expect(loop).toEqual(expect.any(Function));

    renderer.render.mockClear();
    // Initial dirty may render once; subsequent static frames must not.
    loop(16);
    loop(32);
    loop(48);
    const rendersAfterWarmup = renderer.render.mock.calls.length;
    loop(64);
    loop(80);
    expect(renderer.render.mock.calls.length).toBe(rendersAfterWarmup);

    // Target visible without drawable content still skips continuous draws.
    const instance = mocks.MindARThree.mock.instances[0];
    instance.anchors[0].visible = true;
    renderer.render.mockClear();
    loop(100);
    loop(116);
    expect(renderer.render).not.toHaveBeenCalled();

    await adapter.stop();
    container.remove();
  });

  it("target visibility with drawable content resumes continuous rendering", async () => {
    const layer = makeLayer(true);
    layer.placement.visible = true;
    mocks.createInterestObjectsLayer.mockImplementation(() => layer);
    const { renderer } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    const loop = renderer.setAnimationLoop.mock.calls.find((c) => typeof c[0] === "function")?.[0];
    const instance = mocks.MindARThree.mock.instances[0];
    const anchor = instance.anchors[0];

    renderer.render.mockClear();
    anchor.visible = false;
    loop(16);
    loop(32);
    // After dirty clear, no continuous renders while hidden.
    renderer.render.mockClear();
    loop(48);
    expect(renderer.render).not.toHaveBeenCalled();

    anchor.visible = true;
    loop(64);
    loop(80);
    expect(renderer.render.mock.calls.length).toBeGreaterThanOrEqual(2);

    await adapter.stop();
    container.remove();
  });

  it("static idle frames do not invoke interestTap.update collections", async () => {
    const tapUpdate = vi.fn();
    mocks.createInterestObjectsTapController.mockImplementation(() => ({
      dispose: vi.fn(),
      close: vi.fn(),
      update: tapUpdate,
      cancelActiveGesture: vi.fn(),
      getGestureMode: vi.fn(() => "idle"),
      getOpenId: vi.fn(() => null),
      hitLayer: document.createElement("div"),
    }));
    const { renderer } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    const loop = renderer.setAnimationLoop.mock.calls.find((c) => typeof c[0] === "function")?.[0];
    tapUpdate.mockClear();
    loop(16);
    loop(32);
    loop(48);
    expect(tapUpdate).not.toHaveBeenCalled();

    await adapter.stop();
    container.remove();
  });

  it("adapter start detaches MindAR resize listener (coordinator owns resize)", async () => {
    const { getInstance } = installMindARMock();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 320 });
    Object.defineProperty(container, "clientHeight", { value: 640 });
    document.body.appendChild(container);

    await adapter.start(container, {});
    expect(getInstance()._resizeHandler).toBeNull();
    await adapter.stop();
    container.remove();
  });
});
