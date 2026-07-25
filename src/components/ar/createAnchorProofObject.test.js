import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createAnchorProofObject, isVisuallyPresentObject3D } from "./createAnchorProofObject";

describe("createAnchorProofObject", () => {
  it("creates a visible Object3D group suitable for MindAR anchor.group", () => {
    const proof = createAnchorProofObject(THREE);

    expect(proof.isGroup || proof.type === "Group").toBeTruthy();
    expect(proof.name).toBe("ar-anchor-proof");
    expect(proof.children.length).toBeGreaterThanOrEqual(1);
    expect(isVisuallyPresentObject3D(proof)).toBe(true);
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
