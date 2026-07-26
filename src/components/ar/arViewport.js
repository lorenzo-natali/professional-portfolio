/**
 * AR fullscreen viewport helpers.
 *
 * Authority: only the portal host is `position:fixed`. Shell/stage/container are
 * absolute fillers (`inset:0; width/height:auto`). Never size from
 * visualViewport.width, 100vw, screen.width, or camera aspect.
 * visualViewport is for event binding + diagnostics only.
 */

const FULLSCREEN_FIXED = {
  position: "fixed",
  left: "0px",
  top: "0px",
  right: "0px",
  bottom: "0px",
  width: "auto",
  height: "auto",
  minWidth: "0",
  maxWidth: "none",
  maxHeight: "none",
  margin: "0",
  padding: "0",
  border: "0",
  transform: "none",
  boxSizing: "border-box",
  overflow: "hidden",
};

const FULLSCREEN_ABSOLUTE = {
  position: "absolute",
  left: "0px",
  top: "0px",
  right: "0px",
  bottom: "0px",
  width: "auto",
  height: "auto",
  minWidth: "0",
  maxWidth: "none",
  maxHeight: "none",
  margin: "0",
  padding: "0",
  border: "0",
  transform: "none",
  boxSizing: "border-box",
  overflow: "hidden",
};

/**
 * Apply a fixed set of inline styles (longhand only).
 * @param {HTMLElement | null} el
 * @param {Record<string, string>} styles
 */
export function applyInlineStyles(el, styles) {
  if (!el) return;
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = value;
  });
}

/**
 * Ensure a dedicated portal host exists under document.documentElement.
 *
 * Important (iPhone): do NOT parent under body while body is position:fixed for
 * scroll lock — Safari can treat that body as the containing block for fixed
 * descendants and leave a right-side gap / clipped AR plane.
 *
 * @returns {HTMLElement | null}
 */
export function ensureArPortalHost() {
  if (typeof document === "undefined") return null;
  let host = document.querySelector("[data-ar-portal-host='true']");
  if (!host) {
    host = document.createElement("div");
    host.dataset.arPortalHost = "true";
    host.className = "ar-portal-host";
  }
  // Always re-parent onto <html> so body lock cannot become the containing block.
  if (host.parentElement !== document.documentElement) {
    document.documentElement.appendChild(host);
  }
  applyInlineStyles(host, {
    ...FULLSCREEN_FIXED,
    zIndex: "2147483000",
    background: "transparent",
    pointerEvents: "none",
  });
  // Children (shell) capture pointers; host itself must not block when empty.
  return host;
}

/**
 * Remove the portal host if empty.
 * @param {HTMLElement | null} host
 */
export function teardownArPortalHost(host) {
  if (!host) return;
  if (host.childElementCount === 0) {
    host.remove();
  }
}

/**
 * Sync portal host + shell to true fullscreen. Never writes pixel width/height from VV.
 * @param {HTMLElement | null} shell
 * @param {HTMLElement | null} [host]
 */
export function syncArViewportShell(shell, host = null) {
  if (typeof window === "undefined") return;
  const portalHost =
    host ||
    shell?.closest?.("[data-ar-portal-host='true']") ||
    document.querySelector("[data-ar-portal-host='true']");

  if (portalHost) {
    applyInlineStyles(portalHost, {
      ...FULLSCREEN_FIXED,
      zIndex: "2147483000",
      background: "transparent",
      // While shell is mounted, host forwards hits to children.
      pointerEvents: shell ? "auto" : "none",
    });
  }

  if (!shell) return;
  // Shell is an absolute filler of the fixed host — avoid nested position:fixed.
  applyInlineStyles(shell, {
    ...FULLSCREEN_ABSOLUTE,
    zIndex: "1",
    background: shell.style.background || "",
    pointerEvents: "auto",
  });

  const stage = shell.querySelector?.("[data-ar-camera-stage='true']");
  if (stage) applyInlineStyles(stage, FULLSCREEN_ABSOLUTE);

  const container = shell.querySelector?.("[data-ar-tracking-container='true']");
  if (container) applyInlineStyles(container, FULLSCREEN_ABSOLUTE);
}

