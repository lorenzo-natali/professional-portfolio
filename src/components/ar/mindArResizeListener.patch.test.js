import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { createValidMindFixture } from "./mindTargetFixture";
import { createMindARTrackingAdapter } from "./tracking/MindARTrackingAdapter";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Faithful contract of the mind-ar@1.2.5 patch:
 * store bound resize handler; remove it first in stop(); clear the ref.
 * Used when importing the full TF-backed prod bundle is impractical in unit tests.
 */
class PatchedMindARThreeContract {
  constructor({ container }) {
    this.container = container;
    this.resizeCalls = 0;
    this.renderer = {
      domElement: document.createElement("canvas"),
      setAnimationLoop: vi.fn(),
      setClearColor: vi.fn(),
      setClearAlpha: vi.fn(),
      dispose: vi.fn(),
      render: vi.fn(),
      setSize: vi.fn(),
    };
    this.cssRenderer = {
      domElement: document.createElement("div"),
      setSize: vi.fn(),
    };
    this.scene = { add: vi.fn(), environment: null };
    this.camera = new THREE.PerspectiveCamera();
    this.anchors = [];
    this.controller = {
      stopProcessVideo: vi.fn(),
      getProjectionMatrix: () => new Float32Array(16),
      inputWidth: 640,
      inputHeight: 480,
    };
    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.cssRenderer.domElement);
    this._resizeHandler = this.resize.bind(this);
    window.addEventListener("resize", this._resizeHandler);
  }

  async start() {
    this.video = document.createElement("video");
    Object.defineProperty(this.video, "videoWidth", { value: 1280 });
    Object.defineProperty(this.video, "videoHeight", { value: 720 });
    this.video.srcObject = { getTracks: () => [{ stop: vi.fn() }] };
    this.container.appendChild(this.video);
  }

  stop() {
    try {
      if (this._resizeHandler) {
        window.removeEventListener("resize", this._resizeHandler);
        this._resizeHandler = null;
      }
    } catch {
      // Best-effort: do not block camera/tracking cleanup.
    }
    this.controller?.stopProcessVideo?.();
    const tracks = this.video?.srcObject?.getTracks?.() || [];
    tracks.forEach((track) => track.stop());
    this.video?.remove?.();
  }

  resize() {
    this.resizeCalls += 1;
  }

  addAnchor() {
    const group = new THREE.Group();
    const anchor = { group, onTargetFound: null, onTargetLost: null };
    this.anchors.push(anchor);
    return anchor;
  }
}

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

function makeInterestLayerStub() {
  const placement = new THREE.Group();
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
    startLoading: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
}

function makeAnimationStub(layer) {
  const state = { disposed: false, phase: "hidden", played: false, sessionActive: false };
  return {
    onAcquisitionReady: vi.fn(),
    onItemLoaded: vi.fn(),
    markLoadFinished: vi.fn(),
    resetSession: vi.fn(() => layer.resetVisualState()),
    play: vi.fn(),
    getState: vi.fn(() => ({ ...state })),
    dispose: vi.fn(() => {
      state.disposed = true;
    }),
  };
}

function trackWindowResizeListeners() {
  const listeners = new Set();
  const origAdd = window.addEventListener.bind(window);
  const origRemove = window.removeEventListener.bind(window);
  const addSpy = vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "resize") listeners.add(listener);
    return origAdd(type, listener, options);
  });
  const removeSpy = vi
    .spyOn(window, "removeEventListener")
    .mockImplementation((type, listener, options) => {
      if (type === "resize") listeners.delete(listener);
      return origRemove(type, listener, options);
    });
  return {
    listeners,
    addSpy,
    removeSpy,
    restore() {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    },
  };
}

