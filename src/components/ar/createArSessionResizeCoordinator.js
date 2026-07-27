import {
  applyArRuntimeVariantPixelRatio,
  halfResolutionPixelRatio,
} from "./arRuntimeVariant";
import {
  measureArResizePipeline,
  normalizeMindArLayerStyles,
  recordArViewportLifecycle,
  recordArViewportResizeProbe,
  syncArViewportShell,
  syncTrackingContainerToShell,
} from "./arViewport";

/**
 * Resolve the pixel ratio this session should assert.
 * Production keeps devicePixelRatio; half-resolution variant is opt-in only.
 * @param {import("./arRuntimeVariant").ArRuntimeVariantName | null | undefined} variant
 * @param {number} [devicePixelRatio]
 */
export function resolveSessionPixelRatio(variant, devicePixelRatio) {
  const dpr =
    devicePixelRatio ??
    (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  if (variant === "half-resolution") {
    return halfResolutionPixelRatio(dpr);
  }
  const safe = Number(dpr);
  return Number.isFinite(safe) && safe > 0 ? safe : 1;
}

/**
 * Portfolio does not use MindAR CSS3D anchors. Strip the unused layer so it
 * cannot keep a second visual/DOM surface alive beside WebGL.
 * @param {{ cssRenderer?: { setSize?: Function, domElement?: HTMLElement } | null } | null} mindarThree
 */
export function disableUnusedMindArCss3d(mindarThree) {
  const cssRenderer = mindarThree?.cssRenderer;
  if (!cssRenderer) return;
  try {
    cssRenderer.domElement?.remove?.();
  } catch {
    // ignore
  }
  cssRenderer.setSize = () => {};
}

/**
 * Remove MindAR's constructor-installed window.resize listener so only the
 * adapter coordinator may drive renderer/camera sizing after ownership transfer.
 * @param {{ _resizeHandler?: ((ev?: Event) => void) | null } | null} mindarThree
 * @returns {boolean} true when a handler was removed
 */
export function detachMindArWindowResizeListener(mindarThree) {
  if (!mindarThree?._resizeHandler) return false;
  try {
    window.removeEventListener("resize", mindarThree._resizeHandler);
  } catch {
    // ignore
  }
  mindarThree._resizeHandler = null;
  return true;
}

/**
 * Single resize authority for one live AR session.
 * Viewport / video / orientation events only request work; this coordinator
 * coalesces to ≤1 apply per animation frame and skips unchanged metrics.
 *
 * @param {{
 *   getSessionGeneration: () => number,
 *   sessionToken: number,
 *   getMindarThree: () => any,
 *   getContainer: () => HTMLElement | null,
 *   getShell: () => HTMLElement | null,
 *   getRuntimeVariant: () => import("./arRuntimeVariant").ArRuntimeVariantName | null,
 *   applyCameraLayers?: (container: HTMLElement, renderer: any) => void,
 *   onApplied?: (result: { width: number, height: number, pixelRatio: number, reason: string }) => void,
 *   useCss3d?: boolean,
 * }} options
 */
export function createArSessionResizeCoordinator(options) {
  const {
    getSessionGeneration,
    sessionToken,
    getMindarThree,
    getContainer,
    getShell,
    getRuntimeVariant,
    applyCameraLayers,
    onApplied,
    useCss3d = false,
  } = options;

  let disposed = false;
  let rafId = 0;
  let pendingReason = "resize";
  let pendingForce = false;
  let lastWidth = -1;
  let lastHeight = -1;
  let lastPixelRatio = -1;
  let applyCount = 0;

  function isCurrentSession() {
    return !disposed && getSessionGeneration() === sessionToken;
  }

  function cancelPending() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function dispose() {
    disposed = true;
    cancelPending();
  }

  /**
   * Transfer ownership from MindAR: drop its window listener and unused CSS3D.
   * @param {any} mindarThree
   */
  function assumeOwnership(mindarThree) {
    if (!isCurrentSession() || !mindarThree) return;
    detachMindArWindowResizeListener(mindarThree);
    if (!useCss3d) {
      disableUnusedMindArCss3d(mindarThree);
    }
  }

  /**
   * Queue a coordinated resize. Multiple calls in the same frame coalesce.
   * @param {string} [reason]
   * @param {{ force?: boolean }} [opts]
   */
  function request(reason = "resize", opts = {}) {
    if (!isCurrentSession()) return;
    pendingReason = reason || "resize";
    if (opts.force) pendingForce = true;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      flush();
    });
  }

  /**
   * Apply immediately (still session-guarded). Used for deterministic tests /
   * first normalize where waiting a frame would leave NaN cover math.
   * @param {string} [reason]
   * @param {{ force?: boolean }} [opts]
   */
  function flushNow(reason, opts = {}) {
    if (reason) pendingReason = reason;
    if (opts.force) pendingForce = true;
    cancelPending();
    flush();
  }

  function flush() {
    if (!isCurrentSession()) return;

    const mindarThree = getMindarThree();
    const container = getContainer();
    const shell = getShell();
    if (!mindarThree || !container) return;

    const reason = pendingReason;
    const force = pendingForce;
    pendingForce = false;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width < 1 || height < 1) {
      // jsdom / pre-layout: still apply stacking styles when forced.
      if (force) {
        syncArViewportShell(shell);
        syncTrackingContainerToShell(container);
        applyCameraLayers?.(container, mindarThree.renderer);
      }
      return;
    }

    const variant = getRuntimeVariant?.() ?? null;
    const pixelRatio = resolveSessionPixelRatio(variant);
    const sizeChanged = width !== lastWidth || height !== lastHeight;
    const ratioChanged = pixelRatio !== lastPixelRatio;
    if (!force && !sizeChanged && !ratioChanged) {
      // Still sync shell CSS vars when events fire, without touching GPU buffers.
      syncArViewportShell(shell);
      syncTrackingContainerToShell(container);
      return;
    }

    recordArViewportResizeProbe(
      measureArResizePipeline(shell, container, {
        step: `${reason}:before`,
        reason,
      }),
    );

    syncArViewportShell(shell);
    syncTrackingContainerToShell(container);

    let resized = false;
    try {
      if (typeof mindarThree.resize === "function") {
        // MindAR.resize owns video cover math + camera projection + WebGL setSize.
        // CSS3D setSize is a no-op when disableUnusedMindArCss3d ran.
        mindarThree.resize();
        resized = true;
      }
    } catch {
      // Best-effort; continue style normalize + pixel ratio.
    }

    const renderer = mindarThree.renderer;
    if (renderer?.setPixelRatio && (ratioChanged || force)) {
      if (variant === "half-resolution") {
        applyArRuntimeVariantPixelRatio(renderer, variant);
      } else {
        try {
          renderer.setPixelRatio(pixelRatio);
        } catch {
          // ignore
        }
      }
    }

    // Styles only — never call renderer.setSize here (single GPU size authority).
    normalizeMindArLayerStyles(container, { resizeRenderer: false });
    applyCameraLayers?.(container, renderer);

    lastWidth = width;
    lastHeight = height;
    lastPixelRatio = pixelRatio;
    applyCount += 1;

    const after = measureArResizePipeline(shell, container, {
      step: `${reason}:after-normalize`,
      reason,
      resized,
      skippedResize: false,
      containerSize: { width, height },
    });
    recordArViewportResizeProbe(after);
    recordArViewportLifecycle(shell, reason, {
      resizeCause: after.cause,
      resized,
      pixelRatio,
    });

    onApplied?.({ width, height, pixelRatio, reason });
  }

  return {
    request,
    flushNow,
    dispose,
    cancelPending,
    assumeOwnership,
    isDisposed: () => disposed,
    getApplyCount: () => applyCount,
    getLastApplied: () => ({
      width: lastWidth,
      height: lastHeight,
      pixelRatio: lastPixelRatio,
    }),
  };
}
