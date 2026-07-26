/**
 * Temporary AR camera-quality diagnostics (measurement only).
 * Does not alter getUserMedia constraints or tracking behavior.
 */

import { isArCameraDebugEnabled } from "./arDebug";

const REDACTED = "[redacted]";

/**
 * @typedef {object} CameraQualitySnapshot
 * @property {string} capturedAt
 * @property {string} userAgent
 * @property {string} orientation
 * @property {number} devicePixelRatio
 * @property {{ width: number|null, height: number|null, offsetLeft: number|null, offsetTop: number|null }} visualViewport
 * @property {{ videoWidth: number, videoHeight: number, clientWidth: number, clientHeight: number, boundingRect: object }} video
 * @property {object|null} settings
 * @property {object|null} constraints
 * @property {object|null} capabilities
 * @property {{ width: number|null, height: number|null, frameRate: number|null, facingMode: string|null, aspectRatio: number|null, deviceId: string|null, resizeMode: string|null }} selected
 * @property {{ nativeAspect: number|null, renderedAspect: number|null, coverScale: number|null, nativePerCss: number|null, nativePerPhysical: number|null, physicalScale: number|null, cropHorizontalPct: number|null, cropVerticalPct: number|null, upscaled: boolean|null, coverCssWidth: number|null, coverCssHeight: number|null }} metrics
 */

export function redactMediaIdentifiers(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactMediaIdentifiers(item));
  }
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "deviceId" || key === "groupId") {
      out[key] = entry == null || entry === "" ? entry : REDACTED;
    } else if (entry && typeof entry === "object") {
      out[key] = redactMediaIdentifiers(entry);
    } else {
      out[key] = entry;
    }
  }
  return out;
}

/**
 * MindAR cover CSS box from native stream vs container (same branch logic as MindAR resize).
 * @param {number} videoWidth
 * @param {number} videoHeight
 * @param {number} containerWidth
 * @param {number} containerHeight
 */
export function computeCoverLayout(videoWidth, videoHeight, containerWidth, containerHeight) {
  if (!(videoWidth > 0 && videoHeight > 0 && containerWidth > 0 && containerHeight > 0)) {
    return {
      coverCssWidth: null,
      coverCssHeight: null,
      coverScale: null,
      cropHorizontalPct: null,
      cropVerticalPct: null,
      visibleWidthFraction: null,
      visibleHeightFraction: null,
    };
  }

  const videoRatio = videoWidth / videoHeight;
  const containerRatio = containerWidth / containerHeight;
  let coverCssWidth;
  let coverCssHeight;
  if (videoRatio > containerRatio) {
    coverCssHeight = containerHeight;
    coverCssWidth = coverCssHeight * videoRatio;
  } else {
    coverCssWidth = containerWidth;
    coverCssHeight = coverCssWidth / videoRatio;
  }

  const coverScale = coverCssWidth / videoWidth;
  const visibleWidthFraction = containerWidth / coverCssWidth;
  const visibleHeightFraction = containerHeight / coverCssHeight;

  return {
    coverCssWidth,
    coverCssHeight,
    coverScale,
    visibleWidthFraction,
    visibleHeightFraction,
    cropHorizontalPct: (1 - visibleWidthFraction) * 100,
    cropVerticalPct: (1 - visibleHeightFraction) * 100,
  };
}

/**
 * Derive scale / upscale metrics from native and rendered sizes.
 * @param {number} videoWidth
 * @param {number} videoHeight
 * @param {number} clientWidth
 * @param {number} clientHeight
 * @param {number} devicePixelRatio
 * @param {{ coverScale?: number|null, cropHorizontalPct?: number|null, cropVerticalPct?: number|null, coverCssWidth?: number|null, coverCssHeight?: number|null }} [cover]
 */
export function computeDisplayMetrics(
  videoWidth,
  videoHeight,
  clientWidth,
  clientHeight,
  devicePixelRatio,
  cover = {},
) {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const nativeAspect = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : null;
  const renderedAspect = clientWidth > 0 && clientHeight > 0 ? clientWidth / clientHeight : null;

  const coverScale =
    cover.coverScale ??
    (videoWidth > 0 && clientWidth > 0 ? clientWidth / videoWidth : null);

  const nativePerCss =
    videoWidth > 0 && clientWidth > 0 ? videoWidth / clientWidth : null;
  const physicalWidth = clientWidth > 0 ? clientWidth * dpr : null;
  const nativePerPhysical =
    videoWidth > 0 && physicalWidth > 0 ? videoWidth / physicalWidth : null;
  const physicalScale =
    videoWidth > 0 && physicalWidth > 0 ? physicalWidth / videoWidth : null;

  return {
    nativeAspect,
    renderedAspect,
    coverScale,
    nativePerCss,
    nativePerPhysical,
    physicalScale,
    cropHorizontalPct: cover.cropHorizontalPct ?? null,
    cropVerticalPct: cover.cropVerticalPct ?? null,
    coverCssWidth: cover.coverCssWidth ?? null,
    coverCssHeight: cover.coverCssHeight ?? null,
    upscaled: physicalScale == null ? null : physicalScale > 1 + 1e-6,
  };
}

