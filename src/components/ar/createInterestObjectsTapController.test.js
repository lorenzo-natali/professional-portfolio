import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createInterestObjectsTapController,
  findInterestRootFromObject,
  TAP_MOVE_THRESHOLD_PX,
} from "./createInterestObjectsTapController";
import { INTEREST_OBJECT_CARDS } from "./interestObjectsContent";
import { createInterestObjectsLayer } from "./createInterestObjectsLayer";
import { INTEREST_OBJECTS, getInterestDisplayRotation } from "./interestObjectsConfig";
import {
  INTEREST_VISITOR_MAX_PITCH_RAD,
  INTEREST_VISITOR_ROTATION_SENSITIVITY,
} from "./interestObjectsVisitorRotation";

const mocks = vi.hoisted(() => ({
  loadInterestGlb: vi.fn(),
}));

vi.mock("./loadInterestGlb", async () => {
  const actual = await vi.importActual("./loadInterestGlb");
  return {
    ...actual,
    loadInterestGlb: (...args) => mocks.loadInterestGlb(...args),
  };
});

function makeFittedContent(targetSize = 0.1) {
  const geo = new THREE.BoxGeometry(0.05, 0.05, targetSize);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = targetSize / 2;
  const root = new THREE.Group();
  root.add(mesh);
  return { model: root, mesh };
}

function makeLayerWithMesh(id, { revealed = true } = {}) {
  const root = new THREE.Group();
  root.userData.interestId = id;
  const display = new THREE.Group();
  const userRotation = new THREE.Group();
  const entrance = new THREE.Group();
  const content = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  content.add(mesh);
  entrance.add(content);
  userRotation.add(entrance);
  display.add(userRotation);
  root.add(display);
  root.position.set(0, 0, -1);

  return {
    entries: [
      {
        id,
        root,
        display,
        userRotation,
        entrance,
        content,
        revealed,
        loaded: true,
      },
    ],
    getEntry(entryId) {
      return this.entries.find((entry) => entry.id === entryId) ?? null;
    },
  };
}

function dispatchPointer(target, type, init) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    pointerType: "touch",
    clientX: 150,
    clientY: 250,
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe("findInterestRootFromObject", () => {
  it("walks parents for interestId", () => {
    const root = new THREE.Group();
    root.userData.interestId = "book";
    const child = new THREE.Object3D();
    root.add(child);
    expect(findInterestRootFromObject(child)?.id).toBe("book");
  });
});

