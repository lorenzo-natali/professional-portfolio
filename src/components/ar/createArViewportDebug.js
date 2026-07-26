import { collectArViewportMetrics } from "./arViewport";

/**
 * DEV overlay: outlines shell / MindAR container / video / canvas and shows widths.
 * Enable with `?arViewportDebug=1`.
 *
 * @param {HTMLElement | null} shell
 * @param {{ enabled?: boolean }} [options]
 */
export function createArViewportDebug(shell, options = {}) {
  const enabled = Boolean(options.enabled);
  if (!enabled || !shell || typeof document === "undefined") {
    return { enabled: false, dispose() {} };
  }

  const overlay = document.createElement("div");
  overlay.dataset.arViewportDebug = "true";
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:2147483640",
    "pointer-events:none",
    "font:11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
    "color:#e2e8f0",
  ].join(";");

  const hud = document.createElement("pre");
  hud.style.cssText = [
    "position:absolute",
    "left:8px",
    "top:8px",
    "margin:0",
    "padding:8px 10px",
    "max-width:min(96vw, 22rem)",
    "background:rgba(2,6,23,0.82)",
    "border:1px solid rgba(148,163,184,0.35)",
    "border-radius:8px",
    "white-space:pre-wrap",
    "overflow:auto",
    "max-height:45vh",
  ].join(";");
  overlay.appendChild(hud);

  /** @type {Map<string, HTMLDivElement>} */
  const outlines = new Map();
  const colors = {
    shell: "#38bdf8",
    container: "#a78bfa",
    video: "#34d399",
    canvas: "#f472b6",
  };

  function ensureOutline(key, color) {
    let el = outlines.get(key);
    if (!el) {
      el = document.createElement("div");
      el.dataset.arViewportOutline = key;
      el.style.cssText = [
        "position:fixed",
        "pointer-events:none",
        `outline:2px solid ${color}`,
        "outline-offset:-1px",
        "background:transparent",
        "z-index:2147483635",
      ].join(";");
      document.body.appendChild(el);
      outlines.set(key, el);
    }
    return el;
  }

  function placeOutline(key, box, color) {
    const el = ensureOutline(key, color);
    if (!box?.rect) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${box.rect.left}px`;
    el.style.top = `${box.rect.top}px`;
    el.style.width = `${box.rect.width}px`;
    el.style.height = `${box.rect.height}px`;
  }

  let raf = 0;
  const tick = () => {
    const m = collectArViewportMetrics(shell);
    placeOutline("shell", m.shell, colors.shell);
    placeOutline("container", m.container, colors.container);
    placeOutline("video", m.video, colors.video);
    placeOutline("canvas", m.canvas, colors.canvas);

    const fmt = (box) =>
      box ? `${Math.round(box.rect?.width ?? 0)}×${Math.round(box.rect?.height ?? 0)}` : "—";
    const vv = m.visualViewport;
    hud.textContent = [
      "AR viewport debug",
      `inner: ${m.window.innerWidth}×${m.window.innerHeight}`,
      `docEl: ${m.documentElement.clientWidth}×${m.documentElement.clientHeight}`,
      `body:  ${m.body.clientWidth}×${m.body.clientHeight}`,
      vv
        ? `vv:    ${Math.round(vv.width)}×${Math.round(vv.height)} @${vv.offsetLeft},${vv.offsetTop} s=${vv.scale}`
        : "vv:    —",
      `shell: ${fmt(m.shell)}`,
      `stage: ${fmt(m.stage)}`,
      `mind:  ${fmt(m.container)}`,
      `video: ${fmt(m.video)}`,
      `canvas:${fmt(m.canvas)}`,
      m.drawingBuffer
        ? `buf:   ${m.drawingBuffer.width}×${m.drawingBuffer.height}`
        : "buf:   —",
      `rightGap(docEl−stage): ${m.rightGapPx.toFixed(1)}px`,
    ].join("\n");

    raf = requestAnimationFrame(tick);
  };

  shell.appendChild(overlay);
  raf = requestAnimationFrame(tick);
  window.__arViewportDebug = {
    metrics: () => collectArViewportMetrics(shell),
  };

  return {
    enabled: true,
    dispose() {
      cancelAnimationFrame(raf);
      overlay.remove();
      outlines.forEach((el) => el.remove());
      outlines.clear();
      if (window.__arViewportDebug) delete window.__arViewportDebug;
    },
  };
}

/**
 * @param {{ search?: string, forceFlag?: boolean }} [options]
 */
export function isArViewportDebugEnabled({
  search = typeof window !== "undefined" ? window.location.search : "",
  forceFlag = false,
} = {}) {
  if (forceFlag) return true;
  try {
    return new URLSearchParams(search).get("arViewportDebug") === "1";
  } catch {
    return false;
  }
}
