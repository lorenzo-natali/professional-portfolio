import {
  INTEREST_CANONICAL_Y_UP_TO_Z_UP,
  resolveInterestAssetUrl,
} from "./interestObjectsConfig";

/** @type {Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader> | null} */
let sharedLoaderPromise = null;

/**
 * Shared GLTFLoader with Meshopt decoder (web interest GLBs use EXT_meshopt_compression).
 * No Draco — avoids an extra decoder dependency in the AR runtime.
 */
export function getSharedGltfLoader() {
  if (!sharedLoaderPromise) {
    sharedLoaderPromise = (async () => {
      const [{ GLTFLoader }, meshoptMod] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/libs/meshopt_decoder.module.js"),
      ]);
      const loader = new GLTFLoader();
      const MeshoptDecoder = meshoptMod.MeshoptDecoder;
      if (MeshoptDecoder?.ready) {
        await MeshoptDecoder.ready;
        loader.setMeshoptDecoder(MeshoptDecoder);
      }
      return loader;
    })();
  }
  return sharedLoaderPromise;
}

/** @internal test helper */
export function resetSharedGltfLoaderForTests() {
  sharedLoaderPromise = null;
}

/**
 * Pick the AABB metric used for uniform scale after orientation.
 * @param {{ x: number, y: number, z: number }} size
 * @param {"x"|"y"|"z"|"max"} scaleAxis
 */
export function measureScaleAxis(size, scaleAxis = "z") {
  if (scaleAxis === "x") return Math.max(size.x, 1e-4);
  if (scaleAxis === "y") return Math.max(size.y, 1e-4);
  if (scaleAxis === "max") return Math.max(size.x, size.y, size.z, 1e-4);
  return Math.max(size.z, 1e-4);
}

/**
 * Reject negative scales used as orientation hacks.
 * @param {import("three").Object3D} root
 */
export function assertNoNegativeScale(root) {
  let found = false;
  root.traverse((node) => {
    if (node.scale.x < 0 || node.scale.y < 0 || node.scale.z < 0) found = true;
  });
  return !found;
}

/**
 * Assemble a document-plane miniature:
 * canonicalRotation → bbox → uniform scale → bbox → seat min Z = 0 (center XY).
 *
 * Display yaw / tilt are applied by the placement layer AFTER this returns.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} rawModel
 * @param {{
 *   targetSize: number,
 *   scaleAxis?: "x"|"y"|"z"|"max",
 *   canonicalRotation?: { x: number, y: number, z: number },
 *   upright?: { x: number, y: number, z: number },
 * }} options
 */
export function assembleInterestContent(THREE, rawModel, options) {
  const scaleAxis = options.scaleAxis ?? "z";
  const canonicalRotation =
    options.canonicalRotation ?? options.upright ?? INTEREST_CANONICAL_Y_UP_TO_Z_UP;
  const targetSize = options.targetSize;

  const content = new THREE.Group();
  content.name = "interest-pose-content";

  const canonicalGroup = new THREE.Group();
  canonicalGroup.name = "interest-canonical";
  canonicalGroup.rotation.set(
    canonicalRotation.x,
    canonicalRotation.y,
    canonicalRotation.z,
  );

  rawModel.position.set(0, 0, 0);
  rawModel.rotation.set(0, 0, 0);
  rawModel.scale.set(1, 1, 1);
  canonicalGroup.add(rawModel);
  content.add(canonicalGroup);

  // a–d. Canonical orientation applied; matrices updated; bbox.
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content);
  const size = new THREE.Vector3();
  box.getSize(size);

  // e–g. Uniform scale from explicit axis metric (never negative).
  const metric = measureScaleAxis(size, scaleAxis);
  const normScale = Math.abs(targetSize / metric);
  canonicalGroup.scale.setScalar(normScale);

  content.updateMatrixWorld(true);
  box.setFromObject(content);
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // h–i. Seat: min Z = 0, center on document XY. Display yaw is NOT applied here.
  content.position.x -= center.x;
  content.position.y -= center.y;
  content.position.z -= box.min.z;
  content.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(content);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  return {
    content,
    canonicalGroup,
    /** @deprecated alias of canonicalGroup */
    uprightGroup: canonicalGroup,
    bounds: {
      size: finalSize,
      targetSize,
      normScale,
      nativeMetric: metric,
      scaleAxis,
      minZ: finalBox.min.z,
      maxZ: finalBox.max.z,
      canonicalRotation: { ...canonicalRotation },
    },
  };
}

