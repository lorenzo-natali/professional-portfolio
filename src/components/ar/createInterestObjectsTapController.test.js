import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createInterestObjectsTapController,
  findInterestRootFromObject,
} from "./createInterestObjectsTapController";
import { INTEREST_OBJECT_CARDS } from "./interestObjectsContent";

function makeLayerWithMesh(id) {
  const root = new THREE.Group();
  root.userData.interestId = id;
  const content = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  content.add(mesh);
  root.add(content);
  root.position.set(0, 0, -1);

  return {
    entries: [
      {
        id,
        root,
        content,
        revealed: true,
        loaded: true,
      },
    ],
    getEntry(entryId) {
      return this.entries.find((entry) => entry.id === entryId) ?? null;
    },
  };
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
    controller?.dispose();
    controller = null;
    shell?.remove();
  });

  it("reuses a single card and toggles open/close for the same object", () => {
    const layer = makeLayerWithMesh("robot");
    const camera = new THREE.PerspectiveCamera(50, 300 / 500, 0.1, 10);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    controller = createInterestObjectsTapController({
      THREE,
      layer,
      camera,
      domElement: canvas,
      container,
      shell,
    });

    const cards = () => document.querySelectorAll("[data-ar-interest-info-card='true']");
    expect(cards()).toHaveLength(1);

    // Force open via public API (raycast depends on projection in jsdom).
    controller.open("robot");
    expect(controller.getOpenId()).toBe("robot");
    expect(cards()[0].classList.contains("is-open")).toBe(true);
    expect(cards()[0].textContent).toContain(INTEREST_OBJECT_CARDS.robot.title);
    expect(cards()[0].textContent).toContain(INTEREST_OBJECT_CARDS.robot.body);

    controller.handleTap(10, 10); // miss → close
    expect(controller.getOpenId()).toBeNull();

    controller.open("robot");
    controller.open("book");
    expect(controller.getOpenId()).toBe("book");
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain(INTEREST_OBJECT_CARDS.book.title);

    // Same object again via open path used by toggle semantics:
    // simulate toggle by closing when already open.
    const openId = controller.getOpenId();
    expect(openId).toBe("book");
    controller.close({ animate: false });
    expect(controller.getOpenId()).toBeNull();
  });

  it("keeps at most one open card when switching objects", () => {
    const layer = makeLayerWithMesh("plant");
    layer.entries.push(...makeLayerWithMesh("fossil").entries);
    const camera = new THREE.PerspectiveCamera();
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    controller = createInterestObjectsTapController({
      THREE,
      layer,
      camera,
      domElement: canvas,
      container,
      shell,
    });

    controller.open("plant");
    controller.open("fossil");
    expect(controller.getOpenId()).toBe("fossil");
    expect(document.querySelectorAll("[data-ar-interest-info-card='true']")).toHaveLength(1);
    expect(document.body.textContent).toContain(INTEREST_OBJECT_CARDS.fossil.title);
    expect(document.body.textContent).not.toContain(INTEREST_OBJECT_CARDS.plant.title);
  });

  it("exports exact production copy for all six interests", () => {
    expect(Object.keys(INTEREST_OBJECT_CARDS).sort()).toEqual(
      ["backpack", "book", "evil-eye", "fossil", "plant", "robot"].sort(),
    );
    expect(INTEREST_OBJECT_CARDS.robot.title).toBe("AI & Intelligent Systems");
    expect(INTEREST_OBJECT_CARDS["evil-eye"].title).toBe("Horror & Psychological Fiction");
    expect(INTEREST_OBJECT_CARDS.book.title).toBe("Reading");
    expect(INTEREST_OBJECT_CARDS.fossil.title).toBe("History");
    expect(INTEREST_OBJECT_CARDS.plant.title).toBe("Gardening");
    expect(INTEREST_OBJECT_CARDS.backpack.title).toBe("Travel");
  });

});
