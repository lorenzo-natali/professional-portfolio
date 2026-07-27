/**
 * Bounded crash-isolation diagnostics: counters + compact HUD.
 * Never retains an unbounded event history.
 */

import {
  AR_CRASH_DIAG_PARAM,
  arCrashDiagSnapshotLabel,
  getArCrashDiagCapabilities,
} from "./arCrashDiag";

const MAX_EVENT_NOTES = 24;
const HUD_REFRESH_MS = 500;

/**
 * @param {import("./arCrashDiag").ArCrashDiagMode} mode
 */
export function createArCrashDiagMonitor(mode) {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const caps = getArCrashDiagCapabilities(mode);

  const counters = {
    renderFrames: 0,
    videoFrames: 0,
    loadInput: 0,
    detect: 0,
    track: 0,
    workerRequests: 0,
    workerPending: 0,
    workerPendingPeak: 0,
  };

  /** @type {Array<{ t: number, kind: string, detail?: string }>} */
  const notes = [];
  let frozen = false;
  let disposed = false;
  let pageHidden = typeof document !== "undefined" ? Boolean(document.hidden) : false;

  /** @type {ReturnType<typeof setInterval> | 0} */
  let hudTimer = 0;
  /** @type {HTMLElement | null} */
  let host = null;
  /** @type {HTMLPreElement | null} */
  let pre = null;
  /** @type {(() => void) | null} */
  let unbind = null;

  /** @type {{ textures: number | null, geometries: number | null, programs: number | null }} */
  let rendererMemory = { textures: null, geometries: null, programs: null };
  /** @type {Record<string, number> | null} */
  let tfMemory = null;

  function elapsedSec() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    return Math.max(0, (now - startedAt) / 1000);
  }

  function note(kind, detail) {
    if (disposed) return;
    notes.push({
      t: Math.round(elapsedSec() * 10) / 10,
      kind: String(kind).slice(0, 48),
      detail: detail != null ? String(detail).slice(0, 120) : undefined,
    });
    if (notes.length > MAX_EVENT_NOTES) notes.splice(0, notes.length - MAX_EVENT_NOTES);
    console.info("[ar-crash-diag]", kind, detail ?? "");
  }

  function bump(key, by = 1) {
    if (disposed || !(key in counters)) return;
    counters[key] += by;
    if (key === "workerPending") {
      counters.workerPendingPeak = Math.max(
        counters.workerPendingPeak,
        counters.workerPending,
      );
    }
  }

  function setWorkerPending(n) {
    if (disposed) return;
    counters.workerPending = Math.max(0, n);
    counters.workerPendingPeak = Math.max(
      counters.workerPendingPeak,
      counters.workerPending,
    );
  }

  function sampleRenderer(renderer) {
    try {
      const info = renderer?.info;
      rendererMemory = {
        textures: info?.memory?.textures ?? null,
        geometries: info?.memory?.geometries ?? null,
        programs: Array.isArray(info?.programs) ? info.programs.length : null,
      };
    } catch {
      // ignore
    }
  }

  function sampleTfMemory() {
    try {
      const tf = typeof window !== "undefined" ? window.__MINDAR_TF__ : null;
      const mem = tf?.memory?.() ?? null;
      if (mem && typeof mem === "object") {
        tfMemory = {
          numTensors: Number(mem.numTensors) || 0,
          numDataBuffers: Number(mem.numDataBuffers) || 0,
          numBytes: Number(mem.numBytes) || 0,
          unreliable: mem.unreliable ? 1 : 0,
        };
      }
    } catch {
      tfMemory = null;
    }
  }

  function buildSummary() {
    sampleTfMemory();
    return {
      mode,
      label: arCrashDiagSnapshotLabel(mode),
      capabilities: caps,
      elapsedSec: Math.round(elapsedSec() * 10) / 10,
      frozen,
      pageHidden,
      counters: { ...counters },
      rendererMemory: { ...rendererMemory },
      tfMemory: tfMemory ? { ...tfMemory } : null,
      notes: notes.slice(),
      href: typeof location !== "undefined" ? location.href : "",
      capturedAt: Date.now(),
    };
  }

  function renderHud() {
    if (!pre || disposed) return;
    const s = buildSummary();
    pre.textContent = [
      `arDiag=${s.mode}  t=${s.elapsedSec}s${s.frozen ? "  FROZEN" : ""}`,
      `cam=${caps.camera ? 1 : 0} mind=${caps.mindAr ? 1 : 0} render=${caps.threeRender ? 1 : 0}`,
      `renderF=${s.counters.renderFrames} videoF=${s.counters.videoFrames}`,
      `load=${s.counters.loadInput} detect=${s.counters.detect} track=${s.counters.track}`,
      `workerReq=${s.counters.workerRequests} pend=${s.counters.workerPending}/${s.counters.workerPendingPeak}`,
      `tex=${s.rendererMemory.textures ?? "—"} geo=${s.rendererMemory.geometries ?? "—"} prog=${s.rendererMemory.programs ?? "—"}`,
      s.tfMemory
        ? `tf T=${s.tfMemory.numTensors} B=${s.tfMemory.numBytes}`
        : "tf —",
      `hidden=${s.pageHidden ? 1 : 0} notes=${s.notes.length}`,
      s.notes.length
        ? `last=${s.notes[s.notes.length - 1].kind}`
        : "last=—",
    ].join("\n");
  }

  async function copySummary() {
    const text = JSON.stringify(buildSummary(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      note("copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        note("copied");
      } catch {
        note("copy-failed");
        console.info("[ar-crash-diag] summary", text);
      }
    }
  }

  function mountHud(shell) {
    if (disposed || typeof document === "undefined" || host) return;
    const parent =
      shell instanceof HTMLElement
        ? shell
        : document.querySelector("[data-ar-viewport-shell='true']") ||
          document.documentElement;

    host = document.createElement("div");
    host.dataset.arCrashDiag = mode;
    host.style.cssText = [
      "position:absolute",
      "left:6px",
      "top:6px",
      "z-index:2147483642",
      "pointer-events:none",
      "max-width:min(96vw,22rem)",
      "font:11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
      "color:#e2e8f0",
    ].join(";");

    pre = document.createElement("pre");
    pre.style.cssText = [
      "margin:0",
      "padding:8px 10px",
      "background:rgba(2,6,23,0.88)",
      "border:1px solid rgba(148,163,184,0.45)",
      "border-radius:8px",
      "white-space:pre-wrap",
      "pointer-events:none",
    ].join(";");
    host.appendChild(pre);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Copy arDiag";
    btn.style.cssText = [
      "pointer-events:auto",
      "margin-top:6px",
      "padding:7px 10px",
      "border-radius:8px",
      "border:1px solid rgba(148,163,184,0.5)",
      "background:rgba(15,23,42,0.92)",
      "color:#f8fafc",
      "font:12px/1.2 ui-sans-serif, system-ui, sans-serif",
    ].join(";");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void copySummary();
    });
    host.appendChild(btn);

    parent.appendChild(host);
    renderHud();
    hudTimer = window.setInterval(renderHud, HUD_REFRESH_MS);
  }

  function bindGlobalListeners() {
    if (typeof window === "undefined" || unbind) return;

    const onVisibility = () => {
      pageHidden = Boolean(document.hidden);
      note("visibilitychange", pageHidden ? "hidden" : "visible");
    };
    const onPageHide = () => note("pagehide");
    const onError = (ev) => {
      note("windowError", ev?.message || String(ev?.error || "error"));
    };
    const onRejection = (ev) => {
      const reason = ev?.reason;
      note(
        "unhandledrejection",
        reason instanceof Error ? reason.message : String(reason ?? "reject"),
      );
    };
    const onContextLost = () => note("webglContextLost");
    const onContextRestored = () => note("webglContextRestored");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("webglcontextlost", onContextLost, true);
    window.addEventListener("webglcontextrestored", onContextRestored, true);

    unbind = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("webglcontextlost", onContextLost, true);
      window.removeEventListener("webglcontextrestored", onContextRestored, true);
    };
  }

  /**
   * Wrap MindAR controller hot paths with counters (idempotent per controller).
   * @param {any} controller
   */
  function instrumentController(controller) {
    if (!controller || controller.__arCrashDiagInstrumented) return;
    controller.__arCrashDiagInstrumented = true;

    if (controller.inputLoader?.loadInput) {
      const orig = controller.inputLoader.loadInput.bind(controller.inputLoader);
      controller.inputLoader.loadInput = (...args) => {
        bump("loadInput");
        return orig(...args);
      };
    }

    if (typeof controller._detectAndMatch === "function") {
      const orig = controller._detectAndMatch.bind(controller);
      controller._detectAndMatch = async (...args) => {
        bump("detect");
        return orig(...args);
      };
    }

    if (typeof controller._trackAndUpdate === "function") {
      const orig = controller._trackAndUpdate.bind(controller);
      controller._trackAndUpdate = async (...args) => {
        bump("track");
        return orig(...args);
      };
    }

    const worker = controller.worker;
    if (worker?.postMessage) {
      const origPost = worker.postMessage.bind(worker);
      worker.postMessage = (msg, ...rest) => {
        const type = msg?.type;
        if (type === "match" || type === "trackUpdate") {
          bump("workerRequests");
          bump("workerPending", 1);
        }
        try {
          return origPost(msg, ...rest);
        } catch (err) {
          note("workerPostError", err instanceof Error ? err.message : String(err));
          throw err;
        }
      };
      const prevOnMessage = worker.onmessage;
      worker.onmessage = (e) => {
        const type = e?.data?.type;
        if (type === "matchDone" || type === "trackUpdateDone") {
          bump("workerPending", -1);
          if (counters.workerPending < 0) counters.workerPending = 0;
        }
        if (typeof prevOnMessage === "function") prevOnMessage.call(worker, e);
      };
      worker.addEventListener?.("error", (ev) => {
        note("workerError", ev?.message || "worker error");
      });
    }

    // Expose TF memory sampling hook if MindAR left a global; best-effort only.
    try {
      if (typeof window !== "undefined" && !window.__MINDAR_TF__) {
        // MindAR bundles TF internally; sampling stays null unless hooked later.
      }
    } catch {
      // ignore
    }
  }

  /**
   * Count decoded video frames when the platform supports it.
   * @param {HTMLVideoElement | null | undefined} video
   */
  function bindVideoFrameCounter(video) {
    if (!video || typeof video.requestVideoFrameCallback !== "function") return () => {};
    let handle = 0;
    let alive = true;
    const tick = () => {
      if (!alive || disposed) return;
      bump("videoFrames");
      handle = video.requestVideoFrameCallback(tick);
    };
    handle = video.requestVideoFrameCallback(tick);
    return () => {
      alive = false;
      try {
        video.cancelVideoFrameCallback?.(handle);
      } catch {
        // ignore
      }
    };
  }

  function markFrozen() {
    if (frozen) return;
    frozen = true;
    note("frozenTracking");
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    note("dispose");
    try {
      unbind?.();
    } catch {
      // ignore
    }
    unbind = null;
    if (hudTimer) {
      clearInterval(hudTimer);
      hudTimer = 0;
    }
    try {
      host?.remove?.();
    } catch {
      // ignore
    }
    host = null;
    pre = null;
    if (typeof window !== "undefined" && window.__arCrashDiag === api) {
      delete window.__arCrashDiag;
    }
  }

  const api = {
    mode,
    capabilities: caps,
    param: AR_CRASH_DIAG_PARAM,
    bump,
    note,
    setWorkerPending,
    sampleRenderer,
    instrumentController,
    bindVideoFrameCounter,
    markFrozen,
    isFrozen: () => frozen,
    mountHud,
    bindGlobalListeners,
    buildSummary,
    copySummary,
    dispose,
    getCounters: () => ({ ...counters }),
  };

  if (typeof window !== "undefined") {
    window.__arCrashDiag = api;
  }

  bindGlobalListeners();
  note("start", mode);

  return api;
}
