import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import {
  ALIGNMENT_CORE_LAYOUT,
  ALIGNMENT_CORE_MATERIALS,
  ALIGNMENT_CORE_ORIGIN,
} from "./alignmentCoreConfig";
import { createAlignmentShell } from "./createAlignmentShell";

/**
 * Procedural Alignment Core — two complementary shells + latent luminous core.
 *
 * Disposal ownership:
 * - shells dispose their own geometries/materials once
 * - core owns core/halo/merged-hit resources only (no recursive double-dispose)
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   origin?: typeof ALIGNMENT_CORE_ORIGIN,
 *   layout?: typeof ALIGNMENT_CORE_LAYOUT,
 * }} [options]
 */
export function createAlignmentCore(THREE, options = {}) {
  const origin = options.origin ?? ALIGNMENT_CORE_ORIGIN;
  const layout = { ...ALIGNMENT_CORE_LAYOUT, ...options.layout };
  const plane = createDocumentPlane();
  const worldOrigin = plane.toWorldFromTopLeft(origin.u, origin.vTop, DOCUMENT_PLANE_Z);
  const disposables = [];
  let disposed = false;

  const placement = new THREE.Group();
  placement.name = "ar-alignment-core-placement";
  placement.userData.kind = "ar-alignment-core";
  placement.userData.documentPlane = plane;
  placement.userData.calibration = { origin, layout };
  placement.visible = false;
  placement.position.set(
    worldOrigin.x + layout.offset.x,
    worldOrigin.y + layout.offset.y,
    worldOrigin.z + layout.offset.z,
  );
  placement.rotation.set(layout.rotation.x, layout.rotation.y, layout.rotation.z);

  const assembly = new THREE.Group();
  assembly.name = "ar-alignment-core-assembly";
  placement.add(assembly);

  const leftCarrier = new THREE.Group();
  leftCarrier.name = "ar-alignment-left-carrier";
  leftCarrier.position.x = -layout.shellSeparation;
  assembly.add(leftCarrier);

  const rightCarrier = new THREE.Group();
  rightCarrier.name = "ar-alignment-right-carrier";
  rightCarrier.position.x = layout.shellSeparation;
  assembly.add(rightCarrier);

  const leftShell = createAlignmentShell(THREE, {
    side: "left",
    radius: layout.shellRadius,
  });
  const rightShell = createAlignmentShell(THREE, {
    side: "right",
    radius: layout.shellRadius,
  });
  leftCarrier.add(leftShell.root);
  rightCarrier.add(rightShell.root);

  // Target orientations: openings face each other (identity local rotation).
  const leftTarget = new THREE.Quaternion();
  const rightTarget = new THREE.Quaternion();

  // Start misaligned so the user must complete the gesture.
  leftShell.root.rotation.set(0.85, -1.15, 0.35);
  rightShell.root.rotation.set(-0.7, 1.35, -0.45);
  leftShell.root.quaternion.setFromEuler(leftShell.root.rotation);
  rightShell.root.quaternion.setFromEuler(rightShell.root.rotation);

  // Latent core — revealed after merge.
  const coreGroup = new THREE.Group();
  coreGroup.name = "ar-alignment-core-heart";
  coreGroup.visible = false;
  assembly.add(coreGroup);

  const coreMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(ALIGNMENT_CORE_MATERIALS.core),
    emissive: new THREE.Color(ALIGNMENT_CORE_MATERIALS.cyanSoft),
    emissiveIntensity: 0.85,
    metalness: 0.15,
    roughness: 0.25,
    transparent: true,
    opacity: 0.96,
  });
  disposables.push(coreMat);
  const coreGeo = new THREE.SphereGeometry(layout.coreRadius, 32, 24);
  disposables.push(coreGeo);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.name = "ar-alignment-core-mesh";
  coreGroup.add(coreMesh);

  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(ALIGNMENT_CORE_MATERIALS.cyan),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(haloMat);
  const haloGeo = new THREE.SphereGeometry(layout.haloRadius, 24, 16);
  disposables.push(haloGeo);
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.name = "ar-alignment-core-halo";
  coreGroup.add(halo);

  /** Whole-object pivot after merge (rotation only). */
  const mergedInteraction = new THREE.Group();
  mergedInteraction.name = "ar-alignment-merged-interaction";
  mergedInteraction.scale.setScalar(layout.completedObjectScale);
  assembly.add(mergedInteraction);

  // Dedicated merged hit proxy — sized to the closed sculpture, not the full canvas.
  const mergedHitGeo = new THREE.SphereGeometry(layout.mergedHitRadius, 20, 16);
  disposables.push(mergedHitGeo);
  const mergedHitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  disposables.push(mergedHitMat);
  const mergedHit = new THREE.Mesh(mergedHitGeo, mergedHitMat);
  mergedHit.name = "ar-alignment-merged-hit";
  mergedHit.userData.mergedHit = true;
  mergedHit.visible = false;
  mergedInteraction.add(mergedHit);

  function setVisible(visible) {
    placement.visible = Boolean(visible);
  }

  return {
    group: placement,
    placement,
    assembly,
    leftCarrier,
    rightCarrier,
    leftShell,
    rightShell,
    leftTarget,
    rightTarget,
    coreGroup,
    coreMesh,
    halo,
    coreMat,
    haloMat,
    mergedInteraction,
    mergedHit,
    layout,
    /** Split-mode shell proxies (tight sector meshes). */
    hitTargets: [leftShell.hit, rightShell.hit],
    /** Post-merge proxy for the completed sculpture only. */
    mergedHitTargets: [mergedHit],
    setVisible,
    resetToSplit() {
      if (leftCarrier.parent !== assembly) assembly.attach(leftCarrier);
      if (rightCarrier.parent !== assembly) assembly.attach(rightCarrier);
      if (coreGroup.parent !== assembly) assembly.attach(coreGroup);
      if (leftShell.root.parent !== leftCarrier) leftCarrier.attach(leftShell.root);
      if (rightShell.root.parent !== rightCarrier) rightCarrier.attach(rightShell.root);
      leftCarrier.position.set(-layout.shellSeparation, 0, 0);
      rightCarrier.position.set(layout.shellSeparation, 0, 0);
      leftShell.root.position.set(0, 0, 0);
      rightShell.root.position.set(0, 0, 0);
      leftShell.root.rotation.set(0.85, -1.15, 0.35);
      rightShell.root.rotation.set(-0.7, 1.35, -0.45);
      leftShell.root.quaternion.setFromEuler(leftShell.root.rotation);
      rightShell.root.quaternion.setFromEuler(rightShell.root.rotation);
      mergedInteraction.rotation.set(0, 0, 0);
      mergedInteraction.scale.setScalar(layout.completedObjectScale);
      mergedHit.visible = false;
      coreGroup.visible = false;
      coreMat.emissiveIntensity = 0.85;
      haloMat.opacity = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      leftShell.dispose();
      rightShell.dispose();
      disposables.forEach((item) => {
        try {
          item.dispose?.();
        } catch {
          // ignore
        }
      });
      disposables.length = 0;
      placement.removeFromParent?.();
    },
  };
}
