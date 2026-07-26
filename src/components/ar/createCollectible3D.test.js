import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createCollectible3D } from "./createCollectible3D";
import {
  COLLECTIBLE_GLB_SRC,
  COLLECTIBLE_ORIGIN,
  COLLECTIBLE_RAW_GLB_SRC,
  COLLECTIBLE_TEXTURED_GLB_SRC,
  COLLECTIBLE_TRANSFORM,
} from "./collectibleConfig";
import { PROFESSIONAL_CARD_INTERACTION } from "./professionalCardConfig";

function createTexturedLoader() {
  return {
    async loadAsync() {
      const scene = new THREE.Group();
      scene.name = "synthetic-textured-collectible";
      const map = new THREE.Texture();
      map.name = "base_color";
      const normalMap = new THREE.Texture();
      normalMap.name = "normal";
      const material = new THREE.MeshStandardMaterial({
        map,
        normalMap,
        metalness: 0.25,
        roughness: 0.55,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.55), material);
      mesh.name = "mesh_node";
      scene.add(mesh);
      return { scene, animations: [] };
    },
  };
}

function createRawLoader() {
  return {
    async loadAsync() {
      const scene = new THREE.Group();
      const geometry = new THREE.BufferGeometry();
      // Minimal triangle — positions only (no normals attribute until computed).
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0], 3),
      );
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
      scene.add(mesh);
      return { scene, animations: [] };
    },
  };
}

describe("createCollectible3D", () => {
  it("uses the optimized web GLB as the canonical live asset URL", () => {
    expect(COLLECTIBLE_GLB_SRC).toMatch(/collectible_web\.glb$/);
    expect(COLLECTIBLE_TEXTURED_GLB_SRC).toMatch(/collectible_textured\.glb$/);
    expect(COLLECTIBLE_RAW_GLB_SRC).toMatch(/collectible_raw\.glb$/);
    expect(COLLECTIBLE_GLB_SRC).not.toEqual(COLLECTIBLE_TEXTURED_GLB_SRC);
    expect(COLLECTIBLE_GLB_SRC).not.toEqual(COLLECTIBLE_RAW_GLB_SRC);
  });

  it("preserves hierarchy and gesture ownership on the interaction node", async () => {
    const artifact = await createCollectible3D(THREE, {
      url: COLLECTIBLE_GLB_SRC,
      loader: createTexturedLoader(),
    });

    expect(artifact.group.name).toBe("ar-collectible");
    expect(artifact.placement.parent).toBe(artifact.group);
    expect(artifact.interaction.parent).toBe(artifact.placement);
    expect(artifact.anim.parent).toBe(artifact.interaction);
    expect(artifact.modelRoot.parent).toBe(artifact.anim);
    expect(artifact.interactionConfig).toEqual(PROFESSIONAL_CARD_INTERACTION);
    expect(artifact.initialScale).toBe(COLLECTIBLE_TRANSFORM.scale);
    expect(artifact.group.userData.calibration.origin).toEqual(COLLECTIBLE_ORIGIN);
    expect(artifact.group.userData.calibration.src).toMatch(/collectible_web\.glb$/);

    // Gesture ownership: rotate + pinch act on interaction, never raw MindAR anchor.
    expect(artifact.interaction.name).toBe("ar-collectible-interaction");
    expect(typeof artifact.resetInteractionPose).toBe("function");
    artifact.interaction.rotation.y = 0.4;
    artifact.interaction.scale.setScalar(0.4);
    artifact.resetInteractionPose();
    expect(artifact.interaction.rotation.y).toBeCloseTo(COLLECTIBLE_TRANSFORM.rotation.y, 5);
    expect(artifact.interaction.scale.x).toBeCloseTo(COLLECTIBLE_TRANSFORM.scale, 5);

    artifact.dispose();
  });

  it("preserves imported textures/materials for baked PBR assets", async () => {
    const loader = createTexturedLoader();
    const loadSpy = vi.spyOn(loader, "loadAsync");
    const artifact = await createCollectible3D(THREE, {
      url: COLLECTIBLE_GLB_SRC,
      loader,
    });

    expect(loadSpy).toHaveBeenCalledWith(COLLECTIBLE_GLB_SRC);
    expect(artifact.materialMode).toBe("preserve");

    const mesh = artifact.modelRoot.getObjectByName("mesh_node");
    expect(mesh.material.map).toBeTruthy();
    expect(mesh.material.normalMap).toBeTruthy();
    expect(mesh.material.metalness).toBeCloseTo(0.25, 5);
    expect(mesh.material.roughness).toBeCloseTo(0.55, 5);
    expect(mesh.material.userData.materialSource).toBe("imported");
    expect(Array.isArray(mesh.material)).toBe(false);

    artifact.dispose();
  });

  it("still applies spatial fallback for the raw asset", async () => {
    const artifact = await createCollectible3D(THREE, {
      url: COLLECTIBLE_RAW_GLB_SRC,
      loader: createRawLoader(),
    });

    expect(artifact.materialMode).toBe("spatial-fallback");
    expect(
      artifact.materials.every((m) => m.userData.materialSource === "spatial-fallback"),
    ).toBe(true);

    artifact.dispose();
  });

  it("records fallback usage when the primary web asset cannot load", async () => {
    const texturedScene = new THREE.Group();
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    texturedScene.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map, normalMap }),
      ),
    );
    const loader = {
      loadAsync: vi
        .fn()
        .mockRejectedValueOnce(new Error("decode failed"))
        .mockResolvedValueOnce({ scene: texturedScene, animations: [] }),
    };

    const artifact = await createCollectible3D(THREE, {
      url: COLLECTIBLE_GLB_SRC,
      loader,
    });

    expect(artifact.group.userData.usedFallback).toBe(true);
    expect(artifact.group.userData.calibration.src).toBe(COLLECTIBLE_TEXTURED_GLB_SRC);

    artifact.dispose();
  });

  it("starts invisible and supports opacity helpers used by entrance animation", async () => {
    const artifact = await createCollectible3D(THREE, { loader: createTexturedLoader() });
    expect(artifact.group.visible).toBe(false);
    expect(artifact.getOpacity()).toBeCloseTo(0, 2);
    artifact.setOpacity(1);
    expect(artifact.getOpacity()).toBeCloseTo(1, 2);
    expect(() => artifact.dispose()).not.toThrow();
  });
});