describe("mind-ar resize-listener patch", () => {
  it("installs the patch into the runtime-consumed MindAR bundle", () => {
    const runtime = readFileSync(
      join(repoRoot, "node_modules/mind-ar/dist/mindar-image-three.prod.js"),
      "utf8",
    );
    const source = readFileSync(
      join(repoRoot, "node_modules/mind-ar/src/image-target/three.js"),
      "utf8",
    );

    expect(runtime).toContain("this._resizeHandler=this.resize.bind(this)");
    expect(runtime).toContain('addEventListener("resize",this._resizeHandler)');
    expect(runtime).toContain('removeEventListener("resize", this._resizeHandler)');
    expect(runtime).not.toContain('addEventListener("resize", this.resize.bind(this))');

    expect(source).toContain("this._resizeHandler = this.resize.bind(this)");
    expect(source).toContain("window.removeEventListener('resize', this._resizeHandler)");
  });

  describe("patched MindARThree contract", () => {
    /** @type {ReturnType<typeof trackWindowResizeListeners>} */
    let tracker;
    /** @type {HTMLElement} */
    let container;

    beforeEach(() => {
      tracker = trackWindowResizeListeners();
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      tracker.restore();
      container.remove();
    });

    it("registers exactly one stored resize listener on construct", async () => {
      const instance = new PatchedMindARThreeContract({ container });
      expect(instance._resizeHandler).toEqual(expect.any(Function));
      expect(tracker.listeners.size).toBe(1);
      expect(tracker.listeners.has(instance._resizeHandler)).toBe(true);
      await instance.start();
      instance.stop();
    });

    it("stop removes the same callback reference and clears the stored handler", async () => {
      const instance = new PatchedMindARThreeContract({ container });
      const handler = instance._resizeHandler;
      await instance.start();
      instance.stop();
      expect(tracker.listeners.has(handler)).toBe(false);
      expect(instance._resizeHandler).toBeNull();
      expect(tracker.listeners.size).toBe(0);
    });

    it("repeated stop is a safe no-op for listener removal", async () => {
      const instance = new PatchedMindARThreeContract({ container });
      await instance.start();
      instance.stop();
      instance.stop();
      instance.stop();
      expect(tracker.listeners.size).toBe(0);
      expect(instance._resizeHandler).toBeNull();
    });

    it("stop during partial initialization still removes the listener", () => {
      const instance = new PatchedMindARThreeContract({ container });
      // Constructed but never started — no video yet.
      expect(tracker.listeners.size).toBe(1);
      instance.stop();
      expect(tracker.listeners.size).toBe(0);
      expect(instance._resizeHandler).toBeNull();
    });

    it("resize after stop does not invoke the stopped instance", async () => {
      const instance = new PatchedMindARThreeContract({ container });
      await instance.start();
      instance.stop();
      window.dispatchEvent(new Event("resize"));
      expect(instance.resizeCalls).toBe(0);
    });

    it("resize during a new session invokes only the current instance", async () => {
      const first = new PatchedMindARThreeContract({ container });
      await first.start();
      first.stop();

      const second = new PatchedMindARThreeContract({ container });
      await second.start();
      window.dispatchEvent(new Event("resize"));

      expect(first.resizeCalls).toBe(0);
      expect(second.resizeCalls).toBe(1);
      expect(tracker.listeners.size).toBe(1);
      expect(tracker.listeners.has(second._resizeHandler)).toBe(true);

      second.stop();
      expect(tracker.listeners.size).toBe(0);
    });

    it("20 construct/start/stop cycles leave zero stale MindAR resize listeners", async () => {
      for (let i = 0; i < 20; i += 1) {
        const instance = new PatchedMindARThreeContract({ container });
        await instance.start();
        instance.stop();
      }
      expect(tracker.listeners.size).toBe(0);
    });
  });

  describe("adapter cleanup with patched MindAR stop", () => {
    /** @type {ReturnType<typeof trackWindowResizeListeners>} */
    let tracker;

    beforeEach(() => {
      tracker = trackWindowResizeListeners();
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
      mocks.createInterestObjectsLayer.mockImplementation(() => makeInterestLayerStub());
      mocks.createInterestObjectsAnimation.mockImplementation((layer) => makeAnimationStub(layer));
      mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:mind-target"),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      tracker.restore();
      vi.unstubAllGlobals();
    });

    /** MindAR-only handlers (project viewport also binds window.resize). */
    const mindArHandlers = new Set();

    function installPatchedMindARMock({ startGate, failStart = false } = {}) {
      mocks.MindARThree.mockImplementation(function MockPatchedMindARThree(options) {
        this.container = options.container;
        this.resizeCalls = 0;
        this.renderer = {
          domElement: document.createElement("canvas"),
          setAnimationLoop: vi.fn(),
          setClearColor: vi.fn(),
          setClearAlpha: vi.fn(),
          dispose: vi.fn(),
          render: vi.fn(),
          setSize: vi.fn(),
        };
        this.cssRenderer = {
          domElement: document.createElement("div"),
          setSize: vi.fn(),
        };
        this.scene = { add: vi.fn(), environment: null };
        this.camera = new THREE.PerspectiveCamera();
        this.controller = {
          stopProcessVideo: vi.fn(),
          getProjectionMatrix: () => new Float32Array(16),
          inputWidth: 640,
          inputHeight: 480,
        };
        this.container.appendChild(this.renderer.domElement);
        this.container.appendChild(this.cssRenderer.domElement);

        this.resize = () => {
          this.resizeCalls += 1;
        };
        this._resizeHandler = () => this.resize();
        window.addEventListener("resize", this._resizeHandler);
        mindArHandlers.add(this._resizeHandler);

        this.addAnchor = vi.fn(() => ({
          group: new THREE.Group(),
          onTargetFound: null,
          onTargetLost: null,
        }));

        this.start = vi.fn(async () => {
          if (startGate) await startGate;
          if (failStart) throw new Error("NotAllowedError: camera rejected");
          this.video = document.createElement("video");
          Object.defineProperty(this.video, "videoWidth", { value: 1280 });
          Object.defineProperty(this.video, "videoHeight", { value: 720 });
          this.video.srcObject = { getTracks: () => [{ stop: vi.fn() }] };
          this.container.appendChild(this.video);
        });

        this.stop = vi.fn(() => {
          try {
            if (this._resizeHandler) {
              window.removeEventListener("resize", this._resizeHandler);
              mindArHandlers.delete(this._resizeHandler);
              this._resizeHandler = null;
            }
          } catch {
            // Best-effort listener removal.
          }
          this.controller?.stopProcessVideo?.();
          const tracks = this.video?.srcObject?.getTracks?.() || [];
          tracks.forEach((track) => track.stop());
          this.video?.remove?.();
        });
      });
    }

    it("failed start followed by adapter cleanup removes the MindAR resize listener", async () => {
      installPatchedMindARMock({ failStart: true });

      const onError = vi.fn();
      const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
      const container = document.createElement("div");
      document.body.appendChild(container);

      expect(mindArHandlers.size).toBe(0);
      await adapter.start(container, { onError });
      expect(onError).toHaveBeenCalled();
      expect(adapter.isRunning()).toBe(false);
      expect(mindArHandlers.size).toBe(0);

      container.remove();
    });

    it("Close during initialization removes the MindAR resize listener", async () => {
      let releaseStart;
      const startGate = new Promise((resolve) => {
        releaseStart = resolve;
      });
      installPatchedMindARMock({ startGate });

      const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
      const container = document.createElement("div");
      document.body.appendChild(container);

      const startPromise = adapter.start(container, {});
      await vi.waitFor(() => {
        expect(mocks.MindARThree).toHaveBeenCalled();
        expect(mindArHandlers.size).toBe(1);
      });

      const stopPromise = adapter.stop();
      releaseStart();
      await Promise.all([startPromise, stopPromise]);

      expect(adapter.isRunning()).toBe(false);
      expect(mindArHandlers.size).toBe(0);
      container.remove();
    });

    it("20 adapter start/stop cycles leave zero stale MindAR resize listeners", async () => {
      installPatchedMindARMock();
      const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
      const container = document.createElement("div");
      document.body.appendChild(container);

      for (let i = 0; i < 20; i += 1) {
        await adapter.start(container, {});
        expect(adapter.isRunning()).toBe(true);
        expect(mindArHandlers.size).toBe(1);
        await adapter.stop();
        expect(adapter.isRunning()).toBe(false);
        expect(mindArHandlers.size).toBe(0);
      }

      expect(mindArHandlers.size).toBe(0);
      container.remove();
    });

    it("concurrent adapter.stop calls remain compatible with P1-1 and clear one listener", async () => {
      installPatchedMindARMock();
      const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
      const container = document.createElement("div");
      document.body.appendChild(container);

      await adapter.start(container, {});
      expect(mindArHandlers.size).toBe(1);

      const first = adapter.stop();
      const second = adapter.stop();
      expect(first).toBe(second);
      await Promise.all([first, second]);

      expect(mindArHandlers.size).toBe(0);
      await adapter.stop();
      expect(mindArHandlers.size).toBe(0);
      container.remove();
    });
  });
});