describe("createInterestObjectsTapController", () => {
  /** @type {ReturnType<typeof createInterestObjectsTapController> | null} */
  let controller = null;
  let container;
  let shell;
  /** @type {ReturnType<typeof vi.spyOn> | null} */
  let intersectSpy = null;

  beforeEach(() => {
    container = document.createElement("div");
    container.className = "ar-tracking-container";
    container.style.width = "300px";
    container.style.height = "500px";
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 500,
        width: 300,
        height: 500,
      }),
    });
    shell = document.createElement("div");
    shell.setAttribute("data-ar-viewport-shell", "true");
    shell.appendChild(container);
    document.body.appendChild(shell);
  });

  afterEach(() => {
    intersectSpy?.mockRestore();
    intersectSpy = null;
    controller?.dispose();
    controller = null;
    shell?.remove();
  });

  function mount(layer, hitObject = null) {
    const camera = new THREE.PerspectiveCamera(50, 300 / 500, 0.1, 10);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    if (hitObject) {
      intersectSpy = vi.spyOn(THREE.Raycaster.prototype, "intersectObjects").mockReturnValue([
        { object: hitObject },
      ]);
    } else {
      intersectSpy = vi.spyOn(THREE.Raycaster.prototype, "intersectObjects").mockReturnValue([]);
    }

    controller = createInterestObjectsTapController({
      THREE,
      layer,
      camera,
      domElement: canvas,
      container,
      shell,
    });
    Object.defineProperty(controller.hitLayer, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 500,
        width: 300,
        height: 500,
      }),
    });
    return controller;
  }

  it("reuses a single card and toggles open/close for the same object", () => {
    const layer = makeLayerWithMesh("robot");
    mount(layer);

    const cards = () => document.querySelectorAll("[data-ar-interest-info-card='true']");
    expect(cards()).toHaveLength(1);

    controller.open("robot");
    expect(controller.getOpenId()).toBe("robot");
    expect(cards()[0].classList.contains("is-open")).toBe(true);
    expect(cards()[0].textContent).toContain(INTEREST_OBJECT_CARDS.robot.title);

    controller.handleTap(10, 10);
    expect(controller.getOpenId()).toBeNull();

    controller.open("robot");
    controller.open("book");
    expect(controller.getOpenId()).toBe("book");
    expect(cards()).toHaveLength(1);

    controller.close({ animate: false });
    expect(controller.getOpenId()).toBeNull();
  });

  it("keeps at most one open card when switching objects", () => {
    const layer = makeLayerWithMesh("plant");
    layer.entries.push(...makeLayerWithMesh("fossil").entries);
    mount(layer);

    controller.open("plant");
    controller.open("fossil");
    expect(controller.getOpenId()).toBe("fossil");
    expect(document.querySelectorAll("[data-ar-interest-info-card='true']")).toHaveLength(1);
  });

  it("exports exact production copy for all six interests", () => {
    expect(Object.keys(INTEREST_OBJECT_CARDS).sort()).toEqual(
      ["backpack", "book", "evil-eye", "fossil", "plant", "robot"].sort(),
    );
  });

  it("retains tap behaviour below the move threshold", () => {
    const layer = makeLayerWithMesh("book");
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 150, clientY: 250 });
    dispatchPointer(controller.hitLayer, "pointermove", {
      clientX: 150 + TAP_MOVE_THRESHOLD_PX - 1,
      clientY: 250,
    });
    expect(controller.getGestureMode()).toBe("pending");
    dispatchPointer(controller.hitLayer, "pointerup", {
      clientX: 150 + TAP_MOVE_THRESHOLD_PX - 1,
      clientY: 250,
    });
    expect(controller.getOpenId()).toBe("book");
    expect(controller.getGestureMode()).toBe("idle");
  });

  it("classifies Euclidean movement at threshold as rotation and never taps", () => {
    const layer = makeLayerWithMesh("robot");
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);
    controller.open("book");
    expect(controller.getOpenId()).toBe("book");

    const displayBefore = layer.entries[0].display.rotation.clone();
    const rootPos = layer.entries[0].root.position.clone();

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 100, clientY: 100 });
    // Diagonal: 6-8-10 triangle reaches exactly 10px.
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 106, clientY: 108 });
    expect(controller.getGestureMode()).toBe("rotating");
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 140, clientY: 100 });
    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 140, clientY: 100 });

    expect(controller.getGestureMode()).toBe("idle");
    // Card left unchanged during rotation.
    expect(controller.getOpenId()).toBe("book");
    expect(layer.entries[0].display.rotation.x).toBeCloseTo(displayBefore.x, 10);
    expect(layer.entries[0].display.rotation.y).toBeCloseTo(displayBefore.y, 10);
    expect(layer.entries[0].display.rotation.z).toBeCloseTo(displayBefore.z, 10);
    expect(layer.entries[0].root.position.equals(rootPos)).toBe(true);
    expect(layer.entries[0].userRotation.rotation.z).not.toBe(0);
    expect(layer.entries[0].userRotation.rotation.y).toBeCloseTo(0, 10);
  });

  it("applies horizontal yaw only and vertical pitch only from frozen start", () => {
    const layer = makeLayerWithMesh("plant");
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 100, clientY: 100 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 100 + 40, clientY: 100 });
    expect(controller.getVisitorAngles("plant").yaw).toBeCloseTo(
      40 * INTEREST_VISITOR_ROTATION_SENSITIVITY,
      10,
    );
    expect(controller.getVisitorAngles("plant").pitch).toBeCloseTo(0, 10);

    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 140, clientY: 100 });

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 100, clientY: 100 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 100, clientY: 100 + 50 });
    const pitch = controller.getVisitorAngles("plant").pitch;
    expect(pitch).toBeCloseTo(50 * INTEREST_VISITOR_ROTATION_SENSITIVITY, 10);
    expect(controller.getVisitorAngles("plant").yaw).toBeCloseTo(
      40 * INTEREST_VISITOR_ROTATION_SENSITIVITY,
      8,
    );
    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 100, clientY: 150 });
  });

  it("clamps pitch and ignores a second pointer id", () => {
    const layer = makeLayerWithMesh("backpack");
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 50, clientY: 50, pointerId: 1 });
    dispatchPointer(controller.hitLayer, "pointermove", {
      clientX: 50,
      clientY: 50 + 1e5,
      pointerId: 1,
    });
    expect(controller.getVisitorAngles("backpack").pitch).toBeCloseTo(
      INTEREST_VISITOR_MAX_PITCH_RAD,
      8,
    );

    dispatchPointer(controller.hitLayer, "pointerdown", {
      clientX: 80,
      clientY: 80,
      pointerId: 2,
      isPrimary: true,
    });
    expect(controller.getGestureMode()).toBe("rotating");
    dispatchPointer(controller.hitLayer, "pointercancel", { pointerId: 1 });
    expect(controller.getGestureMode()).toBe("idle");
  });

  it("pointercancel suppresses tap and cancelActiveGesture keeps angles", () => {
    const layer = makeLayerWithMesh("fossil");
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 10, clientY: 10 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 40, clientY: 10 });
    const yaw = controller.getVisitorAngles("fossil").yaw;
    expect(yaw).not.toBe(0);
    controller.cancelActiveGesture();
    expect(controller.getGestureMode()).toBe("idle");
    expect(controller.getOpenId()).toBeNull();
    expect(controller.getVisitorAngles("fossil").yaw).toBeCloseTo(yaw, 10);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 10, clientY: 10 });
    dispatchPointer(controller.hitLayer, "pointercancel", { pointerId: 1 });
    expect(controller.getOpenId()).toBeNull();
  });

  it("does not rotate unrevealed objects and dispose during rotation is safe", () => {
    const layer = makeLayerWithMesh("evil-eye", { revealed: false });
    const mesh = layer.entries[0].content.children[0];
    mount(layer, mesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 120, clientY: 120 });
    // Raycast still returns mesh, but pickInterest filters !revealed — mock bypasses filter
    // because intersect returns object; pickInterest checks revealed before collecting meshes.
    // With revealed false, meshes list is empty → miss → pending with null interestId.
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 140, clientY: 120 });
    expect(controller.getGestureMode()).toBe("idle");
    expect(layer.entries[0].userRotation.rotation.z).toBeCloseTo(0, 10);

    const layer2 = makeLayerWithMesh("robot");
    const mesh2 = layer2.entries[0].content.children[0];
    controller.dispose();
    mount(layer2, mesh2);
    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 10, clientY: 10 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 40, clientY: 10 });
    expect(controller.getGestureMode()).toBe("rotating");
    controller.dispose();
    controller.dispose();
    controller = null;
  });

  it("isolates rotation between objects", () => {
    const layer = makeLayerWithMesh("book");
    layer.entries.push(...makeLayerWithMesh("robot").entries);
    const bookMesh = layer.entries[0].content.children[0];
    mount(layer, bookMesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 10, clientY: 10 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 50, clientY: 10 });
    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 50, clientY: 10 });

    expect(controller.getVisitorAngles("book").yaw).not.toBe(0);
    expect(controller.getVisitorAngles("robot").yaw).toBe(0);
    expect(layer.getEntry("robot").userRotation.rotation.z).toBeCloseTo(0, 10);
  });

  it("survives thousands of pointermoves without growing visitor angle entries beyond touched objects", () => {
    const layer = makeLayerWithMesh("book");
    layer.entries.push(...makeLayerWithMesh("robot").entries);
    const bookMesh = layer.entries[0].content.children[0];
    mount(layer, bookMesh);

    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 100, clientY: 100 });
    for (let i = 1; i <= 2000; i += 1) {
      dispatchPointer(controller.hitLayer, "pointermove", {
        clientX: 100 + 20 + (i % 5),
        clientY: 100,
      });
    }
    expect(controller.getGestureMode()).toBe("rotating");
    expect(controller.getVisitorAngles("book").yaw).not.toBe(0);
    expect(controller.getVisitorAngles("robot").yaw).toBe(0);
    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 140, clientY: 100 });
    expect(controller.getGestureMode()).toBe("idle");

    // Second object gesture — still only two logical angle slots max in practice.
    intersectSpy.mockReturnValue([{ object: layer.entries[1].content.children[0] }]);
    dispatchPointer(controller.hitLayer, "pointerdown", { clientX: 100, clientY: 100 });
    dispatchPointer(controller.hitLayer, "pointermove", { clientX: 130, clientY: 100 });
    dispatchPointer(controller.hitLayer, "pointerup", { clientX: 130, clientY: 100 });
    expect(controller.getVisitorAngles("robot").yaw).not.toBe(0);
  });
});

