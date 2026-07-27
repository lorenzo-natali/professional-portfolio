/**
 * Opt-in WebAR runtime isolation variants for physical-device crash A/B.
 * Absent query param → production path unchanged (no diagnostic variant applied).
 *
 * Enable with ?arRuntimeVariant=<name> (session-latched via arRuntimeFlags).
 */

import { INTEREST_OBJECTS } from "./interestObjectsConfig";

/** @typedef {'baseline' | 'half-resolution' | 'no-models' | 'single-model' | 'no-card-layout'} ArRuntimeVariantName */

export const AR_RUNTIME_VARIANT_PARAM = "arRuntimeVariant";

/** Highest-triangle interest model (exact BufferGeometry audit). */
export const AR_RUNTIME_VARIANT_SINGLE_MODEL_ID = "fossil";

export const AR_RUNTIME_VARIANT_NAMES = Object.freeze([
  "baseline",
  "half-resolution",
  "no-models",
  "single-model",
  "no-card-layout",
]);

/**
 * Exact per-asset triangle audit (meshopt-decoded index counts).
 * Total === renderer.info.render.triangles with all six interests visible.
 */
export const AR_INTEREST_TRIANGLE_AUDIT = Object.freeze({
  totalTriangles: 519_741,
  assets: Object.freeze([
    Object.freeze({
      id: "fossil",
      src: "ar/interests/web/fossil.glb",
      geometryCount: 1,
      triangles: 121_802,
      materials: 1,
      textures: 1,
    }),
    Object.freeze({
      id: "plant",
      src: "ar/interests/web/plant.glb",
      geometryCount: 1,
      triangles: 118_331,
      materials: 1,
      textures: 1,
    }),
    Object.freeze({
      id: "backpack",
      src: "ar/interests/web/backpack.glb",
      geometryCount: 1,
      triangles: 106_208,
      materials: 1,
      textures: 3,
    }),
    Object.freeze({
      id: "robot",
      src: "ar/interests/web/robot.glb",
      geometryCount: 1,
      triangles: 99_508,
      materials: 1,
      textures: 4,
    }),
    Object.freeze({
      id: "book",
      src: "ar/interests/web/book.glb",
      geometryCount: 1,
      triangles: 63_896,
      materials: 1,
      textures: 4,
    }),
    Object.freeze({
      id: "evil-eye",
      src: "ar/interests/web/evil-eye.glb",
      geometryCount: 1,
      triangles: 9_996,
      materials: 1,
      textures: 1,
    }),
  ]),
});

/**
 * @param {string | null | undefined} raw
 * @returns {ArRuntimeVariantName | null}
 */
export function parseArRuntimeVariant(raw) {
  if (raw == null) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  return AR_RUNTIME_VARIANT_NAMES.includes(value)
    ? /** @type {ArRuntimeVariantName} */ (value)
    : null;
}

/**
 * Snapshot label: explicit variant name, or "default" when URL omits the param.
 * @param {ArRuntimeVariantName | null | undefined} variant
 */
export function arRuntimeVariantSnapshotLabel(variant) {
  return variant ?? "default";
}

/**
 * True only when an explicit diagnostic variant was requested.
 * @param {ArRuntimeVariantName | null | undefined} variant
 */
export function isDiagnosticArRuntimeVariant(variant) {
  return variant != null;
}

/**
 * Interest config list for the active variant. Null → use production INTEREST_OBJECTS.
 * @param {ArRuntimeVariantName | null | undefined} variant
 * @returns {typeof INTEREST_OBJECTS | []}
 */
export function resolveInterestItemsForVariant(variant) {
  if (variant === "no-models") return [];
  if (variant === "single-model") {
    const one = INTEREST_OBJECTS.find((item) => item.id === AR_RUNTIME_VARIANT_SINGLE_MODEL_ID);
    return one ? [one] : INTEREST_OBJECTS.slice(0, 1);
  }
  // baseline | half-resolution | no-card-layout | default → full set
  return INTEREST_OBJECTS;
}

/**
 * Cap pixel ratio to approximately half the native DPR (never below 1).
 * @param {number} devicePixelRatio
 */
export function halfResolutionPixelRatio(devicePixelRatio) {
  const dpr = Number(devicePixelRatio);
  const safe = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.max(1, Math.round(safe * 50) / 100);
}

/**
 * Apply half-resolution cap when that variant is active. No-op otherwise.
 * @param {{ setPixelRatio?: (n: number) => void, getPixelRatio?: () => number } | null | undefined} renderer
 * @param {ArRuntimeVariantName | null | undefined} variant
 * @param {number} [devicePixelRatio]
 */
export function applyArRuntimeVariantPixelRatio(renderer, variant, devicePixelRatio) {
  if (variant !== "half-resolution" || !renderer?.setPixelRatio) return null;
  const next = halfResolutionPixelRatio(
    devicePixelRatio ??
      (typeof window !== "undefined" ? window.devicePixelRatio : 1),
  );
  try {
    renderer.setPixelRatio(next);
  } catch {
    return null;
  }
  return next;
}

/**
 * @param {ArRuntimeVariantName | null | undefined} variant
 */
export function shouldDisableCardLayoutProjection(variant) {
  return variant === "no-card-layout";
}

/**
 * Walk a Three.js object graph and count triangles from BufferGeometry.
 * @param {import("three").Object3D | null | undefined} root
 */
export function countObject3DTriangles(root) {
  let sceneTriangles = 0;
  let visibleTriangles = 0;
  let visibleMeshes = 0;
  if (!root || typeof root.traverse !== "function") {
    return { sceneTriangles, visibleTriangles, visibleMeshes };
  }
  root.traverse((obj) => {
    // @ts-expect-error three mesh
    if (!obj?.isMesh || !obj.geometry) return;
    // @ts-expect-error three mesh
    const geometry = obj.geometry;
    let tris = 0;
    if (geometry.index && typeof geometry.index.count === "number") {
      tris = Math.floor(geometry.index.count / 3);
    } else {
      const pos = geometry.attributes?.position;
      if (pos && typeof pos.count === "number") {
        tris = Math.floor(pos.count / 3);
      }
    }
    sceneTriangles += tris;
    let visible = true;
    let cur = obj;
    while (cur) {
      if (cur.visible === false) {
        visible = false;
        break;
      }
      cur = cur.parent;
    }
    if (visible) {
      visibleTriangles += tris;
      visibleMeshes += 1;
    }
  });
  return { sceneTriangles, visibleTriangles, visibleMeshes };
}
