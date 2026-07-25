import {
  DEFAULT_DOCUMENT_PLANE,
  DOCUMENT_PLANE_Z,
  createDocumentPlane,
} from "./arDocumentPlane";

/**
 * Document-plane proof frame attached to the MindAR image anchor.
 * Sized from the compiled CV source aspect (width = 1 world unit).
 *
 * @param {typeof import("three")} THREE
 * @param {{ margin?: number }} [options]
 * @returns {import("three").Group}
 */
export function createAnchorProofObject(THREE, options = {}) {
  const plane = createDocumentPlane({
    width: DEFAULT_DOCUMENT_PLANE.width,
    height: DEFAULT_DOCUMENT_PLANE.height,
    margin: options.margin ?? 0,
  });

  const group = new THREE.Group();
  group.name = "ar-anchor-proof";
  group.userData.documentPlane = plane;

  const geometry = new THREE.PlaneGeometry(plane.width, plane.height);

  const fill = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.name = "ar-anchor-proof-fill";
  fill.position.set(0, 0, DOCUMENT_PLANE_Z * 0.5);
  group.add(fill);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.75,
      linewidth: 1,
    }),
  );
  edges.name = "ar-anchor-proof-frame";
  edges.position.set(0, 0, DOCUMENT_PLANE_Z);
  group.add(edges);

  return group;
}

/** True when a Three.js object (or subtree) can be considered user-visible. */
export function isVisuallyPresentObject3D(object) {
  if (!object) return false;
  let visible = false;
  object.traverse((node) => {
    if (!node.visible) return;
    const opacity = node.material?.opacity;
    if (node.isMesh || node.isLineSegments || node.isLine) {
      if (opacity === undefined || opacity > 0.01) visible = true;
    }
  });
  return visible;
}

/** Read calibrated plane size from a proof group (for tests / diagnostics). */
export function getProofFrameDimensions(proofGroup) {
  const plane = proofGroup?.userData?.documentPlane;
  if (!plane) return null;
  return {
    width: plane.width,
    height: plane.height,
    center: { x: 0, y: 0, z: DOCUMENT_PLANE_Z },
  };
}