/**
 * Fullscreen absolute fill for stage / MindAR container — no pixel pinning.
 * Second argument kept for call-site compatibility (shell is no longer used for sizing).
 * @param {HTMLElement | null} container
 * @param {HTMLElement | null} [_shell]
 */
export function syncTrackingContainerToShell(container) {
  if (!container) return;
  applyInlineStyles(container, FULLSCREEN_ABSOLUTE);
  container.style.background = "transparent";
  container.style.maxWidth = "none";
}

/**
 * After MindAR creates/resizes video+canvas, keep the container fullscreen and
 * force WebGL/CSS3D layers to the container client box. Video may stay cover-sized
 * (larger than container with negative offsets) — never shrink the parent to camera aspect.
 *
 * @param {HTMLElement | null} container
 * @param {{ renderer?: { domElement?: HTMLElement, setSize?: Function } | null }} [options]
 * @returns {{ containerInline: Record<string, string>, videoInline: Record<string, string> | null, canvasInline: Record<string, string> | null }}
 */
export function normalizeMindArLayerStyles(container, options = {}) {
  const report = {
    containerInline: {},
    videoInline: null,
    canvasInline: null,
  };
  if (!container) return report;

  // MindAR must not leave the container as a camera-aspect box.
  syncTrackingContainerToShell(container);
  ["width", "height", "left", "top", "right", "bottom", "maxWidth", "transform"].forEach(
    (key) => {
      report.containerInline[key] = container.style[key] || "";
    },
  );

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 1 || height < 1) return report;

  const video = container.querySelector("video");
  if (video) {
    report.videoInline = {
      width: video.style.width,
      height: video.style.height,
      left: video.style.left,
      top: video.style.top,
    };
    video.style.position = "absolute";
    video.style.zIndex = "0";
    video.style.pointerEvents = "none";
    video.style.objectFit = "cover";
    // Keep MindAR cover math (may exceed container); do not rewrite to 100%x100%
    // unless MindAR left invalid/zero sizes.
    const vw = parseFloat(video.style.width) || 0;
    const vh = parseFloat(video.style.height) || 0;
    if (vw < width - 1 || vh < height - 1) {
      video.style.left = "0px";
      video.style.top = "0px";
      video.style.width = `${width}px`;
      video.style.height = `${height}px`;
    }
  }

  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas) => {
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.maxWidth = "none";
    canvas.style.background = "transparent";
  });
  if (canvases[0]) {
    report.canvasInline = {
      width: canvases[0].style.width,
      height: canvases[0].style.height,
      left: canvases[0].style.left,
      top: canvases[0].style.top,
    };
  }

  const cssHost = Array.from(container.children).find((node) => node.tagName === "DIV");
  if (cssHost) {
    cssHost.style.position = "absolute";
    cssHost.style.left = "0px";
    cssHost.style.top = "0px";
    cssHost.style.width = `${width}px`;
    cssHost.style.height = `${height}px`;
    cssHost.style.maxWidth = "none";
    cssHost.style.background = "transparent";
    cssHost.style.pointerEvents = "none";
  }

  const renderer = options.renderer;
  if (renderer?.setSize && width > 0 && height > 0) {
    try {
      renderer.setSize(width, height);
    } catch {
      // ignore
    }
  }

  return report;
}

/**
 * Bind resize / orientation / visualViewport listeners. Returns cleanup.
 * @param {() => void} onChange
 */
export function bindArViewportListeners(onChange) {
  if (typeof window === "undefined") return () => {};

  let frame = 0;
  const run = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => onChange());
  };

  window.addEventListener("resize", run);
  window.addEventListener("orientationchange", run);
  window.visualViewport?.addEventListener("resize", run);
  window.visualViewport?.addEventListener("scroll", run);

  run();

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", run);
    window.removeEventListener("orientationchange", run);
    window.visualViewport?.removeEventListener("resize", run);
    window.visualViewport?.removeEventListener("scroll", run);
  };
}

/**
 * @param {HTMLElement | null} shell
 */
