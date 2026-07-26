/**
 * AR viewport shell sizing authority.
 *
 * Fullscreen uses CSS `position:fixed; inset:0` — never visualViewport.width /
 * 100vw pixel boxes. On iOS Safari, sizing the shell to visualViewport.width
 * left a gap on the right that exposed the portfolio page behind the portal.
 *
 * MindAR still measures the shell's laid-out client box after sync.
 * @param {HTMLElement | null} shell
 */
export function syncArViewportShell(shell) {
  if (!shell || typeof window === "undefined") return;

  shell.style.position = "fixed";
  // Longhand inset only — never the `inset` shorthand after setting left/top.
  shell.style.left = "0px";
  shell.style.top = "0px";
  shell.style.right = "0px";
  shell.style.bottom = "0px";
  shell.style.width = "auto";
  shell.style.height = "auto";
  shell.style.maxWidth = "none";
  shell.style.maxHeight = "none";
  shell.style.margin = "0";
  shell.style.padding = "0";
  shell.style.transform = "none";
  shell.style.overflow = "hidden";
  shell.style.boxSizing = "border-box";
}

/**
 * Bind resize / orientation / visualViewport listeners. Returns cleanup.
 * Listeners re-sync the fullscreen layer and let MindAR re-measure the shell.
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
 * Read the shell box used as MindAR sizing authority.
 * @param {HTMLElement | null} shell
 */
export function getArShellRect(shell) {
  if (!shell) return null;
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  const rect = shell.getBoundingClientRect();
  return {
    width,
    height,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Snapshot layout metrics for DEV viewport audits.
 * @param {HTMLElement | null} shell
 */
export function collectArViewportMetrics(shell) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const stage = shell?.querySelector?.("[data-ar-camera-stage='true']") ?? null;
  const container = shell?.querySelector?.("[data-ar-tracking-container='true']") ?? null;
  const video = container?.querySelector?.("video") ?? null;
  const canvas = container?.querySelector?.("canvas") ?? null;

  const boxOf = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
    return {
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
          }
        : null,
    };
  };

  const shellBox = boxOf(shell);
  const layoutRight =
    typeof document !== "undefined" ? document.documentElement.clientWidth : 0;
  const stageRight = shellBox?.rect?.right ?? 0;

  return {
    window: {
      innerWidth: typeof window !== "undefined" ? window.innerWidth : 0,
      innerHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    },
    documentElement: {
      clientWidth: typeof document !== "undefined" ? document.documentElement.clientWidth : 0,
      clientHeight: typeof document !== "undefined" ? document.documentElement.clientHeight : 0,
    },
    body: {
      clientWidth: typeof document !== "undefined" ? document.body.clientWidth : 0,
      clientHeight: typeof document !== "undefined" ? document.body.clientHeight : 0,
    },
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
    shell: shellBox,
    stage: boxOf(stage),
    container: boxOf(container),
    video: boxOf(video),
    canvas: boxOf(canvas),
    drawingBuffer: canvas
      ? {
          width: canvas.width,
          height: canvas.height,
        }
      : null,
    rightGapPx: layoutRight - stageRight,
  };
}