/**
 * Re-seat an already-oriented content group so min Z = 0 and XY-centered.
 * Used after live debug scale edits. Does not touch display yaw.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} content
 */
export function seatInterestContent(THREE, content) {
  content.position.set(0, 0, 0);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content);
  const center = new THREE.Vector3();
  box.getCenter(center);
  content.position.x -= center.x;
  content.position.y -= center.y;
  content.position.z -= box.min.z;
  content.updateMatrixWorld(true);
  return box;
}

/**
 * Load a GLB and assemble it into a seated document-plane miniature.
 *
 * @param {typeof import("three")} THREE
 * @param {string} src
 * @param {{
 *   targetSize: number,
 *   scaleAxis?: "x"|"y"|"z"|"max",
 *   canonicalRotation?: { x: number, y: number, z: number },
 *   upright?: { x: number, y: number, z: number },
 * }} options
 */
export async function loadInterestGlb(THREE, src, options) {
  const loader = await getSharedGltfLoader();
  const url = resolveInterestAssetUrl(src);
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  model.name = `interest-model:${src}`;

  const assembled = assembleInterestContent(THREE, model, options);
  prepareInterestMaterials(assembled.content);

  return {
    model: assembled.content,
    canonicalGroup: assembled.canonicalGroup,
    uprightGroup: assembled.canonicalGroup,
    bounds: assembled.bounds,
  };
}

/**
 * Snapshot authored material state, then hide for entrance fade.
 * @param {import("three").Object3D} root
 */
export function prepareInterestMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((mat) => {
      if (!mat) return;
      if (mat.userData.interestMaterialPrepared) return;
      mat.userData.baseOpacity = mat.opacity ?? 1;
      mat.userData.baseTransparent = Boolean(mat.transparent);
      mat.userData.baseDepthWrite = mat.depthWrite !== false;
      mat.userData.interestMaterialPrepared = true;
      mat.transparent = true;
      mat.opacity = 0;
      mat.depthWrite = false;
      mat.needsUpdate = true;
    });
  });
}

/**
 * Fade materials. At opacity ≈ 1 restores authored transparent/depthWrite.
 * @param {import("three").Object3D} root
 * @param {number} opacity
 */
export function setInterestOpacity(root, opacity) {
  const value = Math.min(1, Math.max(0, opacity));
  const done = value >= 0.999;
  root.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((mat) => {
      if (!mat || !("opacity" in mat)) return;
      const base = mat.userData?.baseOpacity ?? 1;
      const baseTransparent = Boolean(mat.userData?.baseTransparent);
      const baseDepthWrite = mat.userData?.baseDepthWrite !== false;

      let nextOpacity;
      let nextTransparent;
      let nextDepthWrite;
      if (done) {
        nextOpacity = base;
        nextTransparent = baseTransparent;
        nextDepthWrite = baseDepthWrite;
      } else {
        nextOpacity = base * value;
        nextTransparent = true;
        nextDepthWrite = false;
      }

      const changed =
        mat.opacity !== nextOpacity ||
        mat.transparent !== nextTransparent ||
        mat.depthWrite !== nextDepthWrite;

      mat.opacity = nextOpacity;
      mat.transparent = nextTransparent;
      mat.depthWrite = nextDepthWrite;
      if (changed) mat.needsUpdate = true;
    });
  });
}