export function getArShellRect(shell) {
  if (!shell) return null;
  const rect = shell.getBoundingClientRect();
  return {
    width: shell.clientWidth,
    height: shell.clientHeight,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function boxOf(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const cs = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
  return {
    tag: el.tagName?.toLowerCase?.() ?? "",
    id: el.id || "",
    className: typeof el.className === "string" ? el.className : "",
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
    offsetWidth: el.offsetWidth,
    offsetHeight: el.offsetHeight,
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    },
    inline: {
      width: el.style?.width || "",
      height: el.style?.height || "",
      left: el.style?.left || "",
      right: el.style?.right || "",
      top: el.style?.top || "",
      bottom: el.style?.bottom || "",
      maxWidth: el.style?.maxWidth || "",
      transform: el.style?.transform || "",
      position: el.style?.position || "",
    },
    style: cs
      ? {
          position: cs.position,
          display: cs.display,
          width: cs.width,
          height: cs.height,
          maxWidth: cs.maxWidth,
          left: cs.left,
          right: cs.right,
          top: cs.top,
          bottom: cs.bottom,
          padding: cs.padding,
          margin: cs.margin,
          transform: cs.transform,
          overflow: cs.overflow,
          boxSizing: cs.boxSizing,
          aspectRatio: cs.aspectRatio,
          contain: cs.contain,
          filter: cs.filter,
          perspective: cs.perspective,
        }
      : null,
  };
}

function ancestorFlags(el) {
  const flags = [];
  let node = el?.parentElement ?? null;
  while (node && node !== document.documentElement) {
    const cs = window.getComputedStyle(node);
    const hit = {
      tag: node.tagName.toLowerCase(),
      id: node.id || undefined,
      className: typeof node.className === "string" ? node.className.slice(0, 80) : undefined,
      transform: cs.transform !== "none" ? cs.transform : undefined,
      perspective: cs.perspective !== "none" ? cs.perspective : undefined,
      filter: cs.filter !== "none" ? cs.filter : undefined,
      contain: cs.contain !== "none" ? cs.contain : undefined,
      willChange: cs.willChange !== "auto" ? cs.willChange : undefined,
      position: cs.position,
      maxWidth: cs.maxWidth !== "none" ? cs.maxWidth : undefined,
      width: cs.width,
    };
    if (
      hit.transform ||
      hit.perspective ||
      hit.filter ||
      hit.contain ||
      hit.willChange ||
      hit.maxWidth ||
      hit.position === "fixed" ||
      hit.position === "transform"
    ) {
      flags.push(hit);
    }
    node = node.parentElement;
  }
  return flags;
}

/**
 * Snapshot layout metrics for DEV viewport audits (iPhone telemetry).
 * @param {HTMLElement | null} shell
 * @param {{ phase?: string, renderer?: { getContext?: Function, domElement?: HTMLCanvasElement } | null }} [options]
 */
export function collectArViewportMetrics(shell, options = {}) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const host =
    shell?.closest?.("[data-ar-portal-host='true']") ||
    document.querySelector?.("[data-ar-portal-host='true']") ||
    null;
  const root = typeof document !== "undefined" ? document.getElementById("root") : null;
  const stage = shell?.querySelector?.("[data-ar-camera-stage='true']") ?? null;
  const container = shell?.querySelector?.("[data-ar-tracking-container='true']") ?? null;
  const video = container?.querySelector?.("video") ?? null;
  const canvas = container?.querySelector?.("canvas") ?? null;

  const docW = typeof document !== "undefined" ? document.documentElement.clientWidth : 0;
  const shellBox = boxOf(shell);
  const stageBox = boxOf(stage);
  const containerBox = boxOf(container);
  const videoBox = boxOf(video);
  const canvasBox = boxOf(canvas);

  const stageLeft = stageBox?.rect?.left ?? shellBox?.rect?.left ?? 0;
  const stageRight = stageBox?.rect?.right ?? shellBox?.rect?.right ?? 0;
  const gapLeft = stageLeft;
  const gapRight = docW - stageRight;

  let drawingBuffer = null;
  if (canvas) {
    drawingBuffer = { width: canvas.width, height: canvas.height };
    try {
      const gl =
        options.renderer?.getContext?.() ||
        canvas.getContext?.("webgl2") ||
        canvas.getContext?.("webgl");
      if (gl) {
        drawingBuffer = {
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    phase: options.phase ?? "live",
    timestamp: Date.now(),
    window: {
      innerWidth: typeof window !== "undefined" ? window.innerWidth : 0,
      innerHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    },
    documentElement: {
      clientWidth: docW,
      clientHeight:
        typeof document !== "undefined" ? document.documentElement.clientHeight : 0,
    },
    body: boxOf(typeof document !== "undefined" ? document.body : null),
    visualViewport: vv
      ? {
          width: vv.width,
          height: vv.height,
          offsetLeft: vv.offsetLeft,
          offsetTop: vv.offsetTop,
          scale: vv.scale,
        }
      : null,
    screen:
      typeof screen !== "undefined"
        ? { width: screen.width, height: screen.height }
        : null,
    root: boxOf(root),
    portalHost: boxOf(host),
    shell: shellBox,
    stage: stageBox,
    container: containerBox,
    video: videoBox,
    canvas: canvasBox,
    drawingBuffer,
    gaps: {
      gapLeft,
      gapRight,
      shellMinusStage:
        (shellBox?.rect?.width ?? 0) - (stageBox?.rect?.width ?? 0),
      stageMinusContainer:
        (stageBox?.rect?.width ?? 0) - (containerBox?.rect?.width ?? 0),
      containerMinusCanvas:
        (containerBox?.rect?.width ?? 0) - (canvasBox?.rect?.width ?? 0),
      containerMinusVideo:
        (containerBox?.rect?.width ?? 0) - (videoBox?.rect?.width ?? 0),
    },
    // Back-compat for older HUD / tests.
    rightGapPx: gapRight,
    containingBlockRisks: ancestorFlags(shell || host),
    acceptance: {
      shellLeftOk: Math.abs(shellBox?.rect?.left ?? 99) <= 1,
      shellRightOk: Math.abs((shellBox?.rect?.right ?? 0) - docW) <= 1,
      stageLeftOk: Math.abs(stageLeft) <= 1,
      stageRightOk: Math.abs(stageRight - docW) <= 1,
      gapLeftOk: Math.abs(gapLeft) <= 1,
      gapRightOk: Math.abs(gapRight) <= 1,
      canvasMatchesStage:
        Math.abs((canvasBox?.rect?.width ?? 0) - (stageBox?.rect?.width ?? 0)) <= 1,
    },
  };
}

/**
 * Record a named lifecycle snapshot onto window.__arViewportLifecycle.
 * @param {HTMLElement | null} shell
 * @param {string} phase
 * @param {object} [extra]
 */
export function recordArViewportLifecycle(shell, phase, extra = {}) {
  if (typeof window === "undefined") return null;
  const snap = { ...collectArViewportMetrics(shell, { phase }), ...extra };
  if (!window.__arViewportLifecycle) window.__arViewportLifecycle = [];
  window.__arViewportLifecycle.push(snap);
  // Cap history for memory on long sessions.
  if (window.__arViewportLifecycle.length > 40) {
    window.__arViewportLifecycle.splice(0, window.__arViewportLifecycle.length - 40);
  }
  return snap;
}

/**
 * Classify whether a visible right strip is more likely ancestor layout vs media sizing.
 * Keep video ownership unchanged until field evidence confirms mediaGap.
 *
 * @param {ReturnType<typeof collectArViewportMetrics>} metrics
 */
export function classifyArResizeGapCause(metrics) {
  const docW = metrics?.documentElement?.clientWidth ?? 0;
  const shellRight = metrics?.shell?.rect?.right ?? 0;
  const stageRight = metrics?.stage?.rect?.right ?? shellRight;
  const containerW = metrics?.container?.rect?.width ?? 0;
  const videoW = metrics?.video?.rect?.width ?? 0;
  const canvasW = metrics?.canvas?.rect?.width ?? 0;
  const videoLeft = metrics?.video?.rect?.left ?? 0;
  const containerLeft = metrics?.container?.rect?.left ?? 0;
  const vv = metrics?.visualViewport;

  const ancestorGapRight = Math.max(0, docW - Math.max(shellRight, stageRight));
  const mediaShortfall = Math.max(0, containerW - Math.max(videoW, canvasW));
  const videoOffsetLeft = videoLeft - containerLeft;

  const ancestorNarrow = ancestorGapRight > 2;
  const mediaNarrow =
    !ancestorNarrow &&
    containerW > 1 &&
    (videoW < containerW - 4 || canvasW < containerW - 2 || Math.abs(videoOffsetLeft) > 2);
  const safariViewportDiffers = Boolean(
    vv &&
      (Math.abs(vv.width - (metrics?.window?.innerWidth ?? 0)) > 1 ||
        Math.abs(vv.offsetLeft ?? 0) > 0.5),
  );

  /** @type {"ancestor_layout" | "media_sizing" | "safari_viewport" | "none" | "ambiguous"} */
  let primary = "none";
  if (ancestorNarrow && mediaNarrow) primary = "ambiguous";
  else if (ancestorNarrow) primary = "ancestor_layout";
  else if (mediaNarrow) primary = "media_sizing";
  else if (safariViewportDiffers && ancestorGapRight > 0.5) primary = "safari_viewport";

  return {
    primary,
    ancestorNarrow,
    mediaNarrow,
    safariViewportDiffers,
    ancestorGapRight: Number(ancestorGapRight.toFixed(2)),
    mediaShortfall: Number(mediaShortfall.toFixed(2)),
    videoOffsetLeft: Number(videoOffsetLeft.toFixed(2)),
    shellPosition: metrics?.shell?.style?.position ?? metrics?.shell?.inline?.position ?? null,
    hostPosition:
      metrics?.portalHost?.style?.position ?? metrics?.portalHost?.inline?.position ?? null,
    videoInline: metrics?.video?.inline ?? null,
    canvasInline: metrics?.canvas?.inline ?? null,
  };
}

/**
 * Measure one step of the resize pipeline for on-device gap diagnosis.
 * @param {HTMLElement | null} shell
 * @param {HTMLElement | null} [container]
 * @param {{
 *   step?: string,
 *   reason?: string,
 *   resized?: boolean,
 *   skippedResize?: boolean,
 *   containerSize?: { width: number, height: number } | null,
 * }} [options]
 */
export function measureArResizePipeline(shell, container = null, options = {}) {
  const metrics = collectArViewportMetrics(shell, { phase: options.step ?? "resize-probe" });
  const resolvedContainer =
    container || shell?.querySelector?.("[data-ar-tracking-container='true']") || null;
  const cause = classifyArResizeGapCause(metrics);
  return {
    timestamp: Date.now(),
    step: options.step ?? "resize-probe",
    reason: options.reason ?? null,
    resized: Boolean(options.resized),
    skippedResize: Boolean(options.skippedResize),
    containerSize: options.containerSize ?? {
      width: resolvedContainer?.clientWidth ?? 0,
      height: resolvedContainer?.clientHeight ?? 0,
    },
    cause,
    gaps: metrics.gaps,
    acceptance: metrics.acceptance,
    rects: {
      docW: metrics.documentElement.clientWidth,
      innerW: metrics.window.innerWidth,
      screenW: metrics.screen?.width ?? null,
      visualViewport: metrics.visualViewport,
      portalHost: metrics.portalHost?.rect ?? null,
      shell: metrics.shell?.rect ?? null,
      stage: metrics.stage?.rect ?? null,
      container: metrics.container?.rect ?? null,
      video: metrics.video?.rect ?? null,
      canvas: metrics.canvas?.rect ?? null,
    },
    inline: {
      hostPosition: metrics.portalHost?.inline?.position ?? null,
      shellPosition: metrics.shell?.inline?.position ?? null,
      video: metrics.video?.inline ?? null,
      canvas: metrics.canvas?.inline ?? null,
    },
  };
}

/**
 * Append a resize-pipeline probe to window.__arViewportResizeLog (capped).
 * @param {ReturnType<typeof measureArResizePipeline>} probe
 */
export function recordArViewportResizeProbe(probe) {
  if (typeof window === "undefined" || !probe) return probe;
  if (!window.__arViewportResizeLog) window.__arViewportResizeLog = [];
  window.__arViewportResizeLog.push(probe);
  if (window.__arViewportResizeLog.length > 60) {
    window.__arViewportResizeLog.splice(0, window.__arViewportResizeLog.length - 60);
  }
  console.info("[ar-viewport-resize]", probe.step, {
    primary: probe.cause?.primary,
    ancestorGapRight: probe.cause?.ancestorGapRight,
    mediaShortfall: probe.cause?.mediaShortfall,
    resized: probe.resized,
    skippedResize: probe.skippedResize,
  });
  return probe;
}
