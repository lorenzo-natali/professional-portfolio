/**
 * Visitor manual rotation math for Beyond the CV interest miniatures.
 * Yaw around local Z, pitch around local X, roll fixed at 0.
 * Does not touch authored display / entrance / canonical transforms.
 */

/** Radians per CSS pixel of drag. */
export const INTEREST_VISITOR_ROTATION_SENSITIVITY = 0.005;

/** Max |pitch| in radians (~65°). */
export const INTEREST_VISITOR_MAX_PITCH_RAD = (65 * Math.PI) / 180;

/** Shared with the interest interaction controller (tap vs drag). */
export const INTEREST_TAP_MOVE_THRESHOLD_PX = 10;

/**
 * Explicit Euler order: pitch on X, then yaw on Z (Y unused / roll = 0).
 * Avoids relying on Three.js Object3D default order.
 */
export const INTEREST_VISITOR_EULER_ORDER = "XYZ";

/**
 * Normalize yaw into (-π, π].
 * @param {number} yaw
 */
export function normalizeYaw(yaw) {
  if (!Number.isFinite(yaw)) return 0;
  let y = yaw;
  const twoPi = Math.PI * 2;
  y = ((y + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  // Map -π to π for a stable (-π, π] range when exactly on the boundary.
  if (y <= -Math.PI) return Math.PI;
  return y;
}

/**
 * @param {number} pitch
 * @param {number} [maxPitch]
 */
export function clampVisitorPitch(pitch, maxPitch = INTEREST_VISITOR_MAX_PITCH_RAD) {
  if (!Number.isFinite(pitch)) return 0;
  const max = Number.isFinite(maxPitch) && maxPitch > 0 ? maxPitch : INTEREST_VISITOR_MAX_PITCH_RAD;
  return Math.min(max, Math.max(-max, pitch));
}

/**
 * Frozen-start gesture update (total deltas from pointerdown, not frame deltas).
 *
 * @param {{
 *   startYaw: number,
 *   startPitch: number,
 *   deltaX: number,
 *   deltaY: number,
 *   sensitivity?: number,
 *   maxPitch?: number,
 * }} input
 * @returns {{ yaw: number, pitch: number } | null} null when input is invalid
 */
export function computeVisitorRotationFromDrag(input) {
  const {
    startYaw,
    startPitch,
    deltaX,
    deltaY,
    sensitivity = INTEREST_VISITOR_ROTATION_SENSITIVITY,
    maxPitch = INTEREST_VISITOR_MAX_PITCH_RAD,
  } = input;

  if (
    !Number.isFinite(startYaw) ||
    !Number.isFinite(startPitch) ||
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(sensitivity) ||
    !(sensitivity > 0)
  ) {
    return null;
  }

  return {
    yaw: startYaw + deltaX * sensitivity,
    pitch: clampVisitorPitch(startPitch + deltaY * sensitivity, maxPitch),
  };
}

/**
 * Apply yaw/pitch to a dedicated userRotation group.
 * Horizontal drag → Z; vertical drag → X; roll = 0.
 *
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D | null | undefined} group
 * @param {number} yaw
 * @param {number} pitch
 * @returns {boolean} whether a transform was applied
 */
export function applyVisitorRotationToGroup(THREE, group, yaw, pitch) {
  if (!group || !THREE) return false;
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return false;

  const safeYaw = yaw;
  const safePitch = clampVisitorPitch(pitch);

  if (!group.rotation) return false;
  group.rotation.order = INTEREST_VISITOR_EULER_ORDER;
  group.rotation.set(safePitch, 0, safeYaw, INTEREST_VISITOR_EULER_ORDER);
  return true;
}

/**
 * Reset visitor rotation to identity and clear stored angles.
 * @param {import("three").Object3D | null | undefined} group
 */
export function resetVisitorRotationGroup(group) {
  if (!group?.rotation) return;
  group.rotation.order = INTEREST_VISITOR_EULER_ORDER;
  group.rotation.set(0, 0, 0, INTEREST_VISITOR_EULER_ORDER);
}
