import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { INTEREST_OBJECTS } from "./interestObjectsConfig";
import { createInterestObjectsLayer } from "./createInterestObjectsLayer";
import {
  AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY,
  applyInterestLayoutToLayer,
  buildInterestLayoutFromLayer,
  getProductionInterestLayout,
  isInterestObjectsCalibrateEnabled,
  loadInterestLayoutFromStorage,
  normalizeInterestLayout,
  saveInterestLayoutToStorage,
} from "./interestObjectsCalibrateStorage";
import {
  displayYawFromTwist,
  findInterestRootFromObject,
  placementFromHitWithOffset,
  softClampPlacementUv,
  targetSizeFromPinch,
  touchOffsetFromHit,
} from "./interestObjectsCalibrateMath";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("interest calibrate flag", () => {
  it("enables only with arInterestsCalibrate=1", () => {
    expect(isInterestObjectsCalibrateEnabled({ search: "" })).toBe(false);
    expect(isInterestObjectsCalibrateEnabled({ search: "?foo=1" })).toBe(false);
    expect(isInterestObjectsCalibrateEnabled({ search: "?arInterestsCalibrate=1" })).toBe(true);
    expect(isInterestObjectsCalibrateEnabled({ forceFlag: true })).toBe(true);
  });
});

describe("interest calibrate math", () => {
  it("ascends mesh → ar-interest root", () => {
    const root = new THREE.Group();
    root.name = "ar-interest:robot";
    root.userData.interestId = "robot";
    const mid = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    root.add(mid);
    mid.add(mesh);
    expect(findInterestRootFromObject(mesh)).toEqual({ root, id: "robot" });
    expect(findInterestRootFromObject(mid)?.id).toBe("robot");
  });

  it("preserves touch offset for drag placement", () => {
    const origin = { u: 0.4, vTop: 0.2 };
    const hit = { u: 0.45, vTop: 0.22 };
    const offset = touchOffsetFromHit(origin, hit);
    expect(offset.u).toBeCloseTo(0.05, 5);
    expect(offset.vTop).toBeCloseTo(0.02, 5);
    const nextHit = { u: 0.5, vTop: 0.3 };
    const placed = placementFromHitWithOffset(nextHit, offset);
    expect(placed.u).toBeCloseTo(0.45, 5);
    expect(placed.vTop).toBeCloseTo(0.28, 5);
  });

  it("maps pinch distance to targetSize within limits", () => {
    expect(targetSizeFromPinch(100, 200, 0.1)).toBeCloseTo(0.2, 5);
    expect(targetSizeFromPinch(100, 10, 0.1)).toBeCloseTo(0.05, 5);
    expect(targetSizeFromPinch(100, 1000, 0.1)).toBeCloseTo(0.36, 5);
  });

  it("maps two-finger twist to displayYaw", () => {
    const start = 0;
    const current = Math.PI / 2;
    expect(displayYawFromTwist(start, current, 0.2)).toBeCloseTo(0.2 + Math.PI / 2, 5);
  });

  it("combines pinch size and twist yaw from the same two-finger gesture", () => {
    const size = targetSizeFromPinch(120, 180, 0.14);
    const yaw = displayYawFromTwist(0.1, 0.1 + 0.35, -0.5);
    expect(size).toBeCloseTo(0.21, 5);
    expect(yaw).toBeCloseTo(-0.15, 5);
  });

  it("soft-clamps UV onto the CV after release", () => {
    expect(softClampPlacementUv({ u: -0.2, vTop: 1.4 })).toEqual({ u: 0, vTop: 1 });
    expect(softClampPlacementUv({ u: 0.3, vTop: 0.7 })).toEqual({ u: 0.3, vTop: 0.7 });
  });
});

