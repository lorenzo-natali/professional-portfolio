import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createValidMindFixture } from "../mindTargetFixture";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  createInterestObjectsLayer: vi.fn(),
  createInterestObjectsAnimation: vi.fn(),
  createInterestObjectsTapController: vi.fn(() => ({
    dispose: vi.fn(),
    close: vi.fn(),
    update: vi.fn(),
    hitLayer: document.createElement("div"),
  })),
  animInstances: /** @type {any[]} */ ([]),
}));

vi.mock("../checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("../createInterestObjectsLayer", () => ({
  createInterestObjectsLayer: (...args) => mocks.createInterestObjectsLayer(...args),
}));

vi.mock("../createInterestObjectsAnimation", () => ({
  createInterestObjectsAnimation: (...args) => mocks.createInterestObjectsAnimation(...args),
}));

vi.mock("../createInterestObjectsTapController", () => ({
  createInterestObjectsTapController: (...args) =>
    mocks.createInterestObjectsTapController(...args),
}));

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

import {
  applyCameraLayerStacking,
  bindMindArVideoResize,
  createMindARTrackingAdapter,
  layersMatchContainer,
  syncTrackingContainerToShell,
} from "./MindARTrackingAdapter";
import { isVisuallyPresentObject3D } from "../createAnchorProofObject";
import { AR_SESSION_RESET_MS } from "../arSessionTiming";
import { INTEREST_OBJECTS_STABILIZATION } from "../interestObjectsConfig";
import { bindArViewportListeners } from "../arViewport";

function makeInterestLayerStub() {
  const placement = new THREE.Group();
  placement.name = "ar-interest-objects-placement";
  placement.userData.kind = "ar-interest-objects";
  placement.visible = false;
  let resolveLoad = /** @type {((value?: void) => void) | null} */ (null);
  const loadPromise = new Promise((resolve) => {
    resolveLoad = resolve;
  });
  return {
    placement,
    group: placement,
    entries: [],
    items: [],
    setVisible: vi.fn(),
    applyEntranceProgress: vi.fn(),
    resetVisualState: vi.fn(),
    applyPoseEdit: vi.fn(),
    getConfigSnapshot: vi.fn(),
    getEntry: vi.fn(),
    startLoading: vi.fn(() => loadPromise),
    resolveLoad: () => resolveLoad?.(),
    dispose: vi.fn(),
  };
}

function makeAnimationStub(layer) {
  const state = {
    disposed: false,
    phase: "hidden",
    played: false,
    sessionActive: false,
    loadPassDone: false,
  };
  const anim = {
    onAcquisitionReady: vi.fn(),
    onItemLoaded: vi.fn(),
    markLoadFinished: vi.fn(() => {
      state.loadPassDone = true;
    }),
    resetSession: vi.fn(() => {
      layer.resetVisualState();
      state.played = false;
      state.sessionActive = false;
      state.phase = "hidden";
    }),
    play: vi.fn(),
    getState: vi.fn(() => ({ ...state })),
    dispose: vi.fn(() => {
      state.disposed = true;
    }),
  };
  mocks.animInstances.push(anim);
  return anim;
}

function mockMindAR({ resize = vi.fn(), withCssHost = true, startImpl } = {}) {
  const group = new THREE.Group();
  group.name = "mindar-anchor";
  const addAnchor = vi.fn(() => ({ group, onTargetFound: null, onTargetLost: null }));
  const scene = { add: vi.fn(), environment: null };
  const renderer = {
    setAnimationLoop: vi.fn(),
    setClearColor: vi.fn(),
    setClearAlpha: vi.fn(),
    domElement: document.createElement("canvas"),
    dispose: vi.fn(),
    render: vi.fn(),
  };

  mocks.MindARThree.mockImplementation(function MockMindARThree(options) {
    this.container = options.container;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera();
    this.addAnchor = addAnchor;
    this.start =
      startImpl ??
      vi.fn(async () => {
        const video = document.createElement("video");
        options.container.appendChild(video);
        options.container.appendChild(renderer.domElement);
        if (withCssHost) {
          const cssHost = document.createElement("div");
          options.container.appendChild(cssHost);
        }
      });
    this.stop = vi.fn(async () => {});
    this.resize = resize;
  });

  return { group, addAnchor, renderer, resize, scene };
}

