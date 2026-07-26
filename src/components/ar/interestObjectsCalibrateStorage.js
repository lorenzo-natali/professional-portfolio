import { INTEREST_OBJECTS } from "./interestObjectsConfig";

/** Versioned DEV key for autosave + Save final layout. */
export const AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY = "ar-interest-final-layout-dev-v1";

/**
 * @param {{ search?: string, forceFlag?: boolean }} [options]
 */
export function isInterestObjectsCalibrateEnabled({
  search = typeof window !== "undefined" ? window.location.search : "",
  forceFlag = false,
} = {}) {
  if (forceFlag) return true;
  try {
    return new URLSearchParams(search).get("arInterestsCalibrate") === "1";
  } catch {
    return false;
  }
}

/**
 * Production baseline layout (never mutated by calibrate mode).
 * `placement.v` maps to config `origin.vTop`.
 */
export function getProductionInterestLayout() {
  /** @type {Record<string, object>} */
  const layout = {};
  INTEREST_OBJECTS.forEach((item) => {
    layout[item.id] = {
      placement: { u: item.origin.u, v: item.origin.vTop },
      displayYaw: item.displayYaw,
      targetSize: item.targetSize,
      canonicalRotation: { ...item.canonicalRotation },
      displayTilt: item.displayTilt ? { ...item.displayTilt } : { x: 0, y: 0 },
      groundOffset: item.groundOffset,
    };
  });
  return layout;
}

/**
 * @param {unknown} raw
 * @returns {Record<string, object> | null}
 */
export function normalizeInterestLayout(raw) {
  if (!raw || typeof raw !== "object") return null;
  const production = getProductionInterestLayout();
  /** @type {Record<string, object>} */
  const out = {};
  INTEREST_OBJECTS.forEach((item) => {
    const src = /** @type {any} */ (raw)[item.id] ?? {};
    const base = production[item.id];
    const placement = src.placement && typeof src.placement === "object" ? src.placement : {};
    out[item.id] = {
      placement: {
        u: typeof placement.u === "number" ? placement.u : base.placement.u,
        v: typeof placement.v === "number" ? placement.v : base.placement.v,
      },
      displayYaw: typeof src.displayYaw === "number" ? src.displayYaw : base.displayYaw,
      targetSize:
        typeof src.targetSize === "number" && src.targetSize > 0
          ? src.targetSize
          : base.targetSize,
      canonicalRotation: {
        ...base.canonicalRotation,
        ...(src.canonicalRotation && typeof src.canonicalRotation === "object"
          ? src.canonicalRotation
          : {}),
      },
      displayTilt: {
        ...base.displayTilt,
        ...(src.displayTilt && typeof src.displayTilt === "object" ? src.displayTilt : {}),
      },
      groundOffset:
        typeof src.groundOffset === "number" ? src.groundOffset : base.groundOffset,
    };
  });
  return out;
}

/**
 * @param {string} [key]
 * @returns {Record<string, object> | null}
 */
export function loadInterestLayoutFromStorage(key = AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeInterestLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, object>} layout
 * @param {string} [key]
 */
export function saveInterestLayoutToStorage(
  layout,
  key = AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY,
) {
  if (typeof localStorage === "undefined") return false;
  const normalized = normalizeInterestLayout(layout);
  if (!normalized) return false;
  localStorage.setItem(key, JSON.stringify(normalized));
  return true;
}

/**
 * Build export object from a live interest layer.
 * @param {{ entries: Array<{ id: string, config: any }>, getConfigSnapshot?: Function }} layer
 */
export function buildInterestLayoutFromLayer(layer) {
  const production = getProductionInterestLayout();
  /** @type {Record<string, object>} */
  const layout = {};
  INTEREST_OBJECTS.forEach((item) => {
    const snap = layer.getConfigSnapshot?.(item.id);
    const entry = layer.entries?.find((e) => e.id === item.id);
    const cfg = snap || entry?.config;
    const base = production[item.id];
    if (!cfg) {
      layout[item.id] = { ...base };
      return;
    }
    layout[item.id] = {
      placement: {
        u: cfg.origin?.u ?? base.placement.u,
        v: cfg.origin?.vTop ?? base.placement.v,
      },
      displayYaw: cfg.displayYaw ?? base.displayYaw,
      targetSize: cfg.targetSize ?? base.targetSize,
      canonicalRotation: {
        ...(cfg.canonicalRotation ?? base.canonicalRotation),
      },
      displayTilt: {
        x: cfg.displayTilt?.x ?? base.displayTilt.x,
        y: cfg.displayTilt?.y ?? base.displayTilt.y,
      },
      groundOffset: cfg.groundOffset ?? base.groundOffset,
    };
  });
  return layout;
}

/**
 * Apply a layout snapshot onto the live layer (local transforms only).
 * @param {{ applyPoseEdit: Function, getEntry?: Function }} layer
 * @param {Record<string, object>} layout
 */
export function applyInterestLayoutToLayer(layer, layout) {
  const normalized = normalizeInterestLayout(layout);
  if (!normalized) return;
  Object.entries(normalized).forEach(([id, item]) => {
    layer.applyPoseEdit(id, {
      origin: { u: item.placement.u, vTop: item.placement.v },
      displayYaw: item.displayYaw,
      displayTilt: item.displayTilt,
      groundOffset: item.groundOffset,
      targetSize: item.targetSize,
    });
  });
}
