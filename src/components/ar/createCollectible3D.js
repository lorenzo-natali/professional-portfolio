import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import {
  COLLECTIBLE_GLB_SRC,
  COLLECTIBLE_ORIGIN,
  COLLECTIBLE_TRANSFORM,
} from "./collectibleConfig";
import { PROFESSIONAL_CARD_INTERACTION } from "./professionalCardConfig";
import { loadCollectibleGlb } from "./loadCollectibleGlb";
import { upgradeCollectibleMaterials } from "./upgradeCollectibleMaterials";

/**
 * Soft contact shadow — cheap translucent disc, not a real-time shadow map.
 * @param {typeof import("three")} THREE
 */
function createContactShadow(THREE) {
  const geometry = new THREE.CircleGeometry(0.42, 48);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  material.userData.baseOpacity = 0.22;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ar-collectible-contact-shadow";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.96;
  mesh.position.z = 0.01;
  mesh.renderOrder = -1;
  return { mesh, geometry, material };
}

/**
 * Fit loaded scene into unit-aware local space: center bbox, keep Y-up.
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} scene
 */
function normalizeCollectibleRoot(THREE, scene) {
  const wrapper = new THREE.Group();
  wrapper.name = "ar-collectible-model";
  wrapper.add(scene);

  const box = new THREE.Box3().setFromObject(wrapper);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.sub(center);

  // Face the camera (+Z in document space). GLB is Y-up already.
  wrapper.rotation.x = 0;
  return wrapper;
}

/**
 * Build the AR collectible artifact around the canonical GLB.
 *
 * Hierarchy (preserved):
 * group → placement → interaction → anim → model
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   url?: string,
 *   origin?: { u: number, vTop: number },
 *   transform?: typeof COLLECTIBLE_TRANSFORM,
 *   loader?: { loadAsync: (url: string) => Promise<any> },
 * }} [options]
 */
export async function createCollectible3D(THREE, options = {}) {
  const origin = options.origin ?? COLLECTIBLE_ORIGIN;
  const transform = options.transform ?? COLLECTIBLE_TRANSFORM;
  const interactionConfig = PROFESSIONAL_CARD_INTERACTION;
  const plane = createDocumentPlane();
  const worldOrigin = plane.toWorldFromTopLeft(origin.u, origin.vTop, DOCUMENT_PLANE_Z);

  const disposables = [];
  const group = new THREE.Group();
  group.name = "ar-collectible";
  group.userData.kind = "ar-collectible";
  group.userData.documentPlane = plane;
  group.userData.calibration = { origin, transform, src: options.url ?? COLLECTIBLE_GLB_SRC };
  group.userData.riseAxis = "z";
  group.userData.usedFallback = false;

  const placement = new THREE.Group();
  placement.name = "ar-collectible-placement";
  placement.position.set(
    worldOrigin.x + transform.position.x,
    worldOrigin.y + transform.position.y,
    worldOrigin.z + transform.position.z,
  );
  group.add(placement);

  const interaction = new THREE.Group();
  interaction.name = "ar-collectible-interaction";
  interaction.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  interaction.scale.setScalar(transform.scale);
  placement.add(interaction);

  const anim = new THREE.Group();
  anim.name = "ar-collectible-anim";
  interaction.add(anim);

  const initialInteraction = {
    rotation: { ...transform.rotation },
    scale: transform.scale,
  };

  function resetInteractionPose() {
    interaction.rotation.set(
      initialInteraction.rotation.x,
      initialInteraction.rotation.y,
      initialInteraction.rotation.z,
    );
    interaction.scale.setScalar(initialInteraction.scale);
  }

  const loaded = await loadCollectibleGlb(THREE, {
    url: options.url ?? COLLECTIBLE_GLB_SRC,
    loader: options.loader,
  });
  const scene = loaded.scene;
  group.userData.calibration.src = loaded.url ?? group.userData.calibration.src;
  group.userData.usedFallback = Boolean(loaded.usedFallback);
  group.userData.decoderInfo = loaded.decoderInfo ?? null;

  const modelRoot = normalizeCollectibleRoot(THREE, scene);
  const upgrade = upgradeCollectibleMaterials(THREE, modelRoot);
  const materials = upgrade.materials;
  const materialMode = upgrade.mode;
  group.userData.materialMode = materialMode;
  // Track materials for dispose; also release imported texture maps on stop.
  materials.forEach((material) => {
    if (material) disposables.push(material);
  });

  const shadow = createContactShadow(THREE);
  disposables.push(shadow.geometry, shadow.material);
  modelRoot.add(shadow.mesh);

  anim.add(modelRoot);

  /** Primary material for opacity sampling. */
  const coreMaterial =
    materials.find((m) => m.userData?.region === "shell") ||
    materials.find((m) => m.userData?.region === "figure") ||
    materials[0] ||
    null;

  function setOpacity(opacity) {
    const value = Math.min(Math.max(opacity, 0), 1);
    group.traverse((node) => {
      if (!node.material) return;
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.forEach((material) => {
        if (!material || !("opacity" in material)) return;
        material.transparent = true;
        const base = material.userData?.baseOpacity ?? 1;
        material.opacity = value * base;
        const isGlassLike = (material.userData?.baseOpacity ?? 1) < 0.95;
        material.depthWrite = value > 0.9 && !isGlassLike;
        material.needsUpdate = true;
      });
    });
  }

  function getOpacity() {
    if (!coreMaterial || !("opacity" in coreMaterial)) return 0;
    const base = coreMaterial.userData?.baseOpacity ?? 1;
    return base > 0 ? coreMaterial.opacity / base : 0;
  }

  setOpacity(0);
  group.visible = false;

  return {
    group,
    root: placement,
    placement,
    interaction,
    anim,
    modelRoot,
    materials,
    materialMode,
    coreMaterial,
    riseHeight: transform.riseHeight,
    initialRotation: { ...transform.rotation },
    initialScale: transform.scale,
    interactionConfig,
    riseAxis: "z",
    resetInteractionPose,
    setOpacity,
    getOpacity,
    outlineMaterial: null,
    dispose() {
      group.removeFromParent?.();
      const textureKeys = [
        "map",
        "normalMap",
        "roughnessMap",
        "metalnessMap",
        "aoMap",
        "emissiveMap",
        "alphaMap",
        "bumpMap",
        "displacementMap",
      ];
      disposables.forEach((item) => {
        try {
          if (item && typeof item === "object") {
            textureKeys.forEach((key) => {
              try {
                item[key]?.dispose?.();
              } catch {
                // ignore
              }
            });
          }
          item.dispose?.();
        } catch {
          // ignore
        }
      });
      disposables.length = 0;
      modelRoot.traverse((node) => {
        if (node.geometry) {
          try {
            node.geometry.dispose?.();
          } catch {
            // ignore
          }
        }
      });
    },
  };
}
