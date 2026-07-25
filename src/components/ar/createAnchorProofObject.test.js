import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { AR_SHOW_ANCHOR_PROOF } from "./arDebug";
import { DOCUMENT_HEIGHT, DOCUMENT_PLANE_Z, DOCUMENT_WIDTH } from "./arDocumentPlane";
import {
  createAnchorProofObject,
  getProofFrameDimensions,
  isVisuallyPresentObject3D,
} from "./createAnchorProofObject";

describe("createAnchorProofObject", () => {
  it("keeps the production debug flag disabled by default", () => {
    expect(AR_SHOW_ANCHOR_PROOF).toBe(false);
  });

  it("creates a visible Object3D group suitable for MindAR anchor.group", () => {
    const proof = createAnchorProofObject(THREE);

    expect(proof.isGroup || proof.type === "Group").toBeTruthy();
    expect(proof.name).toBe("ar-anchor-proof");
    expect(proof.children.length).toBeGreaterThanOrEqual(1);
    expect(isVisuallyPresentObject3D(proof)).toBe(true);
  });

  it("matches the calibrated document plane size and is centered at the target origin", () => {
    const proof = createAnchorProofObject(THREE);
    const dims = getProofFrameDimensions(proof);

    expect(dims).toEqual({
      width: DOCUMENT_WIDTH,
      height: DOCUMENT_HEIGHT,
      center: { x: 0, y: 0, z: DOCUMENT_PLANE_Z },
    });

    const fill = proof.getObjectByName("ar-anchor-proof-fill");
    const frame = proof.getObjectByName("ar-anchor-proof-frame");
    expect(fill.geometry.parameters.width).toBeCloseTo(DOCUMENT_WIDTH, 10);
    expect(fill.geometry.parameters.height).toBeCloseTo(DOCUMENT_HEIGHT, 10);
    expect(fill.position.x).toBe(0);
    expect(fill.position.y).toBe(0);
    expect(frame.position.x).toBe(0);
    expect(frame.position.y).toBe(0);
    expect(frame.position.z).toBe(DOCUMENT_PLANE_Z);
    expect(frame.position.z).toBeGreaterThan(0);
    expect(frame.position.z).toBeLessThan(0.05);
  });

  it("follows a mocked anchor transform (matrix inheritance)", () => {
    const anchor = new THREE.Group();
    const proof = createAnchorProofObject(THREE);
    anchor.add(proof);

    const matrix = new THREE.Matrix4().makeTranslation(2, -1, 0.5).multiply(
      new THREE.Matrix4().makeRotationZ(Math.PI / 6),
    );
    anchor.matrix.copy(matrix);
    anchor.matrixAutoUpdate = false;
    anchor.updateMatrixWorld(true);

    const world = new THREE.Vector3();
    proof.getWorldPosition(world);
    expect(world.x).toBeCloseTo(2, 5);
    expect(world.y).toBeCloseTo(-1, 5);
    expect(world.z).toBeCloseTo(0.5, 5);
  });
});