describe("interest userRotation hierarchy", () => {
  beforeEach(() => {
    mocks.loadInterestGlb.mockReset();
    mocks.loadInterestGlb.mockImplementation(async (_THREE, _src, options) => {
      const { model } = makeFittedContent(options.targetSize);
      return {
        model,
        bounds: {
          size: new THREE.Vector3(0.05, 0.05, options.targetSize),
          targetSize: options.targetSize,
          normScale: 1,
          nativeMetric: 1,
          scaleAxis: options.scaleAxis,
          minZ: 0,
        },
      };
    });
  });

  it("places identity userRotation between display and entrance without changing authored facing", async () => {
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS,
    });
    await layer.startLoading();

    for (const entry of layer.entries) {
      expect(entry.userRotation).toBeTruthy();
      expect(entry.userRotation.parent).toBe(entry.display);
      expect(entry.entrance.parent).toBe(entry.userRotation);
      expect(entry.userRotation.rotation.x).toBeCloseTo(0, 10);
      expect(entry.userRotation.rotation.y).toBeCloseTo(0, 10);
      expect(entry.userRotation.rotation.z).toBeCloseTo(0, 10);

      const expected = getInterestDisplayRotation(entry.config);
      expect(entry.display.rotation.x).toBeCloseTo(expected.x, 10);
      expect(entry.display.rotation.y).toBeCloseTo(expected.y, 10);
      expect(entry.display.rotation.z).toBeCloseTo(expected.z, 10);
    }

    const tilted = layer.getEntry("evil-eye");
    expect(tilted.config.displayTilt).toBeTruthy();
    tilted.userRotation.rotation.set(0.2, 0, 0.3);
    const displayAfter = getInterestDisplayRotation(tilted.config);
    expect(tilted.display.rotation.x).toBeCloseTo(displayAfter.x, 10);
    expect(tilted.display.rotation.y).toBeCloseTo(displayAfter.y, 10);
    expect(tilted.display.rotation.z).toBeCloseTo(displayAfter.z, 10);

    layer.dispose();
  });
});