function safeCall(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

function readOrientation() {
  try {
    if (typeof screen !== "undefined" && screen.orientation?.type) {
      return screen.orientation.type;
    }
  } catch {
    // ignore
  }
  if (typeof window !== "undefined" && typeof window.orientation === "number") {
    return `window.orientation:${window.orientation}`;
  }
  return "unknown";
}

function readVisualViewport() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (!vv) {
    return { width: null, height: null, offsetLeft: null, offsetTop: null };
  }
  return {
    width: vv.width ?? null,
    height: vv.height ?? null,
    offsetLeft: vv.offsetLeft ?? null,
    offsetTop: vv.offsetTop ?? null,
  };
}

/**
 * Collect a full camera-quality snapshot from a live <video> element.
 * @param {HTMLVideoElement} video
 * @param {{ container?: HTMLElement|null, includeTrackDetails?: boolean }} [options]
 * @returns {CameraQualitySnapshot|null}
 */
export function collectCameraQualitySnapshot(video, options = {}) {
  if (!video) return null;
  const videoWidth = Number(video.videoWidth) || 0;
  const videoHeight = Number(video.videoHeight) || 0;
  if (!(videoWidth > 0 && videoHeight > 0)) return null;

  const clientWidth = video.clientWidth || 0;
  const clientHeight = video.clientHeight || 0;
  const rect = safeCall(() => video.getBoundingClientRect()) || {
    x: 0,
    y: 0,
    width: clientWidth,
    height: clientHeight,
    top: 0,
    left: 0,
    right: clientWidth,
    bottom: clientHeight,
  };

  const container = options.container || video.parentElement;
  const containerWidth = container?.clientWidth || clientWidth;
  const containerHeight = container?.clientHeight || clientHeight;
  const cover = computeCoverLayout(videoWidth, videoHeight, containerWidth, containerHeight);

  const dpr =
    typeof window !== "undefined" && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;

  const includeTrackDetails = options.includeTrackDetails !== false;
  let settings = null;
  let constraints = null;
  let capabilities = null;

  if (includeTrackDetails) {
    const track = safeCall(() => video.srcObject?.getVideoTracks?.()?.[0]) || null;
    if (track) {
      settings = redactMediaIdentifiers(safeCall(() => track.getSettings?.()) || {});
      constraints = redactMediaIdentifiers(safeCall(() => track.getConstraints?.()) || {});
      capabilities = redactMediaIdentifiers(safeCall(() => track.getCapabilities?.()) || null);
    }
  }

  const selected = {
    width: settings?.width ?? null,
    height: settings?.height ?? null,
    frameRate: settings?.frameRate ?? null,
    facingMode: settings?.facingMode ?? null,
    aspectRatio: settings?.aspectRatio ?? null,
    deviceId: settings?.deviceId ?? null,
    resizeMode: settings?.resizeMode ?? null,
  };

  const metrics = computeDisplayMetrics(
    videoWidth,
    videoHeight,
    clientWidth || cover.coverCssWidth || 0,
    clientHeight || cover.coverCssHeight || 0,
    dpr,
    cover,
  );

  // Prefer measured client box for coverScale when MindAR has applied styles.
  if (clientWidth > 0 && videoWidth > 0) {
    metrics.coverScale = clientWidth / videoWidth;
    metrics.nativePerCss = videoWidth / clientWidth;
    const physicalWidth = clientWidth * dpr;
    metrics.nativePerPhysical = videoWidth / physicalWidth;
    metrics.physicalScale = physicalWidth / videoWidth;
    metrics.upscaled = metrics.physicalScale > 1 + 1e-6;
  }

  return {
    capturedAt: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    orientation: readOrientation(),
    devicePixelRatio: dpr,
    visualViewport: readVisualViewport(),
    video: {
      videoWidth,
      videoHeight,
      clientWidth,
      clientHeight,
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    },
    settings,
    constraints,
    capabilities,
    selected,
    metrics,
  };
}

/**
 * Update only display/viewport-dependent fields on an existing snapshot.
 * @param {CameraQualitySnapshot} previous
 * @param {HTMLVideoElement} video
 * @param {{ container?: HTMLElement|null }} [options]
 */