describe("createMindARTrackingAdapter interest objects", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.createInterestObjectsLayer.mockReset();
    mocks.createInterestObjectsAnimation.mockReset();
    mocks.createInterestObjectsTapController.mockReset();
    mocks.createInterestObjectsTapController.mockImplementation(() => ({
      dispose: vi.fn(),
      close: vi.fn(),
      update: vi.fn(),
      hitLayer: document.createElement("div"),
    }));
    mocks.animInstances.length = 0;
    mocks.createInterestObjectsLayer.mockImplementation(() => makeInterestLayerStub());
    mocks.createInterestObjectsAnimation.mockImplementation((layer) => makeAnimationStub(layer));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("mounts interest placeholders without awaiting GLB loads before MindAR start", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    let startCalled = false;
    let loadStartedBeforeStart = false;
    const layer = makeInterestLayerStub();
    layer.startLoading.mockImplementation(() => {
      loadStartedBeforeStart = !startCalled;
      return new Promise(() => {});
    });
    mocks.createInterestObjectsLayer.mockReturnValue(layer);

    const { group, addAnchor, renderer } = mockMindAR();
    mocks.MindARThree.mockImplementation(function MockMindARThree(options) {
      this.container = options.container;
      this.renderer = renderer;
      this.scene = { add: vi.fn(), environment: null };
      this.camera = new THREE.PerspectiveCamera();
      this.addAnchor = addAnchor;
      this.start = vi.fn(async () => {
        startCalled = true;
        options.container.appendChild(document.createElement("video"));
        options.container.appendChild(renderer.domElement);
      });
      this.stop = vi.fn(async () => {});
      this.resize = vi.fn();
    });

    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(mocks.createInterestObjectsLayer).toHaveBeenCalledTimes(1);
    expect(layer.startLoading).toHaveBeenCalled();
    expect(loadStartedBeforeStart).toBe(true);
    expect(startCalled).toBe(true);
    const presentation = group.children.find(
      (child) => child?.name === "ar-interest-objects-presentation",
    );
    expect(presentation).toBeTruthy();
    expect(presentation.children[0]?.name).toBe("ar-interest-objects-placement");
    expect(renderer.domElement.style.pointerEvents).toBe("auto");

    await adapter.stop();
    container.remove();
  });

  it("ignores session A load resolve after session B has started", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const layerA = makeInterestLayerStub();
    const layerB = makeInterestLayerStub();
    mocks.createInterestObjectsLayer
      .mockReturnValueOnce(layerA)
      .mockReturnValueOnce(layerB);

    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);

    await adapter.start(container, {});
    expect(mocks.animInstances).toHaveLength(1);
    const animA = mocks.animInstances[0];

    await adapter.stop();

    mockMindAR();
    await adapter.start(container, {});
    expect(mocks.animInstances).toHaveLength(2);
    const animB = mocks.animInstances[1];

    // Late resolve of session A's load queue must not finish B.
    layerA.resolveLoad();
    await Promise.resolve();
    await Promise.resolve();

    expect(animA.markLoadFinished).not.toHaveBeenCalled();
    expect(animB.markLoadFinished).not.toHaveBeenCalled();

    layerB.resolveLoad();
    await Promise.resolve();
    await Promise.resolve();
    expect(animB.markLoadFinished).toHaveBeenCalledTimes(1);
    expect(animA.markLoadFinished).not.toHaveBeenCalled();

    await adapter.stop();
    container.remove();
  });

  it("cancels session-reset timeout on tracking re-found and stop", async () => {
    vi.useFakeTimers();
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const layer = makeInterestLayerStub();
    mocks.createInterestObjectsLayer.mockReturnValue(layer);
    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    const mindInstance = mocks.MindARThree.mock.results[0].value;
    const anchorHandle = mindInstance.addAnchor.mock.results[0].value;

    anchorHandle.onTargetFound();
    anchorHandle.onTargetLost();
    expect(layer.resetVisualState).not.toHaveBeenCalled();

    anchorHandle.onTargetFound();
    await vi.advanceTimersByTimeAsync(AR_SESSION_RESET_MS + 50);
    expect(layer.resetVisualState).not.toHaveBeenCalled();

    anchorHandle.onTargetLost();
    await adapter.stop();
    await vi.advanceTimersByTimeAsync(AR_SESSION_RESET_MS + 50);
    expect(adapter.isRunning()).toBe(false);

    container.remove();
  });

  it("reports unsupported when the target buffer is unavailable", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(null);
    const onUnsupported = vi.fn();
    const adapter = createMindARTrackingAdapter();
    await adapter.start(document.createElement("div"), { onUnsupported });
    expect(onUnsupported).toHaveBeenCalledWith("target-unavailable");
    expect(mocks.MindARThree).not.toHaveBeenCalled();
  });

  it("keeps the raw MindAR anchor unmodified by presentation ownership", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    const presentation = group.children.find(
      (child) => child?.name === "ar-interest-objects-presentation",
    );
    expect(presentation.matrixAutoUpdate).toBe(false);
    expect(group.matrixAutoUpdate).toBe(true);

    await adapter.stop();
    container.remove();
  });

  it("applyCameraLayerStacking defaults canvas to non-interactive", () => {
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const renderer = { setClearColor: vi.fn(), setClearAlpha: vi.fn(), domElement: canvas };
    applyCameraLayerStacking(container, renderer);
    expect(container.style.pointerEvents).toBe("none");
    expect(canvas.style.pointerEvents).toBe("none");
    expect(container.dataset.arInterestInteractive).toBeUndefined();
  });

  it("applyCameraLayerStacking unlocks hits for interest taps", () => {
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hit = document.createElement("div");
    hit.setAttribute("data-ar-interest-hit", "true");
    container.appendChild(canvas);
    container.appendChild(hit);
    const renderer = { setClearColor: vi.fn(), setClearAlpha: vi.fn(), domElement: canvas };
    applyCameraLayerStacking(container, renderer, { canvasPointerEvents: "auto" });
    expect(container.style.pointerEvents).toBe("auto");
    expect(container.dataset.arInterestInteractive).toBe("true");
    expect(canvas.style.pointerEvents).toBe("auto");
    expect(hit.style.pointerEvents).toBe("auto");
  });

  it("mounts interest tap controller and closes card on target lost", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const layer = makeInterestLayerStub();
    mocks.createInterestObjectsLayer.mockReturnValue(layer);
    const tap = {
      dispose: vi.fn(),
      close: vi.fn(),
      update: vi.fn(),
      hitLayer: document.createElement("div"),
    };
    mocks.createInterestObjectsTapController.mockReturnValue(tap);
    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(mocks.createInterestObjectsTapController).toHaveBeenCalled();

    const mindInstance = mocks.MindARThree.mock.results[0].value;
    const anchorHandle = mindInstance.addAnchor.mock.results[0].value;
    anchorHandle.onTargetLost();
    expect(tap.close).toHaveBeenCalled();

    await adapter.stop();
    expect(tap.dispose).toHaveBeenCalled();
    container.remove();
  });

  it("layersMatchContainer validates canvas and cover video against the container", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 300 });
    Object.defineProperty(container, "clientHeight", { value: 500 });
    const canvas = document.createElement("canvas");
    canvas.style.width = "300px";
    canvas.style.height = "500px";
    const video = document.createElement("video");
    video.style.width = "320px";
    video.style.height = "520px";
    container.appendChild(video);
    container.appendChild(canvas);
    expect(layersMatchContainer(container)).toBe(true);
  });

  it("syncTrackingContainerToShell uses inset:0 without pixel pinning from the shell", () => {
    const shell = document.createElement("div");
    Object.defineProperty(shell, "clientWidth", { value: 390 });
    Object.defineProperty(shell, "clientHeight", { value: 844 });
    Object.defineProperty(shell, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }),
    });
    const container = document.createElement("div");
    syncTrackingContainerToShell(container, shell);
    expect(container.style.width).toBe("auto");
    expect(container.style.height).toBe("auto");
    expect(container.style.left).toBe("0px");
    expect(container.style.right).toBe("0px");
    expect(container.style.top).toBe("0px");
    expect(container.style.bottom).toBe("0px");
    expect(container.style.width).not.toBe("390px");
  });

  it("bindMindArVideoResize cleans up listeners and resizes when metadata is ready", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
    Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
    const resize = vi.fn();
    const mindarThree = { video, resize };
    const cleanup = bindMindArVideoResize(mindarThree);
    expect(resize).toHaveBeenCalled();
    cleanup();
    resize.mockClear();
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(resize).not.toHaveBeenCalled();
  });

  it("uses rigid interest stabilization and does not parent interests to the camera", async () => {
    expect(INTEREST_OBJECTS_STABILIZATION.rigidAttachment).toBe(true);
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group, scene } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    const presentation = group.children.find(
      (child) => child?.name === "ar-interest-objects-presentation",
    );
    const placement = presentation?.children.find(
      (child) => child?.name === "ar-interest-objects-placement",
    );
    expect(presentation.parent).toBe(group);
    expect(placement.parent).toBe(presentation);
    expect(placement.parent).not.toBe(scene);

    await adapter.stop();
    container.remove();
  });

  it("restores the pre-1a0da8e MindAR One Euro filter baseline", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(mocks.MindARThree).toHaveBeenCalledWith(
      expect.objectContaining({
        filterMinCF: 0.0001,
        filterBeta: 0.001,
      }),
    );

    await adapter.stop();
    container.remove();
  });

  it("cleans up viewport listeners on stop", () => {
    const onChange = vi.fn();
    const vv = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    });
    const cleanup = bindArViewportListeners(onChange);
    cleanup();
    expect(vv.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("optionally mounts an anchor-proof object under the raw MindAR anchor", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: true });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(group.children.some((child) => isVisuallyPresentObject3D(child))).toBe(true);
    expect(
      group.children.some((child) => child?.name === "ar-interest-objects-presentation"),
    ).toBe(true);

    await adapter.stop();
    container.remove();
  });
});
