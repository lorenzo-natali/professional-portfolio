/**
 * Minimal document-aligned frame attached to the MindAR image anchor.
 * Proves spatial tracking without viewport HTML cards.
 *
 * @param {typeof import("three")} THREE
 * @returns {import("three").Group}
 */
export function createAnchorProofObject(THREE) {
  const group = new THREE.Group();
  group.name = "ar-anchor-proof";

  // MindAR image targets use a unit plane; A4-like aspect matches the CV page.
  const width = 1;
  const height = 1.414;
  const plane = new THREE.PlaneGeometry(width, height);

  const fill = new THREE.Mesh(
    plane,
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.name = "ar-anchor-proof-fill";
  fill.position.z = 0.004;
  group.add(fill);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(plane),
    new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
    }),
  );
  edges.name = "ar-anchor-proof-frame";
  edges.position.z = 0.008;
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
