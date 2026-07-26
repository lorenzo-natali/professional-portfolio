import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createValidMindFixture } from "./mindTargetFixture";
import { createAlignmentInteraction } from "./createAlignmentInteraction";
import { createAlignmentAnimator } from "./createAlignmentAnimator";
import { createAlignmentCore } from "./createAlignmentCore";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  createInterestObjectsLayer: vi.fn(),
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

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

import { createMindARTrackingAdapter } from "./tracking/MindARTrackingAdapter";

function makeInterestLayerStub() {
  const placement = new THREE.Group();
  placement.name = "ar-interest-objects-placement";
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
    startLoading: vi.fn(async () => {}),
    dispose: vi.fn(),
  };
}

function mockMindAR({ startImpl } = {}) {
  const group = new THREE.Group();
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
        options.container.appendChild(document.createElement("video"));
        options.container.appendChild(renderer.domElement);
      });
    this.stop = vi.fn(async () => {});
    this.resize = vi.fn();
  });

  return { renderer };
}

describe("Interest objects adapter lifecycle", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.createInterestObjectsLayer.mockReset();
    mocks.createInterestObjectsLayer.mockReturnValue(makeInterestLayerStub());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("cleans up on start failure / camera rejection and stays restartable", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mockMindAR({
      startImpl: vi.fn(async () => {
        throw new Error("NotAllowedError: camera rejected");
      }),
    });

    const onError = vi.fn();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);

    await adapter.start(container, { onError });
    expect(onError).toHaveBeenCalled();
    expect(adapter.isRunning()).toBe(false);
    const layerInstance = mocks.createInterestObjectsLayer.mock.results[0]?.value;
    expect(layerInstance.dispose).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    // Restart after failure.
    mockMindAR();
    await adapter.start(container, {});
    expect(adapter.isRunning()).toBe(true);
    await adapter.stop();
    expect(adapter.isRunning()).toBe(false);
    await adapter.stop();
    container.remove();
  });

  it("supports repeated start/stop and clears the animation loop", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { renderer } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);

    await adapter.start(container, {});
    expect(renderer.setAnimationLoop).toHaveBeenCalled();
    await adapter.stop();
    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);

    await adapter.start(container, {});
    expect(adapter.isRunning()).toBe(true);
    await adapter.stop();
    await adapter.stop();
    container.remove();
  });
});

describe("legacy Alignment Core unit reset (module kept, unwired)", () => {
  it("clears inertia when resetting during active drag bookkeeping", () => {
    const core = createAlignmentCore(THREE);
    core.setVisible(true);
    const camera = new THREE.PerspectiveCamera();
    const dom = document.createElement("canvas");
    Object.defineProperty(dom, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    });
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core,
      THREE,
      getPhase: () => "split",
    });
    const animator = createAlignmentAnimator(core, {
      THREE,
      isDragging: () => interaction.isDragging(),
    });
    animator.reveal();
    interaction.reset();
    animator.resetSession();
    expect(interaction.getState().velX).toBe(0);
    expect(interaction.getState().velY).toBe(0);
    expect(interaction.getState().lastInertialTarget).toBeNull();
    expect(animator.getPhase()).toBe("hidden");

    interaction.dispose();
    animator.dispose();
    core.dispose();
  });
});
