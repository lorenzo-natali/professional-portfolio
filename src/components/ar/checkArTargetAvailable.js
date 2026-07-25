import { AR_TARGET_SRC } from "./arConfig";

/**
 * Lightweight availability probe for the compiled MindAR image target.
 * Used by the intro CTA (before camera) and as a safety check in the adapter.
 */
export async function checkArTargetAvailable(url = AR_TARGET_SRC) {
  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength > 64;
  } catch {
    return false;
  }
}
