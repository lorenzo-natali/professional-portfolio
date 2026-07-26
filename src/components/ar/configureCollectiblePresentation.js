import { COLLECTIBLE_LIGHTING, COLLECTIBLE_RENDERER } from "./collectibleConfig";

/**
 * Apply ACES / sRGB / physically-correct lighting settings to the shared MindAR renderer.
 * @param {typeof import("three")} THREE
 * @param {import("three").WebGLRenderer} renderer
 */
export function configureCollectibleRenderer(THREE, renderer) {
  if (!renderer) return;

  if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ("outputEncoding" in renderer && "sRGBEncoding" in THREE) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  if ("ACESFilmicToneMapping" in THREE) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  renderer.toneMappingExposure = COLLECTIBLE_RENDERER.toneMappingExposure;

  if ("useLegacyLights" in renderer) {
    renderer.useLegacyLights = false;
  } else if ("physicallyCorrectLights" in renderer) {
    renderer.physicallyCorrectLights = true;
  }

  // Keep AR camera background transparent.
  renderer.setClearColor?.(0x000000, 0);
  renderer.setClearAlpha?.(0);
}

/**
 * Studio lighting approximating the reference product mood.
 * Soft key + hemisphere + restrained fill/rim — no neon, no hard shadows.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Scene} scene
 * @returns {{ dispose: () => void, lights: import("three").Light[] }}
 */
export function createCollectibleLighting(THREE, scene) {
  const lights = [];
  const cfg = COLLECTIBLE_LIGHTING;

  const ambient = new THREE.AmbientLight(cfg.ambient.color, cfg.ambient.intensity);
  ambient.name = "ar-collectible-ambient";
  scene.add(ambient);
  lights.push(ambient);

  const hemi = new THREE.HemisphereLight(cfg.hemi.sky, cfg.hemi.ground, cfg.hemi.intensity);
  hemi.name = "ar-collectible-hemi";
  scene.add(hemi);
  lights.push(hemi);

  const key = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
  key.name = "ar-collectible-key";
  key.position.set(...cfg.key.position);
  scene.add(key);
  lights.push(key);

  const fill = new THREE.DirectionalLight(cfg.fill.color, cfg.fill.intensity);
  fill.name = "ar-collectible-fill";
  fill.position.set(...cfg.fill.position);
  scene.add(fill);
  lights.push(fill);

  const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity);
  rim.name = "ar-collectible-rim";
  rim.position.set(...cfg.rim.position);
  scene.add(rim);
  lights.push(rim);

  return {
    lights,
    dispose() {
      lights.forEach((light) => {
        try {
          light.removeFromParent?.();
          light.dispose?.();
        } catch {
          // ignore
        }
      });
      lights.length = 0;
    },
  };
}

/**
 * Optional low-cost PMREM environment for believable specular response.
 * Failures are ignored — directional/hemi lighting remains authoritative.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").WebGLRenderer} renderer
 * @param {import("three").Scene} scene
 */
export async function attachCollectibleEnvironment(THREE, renderer, scene) {
  try {
    if (!THREE.PMREMGenerator) return null;
    const { RoomEnvironment } = await import(
      "three/examples/jsm/environments/RoomEnvironment.js"
    );
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const texture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = texture;
    pmrem.dispose();
    envScene.dispose?.();
    return {
      dispose() {
        if (scene.environment === texture) scene.environment = null;
        texture.dispose?.();
      },
    };
  } catch {
    return null;
  }
}