describe("interest calibrate storage + layer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("exports a complete JSON layout with complementary fields", () => {
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.slice(0, 2),
    });
    // Force edits on book.
    layer.applyPoseEdit("book", {
      origin: { u: 0.33, vTop: 0.44 },
      displayYaw: 1.25,
      targetSize: 0.17,
    });
    const layout = buildInterestLayoutFromLayer(layer);
    expect(layout.book.placement).toEqual({ u: 0.33, v: 0.44 });
    expect(layout.book.displayYaw).toBeCloseTo(1.25, 5);
    expect(layout.book.targetSize).toBeCloseTo(0.17, 5);
    expect(layout.book.canonicalRotation).toBeTruthy();
    expect(layout.book.displayTilt).toBeTruthy();
    expect(typeof layout.book.groundOffset).toBe("number");
    layer.dispose();
  });

  it("persists and restores layout from localStorage", () => {
    const production = getProductionInterestLayout();
    const edited = normalizeInterestLayout({
      ...production,
      robot: {
        ...production.robot,
        placement: { u: 0.11, v: 0.22 },
        displayYaw: 0.9,
        targetSize: 0.19,
      },
    });
    expect(saveInterestLayoutToStorage(edited)).toBe(true);
    expect(localStorage.getItem(AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY)).toBeTruthy();
    const loaded = loadInterestLayoutFromStorage();
    expect(loaded.robot.placement).toEqual({ u: 0.11, v: 0.22 });
    expect(loaded.robot.displayYaw).toBeCloseTo(0.9, 5);
    expect(loaded.robot.targetSize).toBeCloseTo(0.19, 5);
  });

  it("reset selected restores production for one id only", () => {
    const layer = createInterestObjectsLayer(THREE, { items: INTEREST_OBJECTS });
    layer.applyPoseEdit("plant", {
      origin: { u: 0.9, vTop: 0.9 },
      displayYaw: 2,
      targetSize: 0.3,
    });
    layer.applyPoseEdit("book", {
      origin: { u: 0.1, vTop: 0.1 },
      displayYaw: 1,
    });
    const production = getProductionInterestLayout();
    const plant = production.plant;
    layer.applyPoseEdit("plant", {
      origin: { u: plant.placement.u, vTop: plant.placement.v },
      displayYaw: plant.displayYaw,
      targetSize: plant.targetSize,
      displayTilt: plant.displayTilt,
      groundOffset: plant.groundOffset,
    });
    const plantSnap = layer.getConfigSnapshot("plant");
    const bookSnap = layer.getConfigSnapshot("book");
    expect(plantSnap.origin.u).toBeCloseTo(production.plant.placement.u, 5);
    expect(plantSnap.displayYaw).toBeCloseTo(production.plant.displayYaw, 5);
    expect(bookSnap.origin.u).toBeCloseTo(0.1, 5);
    expect(bookSnap.displayYaw).toBeCloseTo(1, 5);
    layer.dispose();
  });

  it("reset all restores production for every asset", () => {
    const layer = createInterestObjectsLayer(THREE, { items: INTEREST_OBJECTS });
    INTEREST_OBJECTS.forEach((item) => {
      layer.applyPoseEdit(item.id, {
        origin: { u: 0.01, vTop: 0.99 },
        displayYaw: 3,
        targetSize: 0.3,
      });
    });
    applyInterestLayoutToLayer(layer, getProductionInterestLayout());
    const production = getProductionInterestLayout();
    INTEREST_OBJECTS.forEach((item) => {
      const snap = layer.getConfigSnapshot(item.id);
      expect(snap.origin.u).toBeCloseTo(production[item.id].placement.u, 5);
      expect(snap.displayYaw).toBeCloseTo(production[item.id].displayYaw, 5);
      expect(snap.targetSize).toBeCloseTo(production[item.id].targetSize, 5);
    });
    layer.dispose();
  });
});

