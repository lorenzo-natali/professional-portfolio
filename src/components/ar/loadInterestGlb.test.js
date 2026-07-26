import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  assembleInterestContent,
  assertNoNegativeScale,
  measureScaleAxis,
  prepareInterestMaterials,
  setInterestOpacity,
} from "./loadInterestGlb";
import {
  INTEREST_CANONICAL_IDENTITY,
  INTEREST_CANONICAL_Y_UP_TO_Z_UP,
} from "./interestObjectsConfig";

function makeBoxModel(width, height, depth) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      opacity: 1,
      transparent: false,
      depthWrite: true,
    }),
  );
  mesh.position.set(0, height / 2, 0);
  const root = new THREE.Group();
  root.add(mesh);
  return root;
}

describe("assembleInterestContent grounding", () => {
  it("grounds on Z = 0 after canonicalRotation and scale, extending +Z", () => {
    const model = makeBoxModel(1, 2, 0.5);
    const { content, bounds } = assembleInterestContent(THREE, model, {
      targetSize: 0.1,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });

    content.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(content);
    expect(box.min.z).toBeCloseTo(0, 5);
    expect(bounds.minZ).toBeCloseTo(0, 5);
    expect(box.max.z).toBeGreaterThan(0.05);
    expect(bounds.maxZ).toBeGreaterThan(0.05);
    const center = new THREE.Vector3();
    box.getCenter(center);
    expect(center.x).toBeCloseTo(0, 4);
    expect(center.y).toBeCloseTo(0, 4);
  });

  it("maps glTF +Y to document +Z with +π/2 (not −π/2)", () => {
    // Head marker at +Y in native glTF space.
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    head.position.set(0, 2, 0);
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4));
    feet.position.set(0, 0.05, 0);
    const root = new THREE.Group();
    root.add(feet, head);

    const { content } = assembleInterestContent(THREE, root, {
      targetSize: 0.2,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    content.updateMatrixWorld(true);

    const headWorld = new THREE.Vector3();
    const feetWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    feet.getWorldPosition(feetWorld);
    expect(headWorld.z).toBeGreaterThan(feetWorld.z);
    expect(INTEREST_CANONICAL_Y_UP_TO_Z_UP.x).toBeCloseTo(Math.PI / 2, 10);
    expect(INTEREST_CANONICAL_Y_UP_TO_Z_UP.x).not.toBeCloseTo(-Math.PI / 2, 10);
  });

  it("does not bake display yaw into content seating", () => {
    const model = makeBoxModel(1, 2, 0.5);
    const { content } = assembleInterestContent(THREE, model, {
      targetSize: 0.1,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    expect(content.rotation.x).toBeCloseTo(0, 10);
    expect(content.rotation.y).toBeCloseTo(0, 10);
    expect(content.rotation.z).toBeCloseTo(0, 10);
  });

  it("keeps identity canonicalRotation independent (fossil path)", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 2));
    mesh.position.set(0, 0, 1);
    const root = new THREE.Group();
    root.add(mesh);
    const { content, bounds } = assembleInterestContent(THREE, root, {
      targetSize: 0.2,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_IDENTITY,
    });
    content.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(content);
    expect(bounds.canonicalRotation).toEqual(INTEREST_CANONICAL_IDENTITY);
    expect(box.min.z).toBeCloseTo(0, 5);
    expect(box.max.z).toBeGreaterThan(0.1);
  });

  it("normalizes the book with scaleAxis max into a miniature footprint", () => {
    const model = makeBoxModel(1.9, 0.35, 1.35);
    const { content, bounds } = assembleInterestContent(THREE, model, {
      targetSize: 0.11,
      scaleAxis: "max",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    content.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(content);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(bounds.scaleAxis).toBe("max");
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(0.11, 3);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.2);
    expect(box.min.z).toBeCloseTo(0, 5);
  });

  it("never introduces negative scale", () => {
    const model = makeBoxModel(1, 2, 0.5);
    const { content, bounds } = assembleInterestContent(THREE, model, {
      targetSize: 0.1,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    expect(assertNoNegativeScale(content)).toBe(true);
    expect(bounds.normScale).toBeGreaterThan(0);
  });

  it("measureScaleAxis supports x/y/z/max", () => {
    const size = { x: 2, y: 0.5, z: 1 };
    expect(measureScaleAxis(size, "x")).toBe(2);
    expect(measureScaleAxis(size, "y")).toBe(0.5);
    expect(measureScaleAxis(size, "z")).toBe(1);
    expect(measureScaleAxis(size, "max")).toBe(2);
  });
});

describe("interest material entrance restore", () => {
  it("restores authored opaque materials after fade-in completes", () => {
    const model = makeBoxModel(1, 1, 1);
    const { content } = assembleInterestContent(THREE, model, {
      targetSize: 0.1,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    prepareInterestMaterials(content);
    /** @type {import("three").Mesh | null} */
    let mesh = null;
    content.traverse((node) => {
      if (node.isMesh && !mesh) mesh = node;
    });
    const mat = mesh.material;
    expect(mat.opacity).toBe(0);
    expect(mat.transparent).toBe(true);

    setInterestOpacity(content, 0.5);
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);

    setInterestOpacity(content, 1);
    expect(mat.opacity).toBe(1);
    expect(mat.transparent).toBe(false);
    expect(mat.depthWrite).toBe(true);
  });

  it("restores materials that were authored transparent", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.4,
        transparent: true,
        depthWrite: false,
      }),
    );
    const root = new THREE.Group();
    root.add(mesh);
    const { content } = assembleInterestContent(THREE, root, {
      targetSize: 0.1,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    prepareInterestMaterials(content);
    /** @type {import("three").Mesh | null} */
    let prepared = null;
    content.traverse((node) => {
      if (node.isMesh && !prepared) prepared = node;
    });
    const mat = prepared.material;
    expect(mat.userData.baseTransparent).toBe(true);
    expect(mat.userData.baseOpacity).toBeCloseTo(0.4, 5);
    expect(mat.userData.baseDepthWrite).toBe(false);

    setInterestOpacity(content, 0.5);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.2, 5);

    setInterestOpacity(content, 1);
    expect(mat.opacity).toBeCloseTo(0.4, 5);
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
  });
});
