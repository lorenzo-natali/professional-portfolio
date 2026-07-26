import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  COLLECTIBLE_GLB_SRC,
  COLLECTIBLE_TEXTURED_GLB_SRC,
} from "./collectibleConfig";
import {
  configureCollectibleGlbLoader,
  loadCollectibleGlb,
} from "./loadCollectibleGlb";

describe("collectible asset URLs", () => {
  it("uses the optimized web GLB as the canonical live asset", () => {
    expect(COLLECTIBLE_GLB_SRC).toMatch(/collectible_web\.glb$/);
    expect(COLLECTIBLE_GLB_SRC).toMatch(/(^|\/)ar\/collectible\//);
  });

  it("keeps the original textured GLB available as fallback/reference", () => {
    expect(COLLECTIBLE_TEXTURED_GLB_SRC).toMatch(/collectible_textured\.glb$/);
    expect(COLLECTIBLE_TEXTURED_GLB_SRC).not.toEqual(COLLECTIBLE_GLB_SRC);
  });

  it("builds production-safe BASE_URL-prefixed paths", () => {
    // Vite injects BASE_URL (e.g. "/" or "/professional-portfolio/").
    expect(COLLECTIBLE_GLB_SRC.startsWith("/") || COLLECTIBLE_GLB_SRC.includes("://")).toBe(
      true,
    );
    expect(COLLECTIBLE_TEXTURED_GLB_SRC.startsWith("/") || COLLECTIBLE_TEXTURED_GLB_SRC.includes("://")).toBe(
      true,
    );
  });
});

describe("configureCollectibleGlbLoader", () => {
  it("reports unsupported when the loader cannot accept a Meshopt decoder", async () => {
    const info = await configureCollectibleGlbLoader({});
    expect(info).toEqual({ meshopt: false, reason: "loader-unsupported" });
  });

  it("configures MeshoptDecoder on a real GLTFLoader for Pages-safe decode", async () => {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    const setSpy = vi.spyOn(loader, "setMeshoptDecoder");
    const info = await configureCollectibleGlbLoader(loader);
    expect(info.meshopt).toBe(true);
    expect(setSpy).toHaveBeenCalledTimes(1);
    const decoder = setSpy.mock.calls[0][0];
    expect(decoder).toBeTruthy();
    expect(typeof decoder.decodeGltfBuffer === "function" || typeof decoder.decode === "function").toBe(
      true,
    );
  });
});

describe("loadCollectibleGlb", () => {
  it("loads the canonical web GLB through GLTFLoader and returns the scene", async () => {
    const scene = new THREE.Group();
    scene.name = "gltf-root";
    const loadAsync = vi.fn().mockResolvedValue({
      scene,
      animations: [],
    });

    const result = await loadCollectibleGlb(THREE, {
      url: COLLECTIBLE_GLB_SRC,
      loader: { loadAsync },
    });

    expect(loadAsync).toHaveBeenCalledWith(COLLECTIBLE_GLB_SRC);
    expect(result.scene).toBe(scene);
    expect(result.animations).toEqual([]);
    expect(result.usedFallback).toBe(false);
    expect(result.url).toBe(COLLECTIBLE_GLB_SRC);
  });

  it("falls back to the textured reference when the web asset fails", async () => {
    const fallbackScene = new THREE.Group();
    fallbackScene.name = "textured-fallback";
    const loadAsync = vi
      .fn()
      .mockRejectedValueOnce(new Error("meshopt decode failed"))
      .mockResolvedValueOnce({ scene: fallbackScene, animations: [] });

    const result = await loadCollectibleGlb(THREE, {
      url: COLLECTIBLE_GLB_SRC,
      fallbackUrl: COLLECTIBLE_TEXTURED_GLB_SRC,
      loader: { loadAsync },
    });

    expect(loadAsync).toHaveBeenNthCalledWith(1, COLLECTIBLE_GLB_SRC);
    expect(loadAsync).toHaveBeenNthCalledWith(2, COLLECTIBLE_TEXTURED_GLB_SRC);
    expect(result.scene).toBe(fallbackScene);
    expect(result.usedFallback).toBe(true);
    expect(result.url).toBe(COLLECTIBLE_TEXTURED_GLB_SRC);
    expect(result.primaryError).toMatch(/meshopt decode failed/);
  });

  it("keeps GLB loading failure bounded and visible when primary + fallback fail", async () => {
    const loadAsync = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      loadCollectibleGlb(THREE, {
        url: COLLECTIBLE_GLB_SRC,
        fallbackUrl: COLLECTIBLE_TEXTURED_GLB_SRC,
        loader: { loadAsync },
      }),
    ).rejects.toThrow(/network down/);

    expect(loadAsync).toHaveBeenCalledTimes(2);
  });

  it("throws a bounded error when the GLB scene is missing", async () => {
    await expect(
      loadCollectibleGlb(THREE, {
        loader: { loadAsync: vi.fn().mockResolvedValue({}) },
      }),
    ).rejects.toThrow(/failed to load/i);
  });
});