describe("interest calibrate runtime isolation", () => {
  it("normal adapter path does not read calibrate storage unless flag is set", () => {
    const adapterSrc = readFileSync(
      path.join(rootDir, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapterSrc).toMatch(/isInterestObjectsCalibrateEnabled/);
    expect(adapterSrc).toMatch(/createInterestObjectsCalibrate/);
    expect(adapterSrc).toMatch(/arInterestsCalibrate|resolveInterestCalibrateEnabled/);
    // Storage load happens inside calibrate factory, not on every start unconditionally.
    expect(adapterSrc).not.toMatch(/loadInterestLayoutFromStorage\(\)/);
  });

  it("calibrate module has no lookAt/billboard", () => {
    const src = readFileSync(
      path.join(rootDir, "src/components/ar/createInterestObjectsCalibrate.js"),
      "utf8",
    );
    expect(src).not.toMatch(/\.lookAt\s*\(/);
    expect(src).not.toMatch(/billboard/i);
  });
});

describe("interest calibrate gestures (controller smoke)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Do not invoke the callback synchronously (would recurse via tick → rAF → tick).
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("wires pointer listeners and cleans them up", async () => {
    const { createInterestObjectsCalibrate } = await import("./createInterestObjectsCalibrate.js");
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.slice(0, 1),
    });
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 300, height: 600, right: 300, bottom: 600 }),
    });
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera();
    const shell = document.createElement("div");
    document.body.appendChild(shell);

    const addSpy = vi.spyOn(canvas, "addEventListener");
    const removeSpy = vi.spyOn(canvas, "removeEventListener");
    const calibrate = createInterestObjectsCalibrate({
      THREE,
      layer,
      camera,
      domElement: canvas,
      shell,
    });

    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function), expect.any(Object));
    expect(addSpy).toHaveBeenCalledWith("pointermove", expect.any(Function), expect.any(Object));
    expect(addSpy).toHaveBeenCalledWith("pointerup", expect.any(Function), expect.any(Object));
    expect(addSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function), expect.any(Object));
    expect(canvas.style.touchAction).toBe("none");

    calibrate.dispose();
    expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function), expect.any(Object));
    expect(document.querySelector("[data-ar-interests-calibrate-ui='true']")).toBeNull();
    layer.dispose();
  });

  it("save final layout writes storage and exposes export JSON", async () => {
    const { createInterestObjectsCalibrate } = await import("./createInterestObjectsCalibrate.js");
    const layer = createInterestObjectsLayer(THREE, { items: INTEREST_OBJECTS });
    layer.applyPoseEdit("fossil", {
      origin: { u: 0.55, vTop: 0.35 },
      displayYaw: -0.4,
      targetSize: 0.21,
    });
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const shell = document.createElement("div");
    document.body.appendChild(shell);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const calibrate = createInterestObjectsCalibrate({
      THREE,
      layer,
      camera: new THREE.PerspectiveCamera(),
      domElement: canvas,
      shell,
    });

    const saveBtn = [...shell.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Save final layout"),
    );
    expect(saveBtn).toBeTruthy();
    await saveBtn.click();
    expect(writeText).toHaveBeenCalled();
    const stored = loadInterestLayoutFromStorage();
    expect(stored.fossil.placement.u).toBeCloseTo(0.55, 5);
    expect(stored.fossil.targetSize).toBeCloseTo(0.21, 5);
    expect(stored.fossil.canonicalRotation).toBeTruthy();
    calibrate.dispose();
    layer.dispose();
  });

  it("pointercancel clears gesture mode without throwing", async () => {
    const { createInterestObjectsCalibrate } = await import("./createInterestObjectsCalibrate.js");
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.slice(0, 1),
    });
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const shell = document.createElement("div");
    document.body.appendChild(shell);
    const calibrate = createInterestObjectsCalibrate({
      THREE,
      layer,
      camera: new THREE.PerspectiveCamera(),
      domElement: canvas,
      shell,
    });
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointercancel", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    );
    expect(calibrate.getSelectedId()).toBeNull();
    calibrate.dispose();
    layer.dispose();
  });
});
