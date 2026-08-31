import { decode } from "@msgpack/msgpack";
import { AR_TARGET_SRC } from "./arConfig";

/** Compiled MindAR targets are msgpack payloads; tiny bodies cannot be valid. */
export const AR_TARGET_MIN_BYTES = 256;

/** MindAR compiler export version used by mind-ar@1.x OfflineCompiler/Compiler. */
const MINDAR_TARGET_VERSION = 2;

/** @type {boolean | null} */
let availabilityCache = null;
/** @type {Promise<boolean> | null} */
let availabilityInflight = null;

/**
 * Sync snapshot of the last target-availability probe.
 * @returns {boolean | null} true/false when resolved; null while unknown / in flight.
 */
export function peekArTargetAvailable() {
  return availabilityCache;
}

/** Test-only: clear module probe cache between cases. */
export function resetArTargetAvailabilityCacheForTests() {
  availabilityCache = null;
  availabilityInflight = null;
}

/**
 * Start (or reuse) the MindAR target availability probe without blocking render.
 * Safe to call while Beyond CV is still closed so open can paint a resolved intro.
 * @param {string} [url]
 * @returns {Promise<boolean>}
 */
export function prewarmArTargetAvailable(url = AR_TARGET_SRC) {
  if (availabilityCache !== null) return Promise.resolve(availabilityCache);
  if (availabilityInflight) return availabilityInflight;

  availabilityInflight = loadArTargetBuffer(url)
    .then((buffer) => {
      availabilityCache = buffer !== null;
      availabilityInflight = null;
      return availabilityCache;
    })
    .catch(() => {
      availabilityCache = false;
      availabilityInflight = null;
      return false;
    });

  return availabilityInflight;
}

function bytesLookLikeHtml(bytes) {
  const head = new TextDecoder()
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 80)))
    .trimStart()
    .toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head");
}

/**
 * Structural validation for a compiled MindAR .mind buffer.
 * Rejects empty bodies, HTML error pages, and unparseable / wrong-version payloads.
 */
export function isValidMindTargetBuffer(buffer) {
  if (!buffer || buffer.byteLength < AR_TARGET_MIN_BYTES) return false;

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytesLookLikeHtml(bytes)) return false;

  try {
    const content = decode(bytes);
    if (!content || content.v !== MINDAR_TARGET_VERSION) return false;
    if (!Array.isArray(content.dataList) || content.dataList.length < 1) return false;
    const first = content.dataList[0];
    if (!first?.targetImage?.width || !first?.targetImage?.height) return false;
    if (first.matchingData == null || first.trackingData == null) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch + validate the compiled MindAR image target before any camera work.
 * @returns {Promise<ArrayBuffer|null>}
 */
export async function loadArTargetBuffer(url = AR_TARGET_SRC) {
  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (!isValidMindTargetBuffer(buffer)) return null;
    return buffer;
  } catch {
    return null;
  }
}

/**
 * Lightweight availability probe for the compiled MindAR image target.
 * Used by the intro CTA (before camera) and as a safety check in the adapter.
 * Shares the module prewarm cache so intro can open with a resolved UI.
 */
export async function checkArTargetAvailable(url = AR_TARGET_SRC) {
  return prewarmArTargetAvailable(url);
}

export function isTargetLoadError(error) {
  const message = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("target") ||
    message.includes("mind") ||
    message.includes("msgpack") ||
    message.includes("import") ||
    message.includes("compile") ||
    message.includes("dataList".toLowerCase())
  );
}
