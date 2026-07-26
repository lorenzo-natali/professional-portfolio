import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applySpatialCollectibleMaterials,
  classifyCollectibleRegion,
  createCollectiblePhysicalMaterial,
  meshHasBakedShading,
  preserveImportedCollectibleMaterials,
  upgradeCollectibleMeshMaterials,
} from "./upgradeCollectibleMaterials";

describe("upgradeCollectibleMaterials", () => {
  it("classifies shell / accessory / figure regions from normalized coords", () => {
    expect(classifyCollectibleRegion(0.02, 0.5, 0.5)).toBe("shell");
    expect(classifyCollectibleRegion(0.5, 0.5, 0.95)).toBe("acrylic");
    expect(classifyCollectibleRegion(0.18, 0.48, 0.4)).toBe("ai");
    expect(classifyCollectibleRegion(0.5, 0.5, 0.5)).toBe("figure");
  });

  it("detects baked shading when normals and textures exist", () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const map = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map });
    const mesh = new THREE.Mesh(geometry, material);
    expect(meshHasBakedShading(mesh)).toBe(true);

    const raw = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
      ),
      new THREE.MeshStandardMaterial(),
    );
    expect(meshHasBakedShading(raw)).toBe(false);
  });

  it("preserves imported textures and PBR values for textured meshes", () => {
    const geometry = new THREE.BoxGeometry(1, 2, 0.5);
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      metalness: 0.33,
      roughness: 0.66,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const beforeUuid = material.uuid;

    const result = upgradeCollectibleMeshMaterials(THREE, mesh);

    expect(result.mode).toBe("preserve");
    expect(mesh.material).toBe(material);
    expect(mesh.material.uuid).toBe(beforeUuid);
    expect(mesh.material.map).toBe(map);
    expect(mesh.material.normalMap).toBe(normalMap);
    expect(mesh.material.metalness).toBeCloseTo(0.33, 5);
    expect(mesh.material.roughness).toBeCloseTo(0.66, 5);
    expect(mesh.material.userData.materialSource).toBe("imported");
    expect(result.materials[0].userData.materialSource).toBe("imported");
    if ("encoding" in map && "sRGBEncoding" in THREE) {
      expect(map.encoding).toBe(THREE.sRGBEncoding);
      expect(normalMap.encoding).toBe(THREE.LinearEncoding);
    } else if ("SRGBColorSpace" in THREE) {
      expect(map.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(normalMap.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    }
  });

  it("applies spatial classification only as fallback for texture-less meshes", () => {
    const geometry = new THREE.BoxGeometry(1, 2, 0.5);
    const beforeUuid = geometry.uuid;
    const beforeCount = geometry.attributes.position.count;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

    const result = applySpatialCollectibleMaterials(THREE, mesh);

    expect(result.mode).toBe("spatial-fallback");
    expect(geometry.uuid).toBe(beforeUuid);
    expect(geometry.attributes.position.count).toBe(beforeCount);
    expect(geometry.groups.length).toBeGreaterThan(0);
    expect(Array.isArray(mesh.material)).toBe(true);
    expect(result.materials.every((m) => m.userData.materialSource === "spatial-fallback")).toBe(
      true,
    );
  });

  it("creates MeshPhysicalMaterial presets with preserved base opacity", () => {
    const material = createCollectiblePhysicalMaterial(THREE, {
      color: "#2c3138",
      metalness: 0.2,
      roughness: 0.7,
      opacity: 0.5,
      transparent: true,
      _region: "shell",
    });
    expect(material.type).toMatch(/MeshPhysicalMaterial|MeshStandardMaterial/);
    expect(material.userData.baseOpacity).toBe(0.5);
    expect(material.userData.region).toBe("shell");
  });

  it("preserveImportedCollectibleMaterials keeps the same material instance", () => {
    const material = new THREE.MeshStandardMaterial({
      map: new THREE.Texture(),
      metalness: 0.2,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    const result = preserveImportedCollectibleMaterials(THREE, mesh);
    expect(result.materials[0]).toBe(material);
  });
});
