import { describe, expect, it, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { INTEREST_OBJECTS } from "./interestObjectsConfig";

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

import { createInterestObjectsLayer } from "./createInterestObjectsLayer";
import { INTEREST_ENTRANCE } from "./interestObjectsConfig";

function makeFittedContent(targetSize = 0.1) {
  const geo = new THREE.BoxGeometry(0.05, 0.05, targetSize);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    opacity: 1,
    transparent: false,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = targetSize / 2;
  const root = new THREE.Group();
  root.add(mesh);
  return root;
}

describe("createInterestObjectsLayer", () => {
  beforeEach(() => {
    mocks.loadInterestGlb.mockReset();
    mocks.loadInterestGlb.mockImplementation(async (_THREE, src, options) => {
      const model = makeFittedContent(options.targetSize);
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

  it("mounts placeholders synchronously and loads models in the background", async () => {
    const onItemLoaded = vi.fn();
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS,
      onItemLoaded,
    });
    expect(layer.entries).toHaveLength(6);
    expect(layer.placement.visible).toBe(false);
    expect(layer.entries.every((entry) => entry.loaded === false)).toBe(true);

    const loading = layer.startLoading();
    expect(layer.entries[0].entrance.position.z).toBeCloseTo(INTEREST_ENTRANCE.riseFromZ, 5);
    await loading;

    expect(mocks.loadInterestGlb).toHaveBeenCalledTimes(6);
    expect(onItemLoaded).toHaveBeenCalledTimes(6);
    expect(layer.entries.every((entry) => entry.loaded)).toBe(true);

    layer.applyEntranceProgress("book", 1);
    const book = layer.getEntry("book");
    expect(book.entrance.position.z).toBeCloseTo(0, 5);
    expect(book.entrance.position.y).toBeCloseTo(0, 5);
    expect(book.entrance.scale.x).toBeCloseTo(1, 5);

    layer.dispose();
  });

  it("isolates a single asset failure without blocking the others", async () => {
    mocks.loadInterestGlb.mockImplementation(async (_THREE, src, options) => {
      if (String(src).includes("robot")) throw new Error("network fail");
      const model = makeFittedContent(options.targetSize);
      return { model, bounds: { targetSize: options.targetSize, minZ: 0 } };
    });
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS,
    });
    await layer.startLoading();
    expect(layer.getEntry("robot").loaded).toBe(false);
    expect(layer.getEntry("book").loaded).toBe(true);
    expect(layer.getEntry("plant").loaded).toBe(true);
    layer.dispose();
  });

  it("ignores late async loads after dispose", async () => {
    let release;
    mocks.loadInterestGlb.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              model: makeFittedContent(0.1),
              bounds: { targetSize: 0.1, minZ: 0 },
            });
        }),
    );
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.slice(0, 1),
    });
    const loading = layer.startLoading();
    layer.dispose();
    release();
    await loading;
    expect(layer.entries).toHaveLength(0);
  });
});
