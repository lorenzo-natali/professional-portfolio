import {
  COLLECTIBLE_GLB_SRC,
  COLLECTIBLE_TEXTURED_GLB_SRC,
} from "./collectibleConfig";

/**
 * Lazily configure Meshopt + quantization support for collectible_web.glb.
 * Decoder is imported from three's shipped module (Vite-bundled, Pages-safe).
 *
 * @param {import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader} loader
 */
export async function configureCollectibleGlbLoader(loader) {
  if (!loader || typeof loader.setMeshoptDecoder !== "function") {
    return { meshopt: false, reason: "loader-unsupported" };
  }
  try {
    const { MeshoptDecoder } = await import(
      "three/examples/jsm/libs/meshopt_decoder.module.js"
    );
    if (!MeshoptDecoder) {
      return { meshopt: false, reason: "decoder-missing" };
    }
    if (MeshoptDecoder.supported === false) {
      return { meshopt: false, reason: "wasm-unsupported" };
    }
    if (MeshoptDecoder.ready) {
      await MeshoptDecoder.ready;
    }
    loader.setMeshoptDecoder(MeshoptDecoder);
    return { meshopt: true };
  } catch (error) {
    console.warn("[collectible] MeshoptDecoder unavailable", error);
    return {
      meshopt: false,
      reason: "decoder-load-failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load a collectible GLB with GLTFLoader.
 * Defaults to the optimized web asset; textured reference remains available.
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   url?: string,
 *   loader?: { loadAsync: (url: string) => Promise<any>, setMeshoptDecoder?: Function },
 *   fallbackUrl?: string,
 * }} [options]
 */
export async function loadCollectibleGlb(THREE, options = {}) {
  const url = options.url ?? COLLECTIBLE_GLB_SRC;
  const fallbackUrl = options.fallbackUrl ?? COLLECTIBLE_TEXTURED_GLB_SRC;
  let loader = options.loader;
  let decoderInfo = { meshopt: false, reason: "external-loader" };

  if (!loader) {
    const mod = await import("three/examples/jsm/loaders/GLTFLoader.js");
    loader = new mod.GLTFLoader();
    decoderInfo = await configureCollectibleGlbLoader(loader);
  }

  try {
    const gltf = await loader.loadAsync(url);
    if (!gltf?.scene) {
      throw new Error(`Collectible GLB failed to load: ${url}`);
    }
    return {
      scene: gltf.scene,
      animations: gltf.animations ?? [],
      asset: gltf,
      url,
      decoderInfo,
      usedFallback: false,
    };
  } catch (error) {
    // Bound failure: if the optimized asset cannot decode, fall back once.
    if (url !== fallbackUrl) {
      console.warn(
        `[collectible] Failed to load ${url}; falling back to textured reference`,
        error,
      );
      const gltf = await loader.loadAsync(fallbackUrl);
      if (!gltf?.scene) {
        throw new Error(
          `Collectible GLB failed to load (primary + fallback): ${url} / ${fallbackUrl}`,
          { cause: error },
        );
      }
      return {
        scene: gltf.scene,
        animations: gltf.animations ?? [],
        asset: gltf,
        url: fallbackUrl,
        decoderInfo,
        usedFallback: true,
        primaryError: error instanceof Error ? error.message : String(error),
      };
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
