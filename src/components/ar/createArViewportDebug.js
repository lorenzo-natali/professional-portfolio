import {
  collectArViewportMetrics,
  recordArViewportLifecycle,
} from "./arViewport";

/**
 * DEV / field telemetry overlay for iPhone viewport audits.
 * Enable with `?arViewportDebug=1` (works in production builds too).
 *
 * @param {HTMLElement | null} shell
 * @param {{ enabled?: boolean }} [options]
 */
export function createArViewportDebug(shell, options = {}) {
  const enabled = Boolean(options.enabled);
  if (!enabled || !shell || typeof document === "undefined") {
    return { enabled: false, dispose() {}, recordPhase() {} };
  }

  const overlay = document.createElement("div");
  overlay.dataset.arViewportDebug = "true";
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:2147483640",
    "pointer-events:none",
    "font:10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
    "color:#e2e8f0",
  ].join(";");

  const hud = document.createElement("pre");
  hud.style.cssText = [
    "position:absolute",
    "left:6px",
    "top:6px",
    "margin:0",
    "padding:7px 9px",
    "max-width:min(96vw, 24rem)",
    "background:rgba(2,6,23,0.88)",
    "border:1px solid rgba(148,163,184,0.4)",
    "border-radius:8px",
    "white-space:pre-wrap",
    "overflow:auto",
    "max-height:52vh",
    "pointer-events:none",
  ].join(";");
  overlay.appendChild(hud);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy viewport diagnostics";
  copyBtn.style.cssText = [
    "position:absolute",
    "left:6px",
    "bottom:6px",
    "z-index:2147483641",
    "pointer-events:auto",
    "padding:8px 10px",
    "border-radius:8px",
    "border:1px solid rgba(148,163,184,0.5)",
    "background:rgba(15,23,42,0.92)",
    "color:#f8fafc",
    "font:12px/1.2 ui-sans-serif, system-ui, sans-serif",
  ].join(";");
  overlay.appendChild(copyBtn);

  /** @type {Map<string, HTMLDivElement>} */
  const outlines = new Map();
  /** @type {Map<string, HTMLDivElement>} */
  const markers = new Map();

  const outlineColors = {
    shell: "#38bdf8",
    stage: "#fbbf24",
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
    el.style.width = `${Math.max(0, box.rect.width)}px`;
    el.style.height = `${Math.max(0, box.rect.height)}px`;
  }

  function ensureMarker(key, color) {
    let el = markers.get(key);
    if (!el) {
      el = document.createElement("div");
      el.dataset.arViewportMarker = key;
      el.style.cssText = [
        "position:fixed",
        "top:0",
        "bottom:0",
        "width:2px",
        `background:${color}`,
        "pointer-events:none",
        "z-index:2147483638",
        "box-shadow:0 0 0 1px rgba(0,0,0,0.35)",
      ].join(";");
      document.body.appendChild(el);
      markers.set(key, el);
    }
    return el;
  }

  function placeMarker(key, x, color) {
    const el = ensureMarker(key, color);
    if (!Number.isFinite(x)) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${Math.round(x)}px`;
  }

  function formatMetrics(m) {
    const fmt = (box) =>
      box
        ? `${Math.round(box.rect.width)}×${Math.round(box.rect.height)} L${Math.round(box.rect.left)} R${Math.round(box.rect.right)}`
        : "—";
    const vv = m.visualViewport;
    const a = m.acceptance || {};
    return [
      `AR viewport debug · ${m.phase}`,
      `inner ${m.window.innerWidth}×${m.window.innerHeight}`,
      `docEl ${m.documentElement.clientWidth}×${m.documentElement.clientHeight}`,
      `body  ${fmt(m.body)}`,
      vv
        ? `vv    ${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetLeft)},${Math.round(vv.offsetTop)} s=${vv.scale}`
        : "vv    —",
      `root  ${fmt(m.root)}`,
      `host  ${fmt(m.portalHost)}`,
      `shell ${fmt(m.shell)} maxW=${m.shell?.style?.maxWidth || "?"} pos=${m.shell?.style?.position || "?"}`,
      `stage ${fmt(m.stage)}`,
      `mind  ${fmt(m.container)} inlineW=${m.container?.inline?.width || "—"}`,
      `video ${fmt(m.video)} inlineW=${m.video?.inline?.width || "—"}`,
      `canvas${fmt(m.canvas)}`,
      m.drawingBuffer
        ? `buf   ${m.drawingBuffer.width}×${m.drawingBuffer.height}`
        : "buf   —",
      `gapL ${m.gaps.gapLeft.toFixed(1)}  gapR ${m.gaps.gapRight.toFixed(1)}`,
      `Δ shell-stage ${m.gaps.shellMinusStage.toFixed(1)}  stage-mind ${m.gaps.stageMinusContainer.toFixed(1)}`,
      `Δ mind-canvas ${m.gaps.containerMinusCanvas.toFixed(1)}  mind-video ${m.gaps.containerMinusVideo.toFixed(1)}`,
      `OK shellL/R ${a.shellLeftOk}/${a.shellRightOk} stageL/R ${a.stageLeftOk}/${a.stageRightOk}`,
      `OK gapL/R ${a.gapLeftOk}/${a.gapRightOk} canvas=stage ${a.canvasMatchesStage}`,
      m.containingBlockRisks?.length
        ? `CB risk: ${m.containingBlockRisks
            .slice(0, 3)
            .map((r) => r.tag + (r.id ? `#${r.id}` : ""))
            .join(", ")}`
        : "CB risk: none flagged",
    ].join("\n");
  }

  let lastMetrics = collectArViewportMetrics(shell, { phase: "debug-mount" });
  recordArViewportLifecycle(shell, "debug-mount");

  let raf = 0;
  const tick = () => {
    lastMetrics = collectArViewportMetrics(shell, { phase: "live" });
    placeOutline("shell", lastMetrics.shell, outlineColors.shell);
    placeOutline("stage", lastMetrics.stage, outlineColors.stage);
    placeOutline("container", lastMetrics.container, outlineColors.container);
    placeOutline("video", lastMetrics.video, outlineColors.video);
    placeOutline("canvas", lastMetrics.canvas, outlineColors.canvas);

    const docW = lastMetrics.documentElement.clientWidth;
    placeMarker("x0", 0, "#ffffff");
    placeMarker("xViewport", docW - 1, "#ffffff");
    placeMarker("shellRight", lastMetrics.shell?.rect?.right, outlineColors.shell);
    placeMarker("stageRight", lastMetrics.stage?.rect?.right, outlineColors.stage);
    placeMarker("videoRight", lastMetrics.video?.rect?.right, outlineColors.video);
    placeMarker("canvasRight", lastMetrics.canvas?.rect?.right, outlineColors.canvas);

    hud.textContent = formatMetrics(lastMetrics);
    raf = requestAnimationFrame(tick);
  };

  async function copyDiagnostics() {
    const payload = {
      live: collectArViewportMetrics(shell, { phase: "copy" }),
      lifecycle: window.__arViewportLifecycle || [],
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied ✓";
    } catch {
      // Fallback for older iOS: select a textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        copyBtn.textContent = "Copied ✓";
      } catch {
        copyBtn.textContent = "Copy failed — see console";
        console.info("[ar-viewport-debug]", payload);
      }
      ta.remove();
    }
    window.setTimeout(() => {
      copyBtn.textContent = "Copy viewport diagnostics";
    }, 1600);
  }

  function onCopyClick(event) {
    event.preventDefault();
    event.stopPropagation();
    void copyDiagnostics();
  }
  copyBtn.addEventListener("click", onCopyClick);

  shell.appendChild(overlay);
  raf = requestAnimationFrame(tick);

  function recordPhase(phase, extra) {
    return recordArViewportLifecycle(shell, phase, extra);
  }

  window.__arViewportDebug = {
    metrics: () => collectArViewportMetrics(shell),
    lifecycle: () => window.__arViewportLifecycle || [],
    recordPhase,
    copy: copyDiagnostics,
  };

  return {
    enabled: true,
    recordPhase,
    dispose() {
      cancelAnimationFrame(raf);
      copyBtn.removeEventListener("click", onCopyClick);
      overlay.remove();
      outlines.forEach((el) => el.remove());
      outlines.clear();
      markers.forEach((el) => el.remove());
      markers.clear();
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
