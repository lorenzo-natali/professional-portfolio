/**
 * Development-only AR debug flags.
 * Constants must remain false in production builds unless intentionally flipped for a local session.
 */

/** Document-plane proof frame on the MindAR anchor. */
export const AR_SHOW_ANCHOR_PROOF = false;

/**
 * Force AR camera-quality diagnostics on without a URL flag.
 * Keep false in committed production builds.
 */
export const AR_CAMERA_DEBUG = false;

const CAMERA_DEBUG_QUERY = "arCameraDebug";

/**
 * Diagnostics are enabled only via explicit URL flag or the development constant.
 * @param {string | URLSearchParams | { search?: string }} [source]
 */
export function isArCameraDebugEnabled(source) {
  if (AR_CAMERA_DEBUG) return true;
  try {
    if (typeof source === "string") {
      const query = source.startsWith("?") ? source.slice(1) : source.includes("?") ? source.split("?")[1] : source;
      return new URLSearchParams(query).get(CAMERA_DEBUG_QUERY) === "1";
    }
    if (source instanceof URLSearchParams) {
      return source.get(CAMERA_DEBUG_QUERY) === "1";
    }
    if (source && typeof source.search === "string") {
      return new URLSearchParams(source.search).get(CAMERA_DEBUG_QUERY) === "1";
    }
    if (typeof window !== "undefined" && window.location?.search) {
      return new URLSearchParams(window.location.search).get(CAMERA_DEBUG_QUERY) === "1";
    }
  } catch {
    return false;
  }
  return false;
}
