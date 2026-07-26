import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createValidMindFixture } from "../mindTargetFixture";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  createAlignmentCore: vi.fn(),
}));

vi.mock("../checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("../createAlignmentCore", () => ({
  createAlignmentCore: (...args) => mocks.createAlignmentCore(...args),
}));

vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: mocks.MindARThree,
}));

import {
  applyCameraLayerStacking,
  createMindARTrackingAdapter,
  layersMatchContainer,
} from "./MindARTrackingAdapter";
import { isVisuallyPresentObject3D } from "../createAnchorProofObject";

function makeAlignmentStub() {
  const placement = new THREE.Group();
  placement.name = "ar-alignment-core-placement";
  placement.userData.kind = "ar-alignment-core";
  placement.visible = false;
  const leftHit = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial());
  leftHit.userData.shellSide = "left";
  const rightHit = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial());
  rightHit.userData.shellSide = "right";
  return {
    placement,
    group: placement,
    hitTargets: [leftHit, rightHit],
    leftShell: { root: new THREE.Group(), hit: leftHit, dispose: vi.fn() },
    rightShell: { root: new THREE.Group(), hit: rightHit, dispose: vi.fn() },
    leftCarrier: new THREE.Group(),
    rightCarrier: new THREE.Group(),
    leftTarget: new THREE.Quaternion(),
    rightTarget: new THREE.Quaternion(),
    coreGroup: new THREE.Group(),
    coreMesh: new THREE.Mesh(),
    halo: new THREE.Mesh(),
    coreMat: { emissiveIntensity: 1 },
    haloMat: { opacity: 0 },
    mergedInteraction: new THREE.Group(),
    assembly: new THREE.Group(),
    layout: { shellSeparation: 0.4 },
    setVisible: vi.fn(),
    resetToSplit: vi.fn(),
    dispose: vi.fn(),
  };
}

function mockMindAR({ resize = vi.fn(), withCssHost = true } = {}) {
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
    this.start = vi.fn(async () => {
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

describe("createMindARTrackingAdapter Alignment Core", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.createAlignmentCore.mockReset();
    mocks.createAlignmentCore.mockImplementation(() => makeAlignmentStub());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
  });

  it("mounts Alignment Core under presentation and enables canvas pointers", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group, addAnchor, renderer } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(mocks.createAlignmentCore).toHaveBeenCalledTimes(1);
    expect(addAnchor).toHaveBeenCalledTimes(1);
    const presentation = group.children.find(
      (child) => child?.name === "ar-alignment-core-presentation",
    );
    expect(presentation).toBeTruthy();
    expect(presentation.children[0]?.name).toBe("ar-alignment-core-placement");
    expect(group.children.some((child) => child?.name === "ar-professional-evolution")).toBe(
      false,
    );
    expect(container.style.pointerEvents).toBe("none");
    expect(renderer.domElement.style.pointerEvents).toBe("auto");

    await adapter.stop();
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
      (child) => child?.name === "ar-alignment-core-presentation",
    );
    expect(presentation.matrixAutoUpdate).toBe(false);
    expect(group.matrixAutoUpdate).toBe(true);

    await adapter.stop();
    container.remove();
  });

  it("applyCameraLayerStacking keeps Close-safe container isolation", () => {
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const renderer = { setClearColor: vi.fn(), setClearAlpha: vi.fn(), domElement: canvas };
    applyCameraLayerStacking(container, renderer, { canvasPointerEvents: "auto" });
    expect(container.style.pointerEvents).toBe("none");
    expect(canvas.style.pointerEvents).toBe("auto");
  });

  it("layersMatchContainer validates canvas sizing against the container", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 300 });
    Object.defineProperty(container, "clientHeight", { value: 500 });
    const canvas = document.createElement("canvas");
    canvas.style.width = "300px";
    canvas.style.height = "500px";
    container.appendChild(canvas);
    expect(layersMatchContainer(container)).toBe(true);
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
      group.children.some((child) => child?.name === "ar-alignment-core-presentation"),
    ).toBe(true);

    await adapter.stop();
    container.remove();
  });
});
