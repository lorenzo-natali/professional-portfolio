import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createValidMindFixture } from "../mindTargetFixture";

const mocks = vi.hoisted(() => ({
  loadArTargetBuffer: vi.fn(),
  MindARThree: vi.fn(),
  createProfessionalEvolutionLayer: vi.fn(),
}));

vi.mock("../checkArTargetAvailable", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadArTargetBuffer: (...args) => mocks.loadArTargetBuffer(...args),
  };
});

vi.mock("../createProfessionalEvolutionLayer", () => ({
  createProfessionalEvolutionLayer: (...args) => mocks.createProfessionalEvolutionLayer(...args),
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
import { PROFESSIONAL_EVOLUTION_STAGES } from "../professionalEvolutionConfig";

function makeEvolutionStub() {
  const placement = new THREE.Group();
  placement.name = "ar-professional-evolution-placement";
  placement.userData.kind = "ar-professional-evolution";
  const entrance = new THREE.Group();
  entrance.name = "ar-professional-evolution-entrance";
  const content = new THREE.Group();
  content.name = "ar-professional-evolution-content";
  entrance.add(content);
  placement.add(entrance);
  placement.visible = false;
  return {
    group: placement,
    placement,
    interaction: entrance,
    anim: entrance,
    content,
    stageNodes: PROFESSIONAL_EVOLUTION_STAGES.map((stage) => ({ id: stage.id })),
    stages: PROFESSIONAL_EVOLUTION_STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
    })),
    riseHeight: 0.018,
    riseAxis: "z",
    initialRotation: { x: -0.04, y: 0, z: 0 },
    initialScale: 1,
    applyProgress: vi.fn(),
    resetVisualState: vi.fn(),
    resetInteractionPose: vi.fn(),
    setOpacity: vi.fn(),
    getOpacity: vi.fn(() => 0),
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

describe("createMindARTrackingAdapter camera slice", () => {
  beforeEach(() => {
    mocks.loadArTargetBuffer.mockReset();
    mocks.MindARThree.mockReset();
    mocks.createProfessionalEvolutionLayer.mockReset();
    mocks.createProfessionalEvolutionLayer.mockImplementation(() => makeEvolutionStub());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mind-target"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
  });

  it("does not attach gesture controllers and disables container pointer events", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    expect(mocks.createProfessionalEvolutionLayer).toHaveBeenCalledTimes(1);
    expect(container.style.pointerEvents).toBe("none");

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

  it("starts exactly one MindAR session with Professional Evolution and no Risk Lens labels", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group, addAnchor, renderer, resize } = mockMindAR();

    const shell = document.createElement("div");
    shell.setAttribute("data-ar-viewport-shell", "true");
    Object.defineProperty(shell, "clientWidth", { value: 390 });
    Object.defineProperty(shell, "clientHeight", { value: 720 });
    const container = document.createElement("div");
    shell.appendChild(container);
    document.body.appendChild(shell);

    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    await adapter.start(container, {});

    expect(mocks.MindARThree).toHaveBeenCalledTimes(1);
    expect(addAnchor).toHaveBeenCalledTimes(1);
    expect(mocks.createProfessionalEvolutionLayer).toHaveBeenCalledTimes(1);
    const presentation = group.children.find(
      (child) => child?.name === "ar-professional-evolution-presentation",
    );
    expect(presentation).toBeTruthy();
    expect(presentation.children).toHaveLength(1);
    const placement = presentation.children[0];
    expect(placement.name).toBe("ar-professional-evolution-placement");
    expect(placement.children.map((child) => child.name)).toEqual([
      "ar-professional-evolution-entrance",
    ]);
    expect(placement.children[0].children.map((child) => child.name)).toEqual([
      "ar-professional-evolution-content",
    ]);
    // No obsolete wrapper between presentation and placement.
    expect(
      presentation.children.some((child) => child?.name === "ar-professional-evolution"),
    ).toBe(false);
    expect(group.children.some((child) => child?.name === "ar-collectible")).toBe(false);
    expect(group.children.some((child) => child?.name === "ar-decision-core")).toBe(false);
    expect(group.children.some((child) => child?.name === "ar-professional-card")).toBe(false);
    expect(group.children.some((child) => child?.name === "ar-lens-layer")).toBe(false);
    expect(renderer.setClearColor).toHaveBeenCalled();
    expect(resize).toHaveBeenCalled();

    await adapter.stop();
    shell.remove();
  });

  it("wires Professional Evolution entrance to target found/lost without diagnostics hooks", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { addAnchor, renderer } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onTargetFound = vi.fn();
    const onTargetLost = vi.fn();
    await adapter.start(container, { onTargetFound, onTargetLost });

    const anchor = addAnchor.mock.results[0].value;
    expect(typeof anchor.onTargetFound).toBe("function");
    expect(typeof anchor.onTargetLost).toBe("function");
    anchor.onTargetFound();
    expect(onTargetFound).toHaveBeenCalledTimes(1);
    anchor.onTargetLost();
    expect(onTargetLost).toHaveBeenCalledTimes(1);
    expect(renderer.setAnimationLoop).toHaveBeenCalled();

    await adapter.stop();
    container.remove();
  });

  it("keeps the raw MindAR anchor unmodified by presentation ownership", async () => {
    mocks.loadArTargetBuffer.mockResolvedValue(createValidMindFixture());
    const { group } = mockMindAR();
    const adapter = createMindARTrackingAdapter({ showAnchorProof: false });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await adapter.start(container, {});

    const presentation = group.children.find(
      (child) => child?.name === "ar-professional-evolution-presentation",
    );
    expect(presentation.matrixAutoUpdate).toBe(false);
    expect(group.matrixAutoUpdate).toBe(true);

    await adapter.stop();
    container.remove();
  });

  it("applyCameraLayerStacking disables pointer events so Close is not stolen", () => {
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const renderer = { setClearColor: vi.fn(), setClearAlpha: vi.fn(), domElement: canvas };
    applyCameraLayerStacking(container, renderer);
    expect(container.style.pointerEvents).toBe("none");
    expect(canvas.style.pointerEvents).toBe("none");
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
      group.children.some((child) => child?.name === "ar-professional-evolution-presentation"),
    ).toBe(true);

    await adapter.stop();
    container.remove();
  });
});