export function refreshDisplayMetrics(previous, video, options = {}) {
  const next = collectCameraQualitySnapshot(video, {
    container: options.container,
    includeTrackDetails: false,
  });
  if (!next || !previous) return previous;

  return {
    ...previous,
    capturedAt: next.capturedAt,
    devicePixelRatio: next.devicePixelRatio,
    visualViewport: next.visualViewport,
    orientation: next.orientation,
    video: next.video,
    metrics: {
      ...previous.metrics,
      ...next.metrics,
    },
  };
}

export function waitForVideoDimensions(video, { timeoutMs = 8000, intervalMs = 50 } = {}) {
  return new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error("No video element"));
      return;
    }
    const started = Date.now();
    const tick = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve(video);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("Timed out waiting for video dimensions"));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/**
 * Attach diagnostics lifecycle: initial snapshot + viewport/orientation updates.
 * Logs once to console; subsequent updates call onSnapshot without re-logging track settings spam.
 *
 * @param {{
 *   video: HTMLVideoElement,
 *   container?: HTMLElement|null,
 *   onSnapshot?: (snapshot: CameraQualitySnapshot) => void,
 *   logInitial?: boolean,
 * }} options
 * @returns {() => void} cleanup
 */
export function attachArCameraDiagnostics({
  video,
  container = null,
  onSnapshot,
  logInitial = true,
} = {}) {
  if (!video || !isArCameraDebugEnabled()) {
    return () => {};
  }

  let disposed = false;
  let latest = null;
  let logged = false;

  const emit = (snapshot, { log = false } = {}) => {
    if (!snapshot || disposed) return;
    latest = snapshot;
    if (log && !logged) {
      console.info("[ar-camera-quality]", snapshot);
      logged = true;
    }
    onSnapshot?.(snapshot);
  };

  const captureFull = () => {
    const snapshot = collectCameraQualitySnapshot(video, { container });
    emit(snapshot, { log: logInitial });
  };

  const captureDisplayOnly = () => {
    if (!latest) {
      captureFull();
      return;
    }
    const snapshot = refreshDisplayMetrics(latest, video, { container });
    emit(snapshot, { log: false });
  };

  let cancelled = false;
  waitForVideoDimensions(video)
    .then(() => {
      if (cancelled || disposed) return;
      captureFull();
    })
    .catch(() => {
      // Non-fatal: diagnostics stay silent if metadata never arrives.
    });

  const onViewport = () => captureDisplayOnly();
  const onOrientation = () => {
    // Orientation can change the selected mode on some UAs — re-read track once.
    captureFull();
  };

  window.visualViewport?.addEventListener("resize", onViewport);
  window.visualViewport?.addEventListener("scroll", onViewport);
  window.addEventListener("resize", onViewport);
  window.addEventListener("orientationchange", onOrientation);

  return () => {
    cancelled = true;
    disposed = true;
    window.visualViewport?.removeEventListener("resize", onViewport);
    window.visualViewport?.removeEventListener("scroll", onViewport);
    window.removeEventListener("resize", onViewport);
    window.removeEventListener("orientationchange", onOrientation);
  };
}

export function formatCameraDiagnosticsSummary(snapshot) {
  if (!snapshot) return "";
  const { video, selected, metrics, devicePixelRatio } = snapshot;
  const fps =
    selected.frameRate == null
      ? "n/a"
      : Number.isFinite(selected.frameRate)
        ? Math.round(selected.frameRate * 10) / 10
        : String(selected.frameRate);
  const cover =
    metrics.coverScale == null ? "n/a" : metrics.coverScale.toFixed(3);
  const physical =
    metrics.physicalScale == null ? "n/a" : metrics.physicalScale.toFixed(3);
  const cropH =
    metrics.cropHorizontalPct == null ? "n/a" : `${metrics.cropHorizontalPct.toFixed(1)}%`;
  const cropV =
    metrics.cropVerticalPct == null ? "n/a" : `${metrics.cropVerticalPct.toFixed(1)}%`;
  const upscaled =
    metrics.upscaled == null ? "n/a" : metrics.upscaled ? "yes" : "no";

  return [
    `Native: ${video.videoWidth} × ${video.videoHeight} @ ${fps}`,
    `Rendered: ${video.clientWidth} × ${video.clientHeight} CSS`,
    `DPR: ${devicePixelRatio}`,
    `Facing: ${selected.facingMode ?? "n/a"}`,
    `Cover scale: ${cover}`,
    `Physical scale: ${physical}`,
    `Crop: ${cropH} / ${cropV}`,
    `Upscaled: ${upscaled}`,
  ].join("\n");
}
