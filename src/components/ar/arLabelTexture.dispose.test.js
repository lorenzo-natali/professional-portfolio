import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { disposeObject3DResources } from "./arLabelTexture";

describe("disposeObject3DResources", () => {
  it("disposes all material texture maps once when shared", () => {
    const shared = { dispose: vi.fn() };
    const mapA = { dispose: vi.fn() };
    const normal = shared;
    const roughness = shared;

    const mat = {
      map: mapA,
      normalMap: normal,
      roughnessMap: roughness,
      metalnessMap: { dispose: vi.fn() },
      aoMap: { dispose: vi.fn() },
      emissiveMap: { dispose: vi.fn() },
      alphaMap: { dispose: vi.fn() },
      bumpMap: { dispose: vi.fn() },
      displacementMap: { dispose: vi.fn() },
      lightMap: { dispose: vi.fn() },
      clearcoatMap: { dispose: vi.fn() },
      clearcoatNormalMap: { dispose: vi.fn() },
      clearcoatRoughnessMap: { dispose: vi.fn() },
      transmissionMap: { dispose: vi.fn() },
      thicknessMap: { dispose: vi.fn() },
      specularMap: { dispose: vi.fn() },
      specularColorMap: { dispose: vi.fn() },
      specularIntensityMap: { dispose: vi.fn() },
      dispose: vi.fn(),
    };

    const geo = { dispose: vi.fn() };
    const mesh = new THREE.Mesh();
    mesh.geometry = geo;
    mesh.material = mat;
    const root = new THREE.Group();
    root.add(mesh);

    disposeObject3DResources(root);

    expect(mapA.dispose).toHaveBeenCalledTimes(1);
    expect(shared.dispose).toHaveBeenCalledTimes(1);
    expect(mat.metalnessMap.dispose).toHaveBeenCalledTimes(1);
    expect(mat.transmissionMap.dispose).toHaveBeenCalledTimes(1);
    expect(mat.dispose).toHaveBeenCalledTimes(1);
    expect(geo.dispose).toHaveBeenCalledTimes(1);
  });
});
