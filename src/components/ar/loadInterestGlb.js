import {
  INTEREST_UPRIGHT_Y_TO_Z,
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
 * Assemble a document-plane miniature:
 * orient → bbox → uniform scale by scaleAxis → bbox → seat min Z = 0 (center XY).
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} rawModel
 * @param {{
 *   targetSize: number,
 *   scaleAxis?: "x"|"y"|"z"|"max",
 *   upright?: { x: number, y: number, z: number },
 *   rotation?: { x: number, y: number, z: number },
 * }} options
 */
export function assembleInterestContent(THREE, rawModel, options) {
  const scaleAxis = options.scaleAxis ?? "z";
  const upright = options.upright ?? INTEREST_UPRIGHT_Y_TO_Z;
  const rotation = options.rotation ?? { x: 0, y: 0, z: 0 };
  const targetSize = options.targetSize;

  const pose = new THREE.Group();
  pose.name = "interest-pose-content";

  const uprightGroup = new THREE.Group();
  uprightGroup.name = "interest-upright";
  uprightGroup.rotation.set(upright.x, upright.y, upright.z);

  rawModel.position.set(0, 0, 0);
  rawModel.rotation.set(0, 0, 0);
  rawModel.scale.set(1, 1, 1);
  uprightGroup.add(rawModel);

  pose.rotation.set(rotation.x, rotation.y, rotation.z);
  pose.add(uprightGroup);

  // 1–2. Orientation applied; 3. world matrices.
  pose.updateMatrixWorld(true);

  // 4. BBox after rotation.
  const box = new THREE.Box3().setFromObject(pose);
  const size = new THREE.Vector3();
  box.getSize(size);

  // 5. Uniform scale from explicit axis metric.
  const metric = measureScaleAxis(size, scaleAxis);
  const normScale = targetSize / metric;
  uprightGroup.scale.setScalar(normScale);

  // 6. Recompute bbox after scale.
  pose.updateMatrixWorld(true);
  box.setFromObject(pose);
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // 7. Seat: min Z = 0, center on document XY.
  pose.position.x -= center.x;
  pose.position.y -= center.y;
  pose.position.z -= box.min.z;
  pose.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(pose);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  return {
    content: pose,
    uprightGroup,
    bounds: {
      size: finalSize,
      targetSize,
      normScale,
      nativeMetric: metric,
      scaleAxis,
      minZ: finalBox.min.z,
    },
  };
}

/**
 * Re-seat an already-oriented content group so min Z = 0 and XY-centered.
 * Used after live debug rotation edits.
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
 *   upright?: { x: number, y: number, z: number },
 *   rotation?: { x: number, y: number, z: number },
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
    uprightGroup: assembled.uprightGroup,
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
