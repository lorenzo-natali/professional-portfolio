import { DOCUMENT_PLANE_Z, softClamp01 } from "./arDocumentPlane";

export const CALIBRATE_UV_DRAG_LIMIT = { min: -0.12, max: 1.12 };
export const CALIBRATE_TARGET_SIZE_LIMIT = { min: 0.05, max: 0.36 };
export const CALIBRATE_DRAG_THRESHOLD_PX = 8;

/**
 * Walk mesh → interest root (`ar-interest:<id>` / userData.interestId).
 * @param {import("three").Object3D | null | undefined} object
 * @returns {{ root: import("three").Object3D, id: string } | null}
 */
export function findInterestRootFromObject(object) {
  let node = object ?? null;
  while (node) {
    const id = node.userData?.interestId;
    if (typeof id === "string" && id.length > 0) {
      return { root: node, id };
    }
    if (typeof node.name === "string" && node.name.startsWith("ar-interest:")) {
      const fromName = node.name.slice("ar-interest:".length);
      if (fromName) return { root: node, id: fromName };
    }
    node = node.parent;
  }
  return null;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect} rect
 */
export function clientToNdc(clientX, clientY, rect) {
  const w = Math.max(rect.width, 1);
  const h = Math.max(rect.height, 1);
  return {
    x: ((clientX - rect.left) / w) * 2 - 1,
    y: -((clientY - rect.top) / h) * 2 + 1,
  };
}

/**
 * @param {{ u: number, vTop: number }} origin
 * @param {{ u: number, vTop: number }} hitUv
 */
export function touchOffsetFromHit(origin, hitUv) {
  return {
    u: hitUv.u - origin.u,
    vTop: hitUv.vTop - origin.vTop,
  };
}

/**
 * Keep pivot under finger using the captured offset.
 * @param {{ u: number, vTop: number }} hitUv
 * @param {{ u: number, vTop: number }} offset
 * @param {{ min?: number, max?: number }} [limit]
 */
export function placementFromHitWithOffset(hitUv, offset, limit = CALIBRATE_UV_DRAG_LIMIT) {
  const u = hitUv.u - offset.u;
  const vTop = hitUv.vTop - offset.vTop;
  return {
    u: Math.min(limit.max, Math.max(limit.min, u)),
    vTop: Math.min(limit.max, Math.max(limit.min, vTop)),
  };
}

/**
 * Soft clamp pivot onto the CV after pointer release.
 * @param {{ u: number, vTop: number }} uv
 */
export function softClampPlacementUv(uv) {
  return {
    u: softClamp01(uv.u),
    vTop: softClamp01(uv.vTop),
  };
}

/**
 * @param {number} startDistance
 * @param {number} currentDistance
 * @param {number} startSize
 * @param {{ min?: number, max?: number }} [limit]
 */
export function targetSizeFromPinch(
  startDistance,
  currentDistance,
  startSize,
  limit = CALIBRATE_TARGET_SIZE_LIMIT,
) {
  const start = Math.max(startDistance, 1e-3);
  const ratio = Math.max(currentDistance, 1e-3) / start;
  const next = startSize * ratio;
  return Math.min(limit.max, Math.max(limit.min, next));
}

/**
 * Screen-space angle of the segment a→b (radians).
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
export function pointerAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * @param {number} startAngle
 * @param {number} currentAngle
 * @param {number} startYaw
 */
export function displayYawFromTwist(startAngle, currentAngle, startYaw) {
  let delta = currentAngle - startAngle;
  // Wrap to [-π, π] to avoid jumps across the branch cut.
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return startYaw + delta;
}

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
export function pointerDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Build / refresh a document-plane THREE.Plane in world space.
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} placement
 * @param {import("three").Plane} [out]
 */
export function getDocumentWorldPlane(THREE, placement, out) {
  const plane = out ?? new THREE.Plane();
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(placement.matrixWorld).normalize();
  const point = new THREE.Vector3(0, 0, DOCUMENT_PLANE_Z).applyMatrix4(placement.matrixWorld);
  return plane.setFromNormalAndCoplanarPoint(normal, point);
}

/**
 * Intersect a camera ray with the CV plane; return local XY on placement.
 * @param {typeof import("three")} THREE
 * @param {import("three").Raycaster} raycaster
 * @param {import("three").Object3D} placement
 * @param {import("three").Plane} [scratchPlane]
 * @param {import("three").Vector3} [scratchHit]
 */
export function intersectPlacementDocument(
  THREE,
  raycaster,
  placement,
  scratchPlane,
  scratchHit,
) {
  const plane = getDocumentWorldPlane(THREE, placement, scratchPlane);
  const hit = scratchHit ?? new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  const local = placement.worldToLocal(hit.clone());
  return { x: local.x, y: local.y, z: local.z };
}
