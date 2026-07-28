/**
 * Bounded diagnostic runtime counters for siteDiag section bisection.
 * Opt-in only — wraps globals, never auto-reloads.
 *
 * Exposes window.__portfolioRuntimeCounters
 */

const OWNER_CAP = 48;
const HUD_REFRESH_MS = 1000;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * @param {{ force?: boolean }} [options]
 */
export function installPortfolioRuntimeCounters(options = {}) {
  if (typeof window === "undefined") {
    return { enabled: false, dispose() {}, getSnapshot() { return null; } };
  }
  if (window.__portfolioRuntimeCounters && !options.force) {
    return window.__portfolioRuntimeCounters;
  }

  /** @type {Map<number, { kind: string, started: number }>} */
  const rafOwners = new Map();
  /** @type {Set<object>} */
  const resizeOwners = new Set();
  /** @type {Set<object>} */
  const intersectionOwners = new Set();
  /** @type {Map<ReturnType<typeof setInterval>, { kind: string, started: number }>} */
  const intervalOwners = new Map();
  /** @type {Map<ReturnType<typeof setTimeout>, { kind: string, started: number }>} */
  const timeoutOwners = new Map();

  /** @type {Array<() => void>} */
  const restorers = [];
  let disposed = false;
  let hudEl = null;
  let hudTimer = 0;

  const origRaf = window.requestAnimationFrame.bind(window);
  const origCancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const id = origRaf((t) => {
      rafOwners.delete(id);
      return cb(t);
    });
    if (rafOwners.size < OWNER_CAP) {
      rafOwners.set(id, { kind: "rAF", started: nowMs() });
    }
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    rafOwners.delete(id);
    return origCancel(id);
  };
  restorers.push(() => {
    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCancel;
  });

  if (typeof window.ResizeObserver === "function") {
    const OrigRO = window.ResizeObserver;
    window.ResizeObserver = class PatchedResizeObserver extends OrigRO {
      constructor(callback) {
        super(callback);
        if (resizeOwners.size < OWNER_CAP) resizeOwners.add(this);
      }
      disconnect() {
        resizeOwners.delete(this);
        return super.disconnect();
      }
    };
    restorers.push(() => {
      window.ResizeObserver = OrigRO;
    });
  }

  if (typeof window.IntersectionObserver === "function") {
    const OrigIO = window.IntersectionObserver;
    window.IntersectionObserver = class PatchedIntersectionObserver extends OrigIO {
      constructor(callback, options) {
        super(callback, options);
        if (intersectionOwners.size < OWNER_CAP) intersectionOwners.add(this);
      }
      disconnect() {
        intersectionOwners.delete(this);
        return super.disconnect();
      }
    };
    restorers.push(() => {
      window.IntersectionObserver = OrigIO;
    });
  }

  const origSetInterval = window.setInterval.bind(window);
  const origClearInterval = window.clearInterval.bind(window);
  window.setInterval = (handler, timeout, ...args) => {
    const id = origSetInterval(handler, timeout, ...args);
    if (intervalOwners.size < OWNER_CAP) {
      intervalOwners.set(id, { kind: "interval", started: nowMs() });
    }
    return id;
  };
  window.clearInterval = (id) => {
    intervalOwners.delete(id);
    return origClearInterval(id);
  };
  restorers.push(() => {
    window.setInterval = origSetInterval;
    window.clearInterval = origClearInterval;
  });

  const origSetTimeout = window.setTimeout.bind(window);
  const origClearTimeout = window.clearTimeout.bind(window);
  window.setTimeout = (handler, timeout, ...args) => {
    const id = origSetTimeout((...cbArgs) => {
      timeoutOwners.delete(id);
      if (typeof handler === "function") return handler(...cbArgs);
      return undefined;
    }, timeout, ...args);
    if (timeoutOwners.size < OWNER_CAP) {
      timeoutOwners.set(id, { kind: "timeout", started: nowMs() });
    }
    return id;
  };
  window.clearTimeout = (id) => {
    timeoutOwners.delete(id);
    return origClearTimeout(id);
  };
  restorers.push(() => {
    window.setTimeout = origSetTimeout;
    window.clearTimeout = origClearTimeout;
  });

  function getSnapshot() {
    const sectionNodes =
      typeof document !== "undefined"
        ? document.querySelectorAll("[data-portfolio-section]").length
        : 0;
    const domNodes =
      typeof document !== "undefined"
        ? document.getElementsByTagName("*").length
        : 0;
    const ticker =
      typeof window !== "undefined" && window.__portfolioTickerScheduler?.getDiagnostics
        ? window.__portfolioTickerScheduler.getDiagnostics()
        : null;
    return {
      enabled: true,
      liveRaf: rafOwners.size,
      liveResizeObservers: resizeOwners.size,
      liveIntersectionObservers: intersectionOwners.size,
      liveIntervals: intervalOwners.size,
      liveTimeouts: timeoutOwners.size,
      mountedSections: sectionNodes,
      domNodes,
      tickerScheduler: ticker,
      caps: { owners: OWNER_CAP },
    };
  }

  function renderHud() {
    if (!hudEl || disposed) return;
    const s = getSnapshot();
    const t = s.tickerScheduler;
    hudEl.textContent = [
      "runtime counters",
      `rAF=${s.liveRaf}  RO=${s.liveResizeObservers}  IO=${s.liveIntersectionObservers}`,
      `interval=${s.liveIntervals}  timeout=${s.liveTimeouts}`,
      t
        ? `tickerSched=${t.activeSchedulerCount}  subs=${t.subscriberCount}  vis=${t.visibleCount}`
        : "tickerSched=n/a",
      `sections=${s.mountedSections}  dom=${s.domNodes}`,
    ].join("\n");
  }

  function mountHud() {
    if (typeof document === "undefined") return;
    hudEl = document.createElement("pre");
    hudEl.setAttribute("data-portfolio-runtime-counters", "1");
    hudEl.style.cssText = [
      "position:fixed",
      "bottom:8px",
      "left:8px",
      "z-index:2147483000",
      "margin:0",
      "padding:8px 10px",
      "max-width:min(92vw,320px)",
      "border-radius:10px",
      "border:1px solid rgba(148,163,184,0.45)",
      "background:rgba(15,23,42,0.92)",
      "color:#e2e8f0",
      "font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace",
      "white-space:pre-wrap",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(hudEl);
    renderHud();
    hudTimer = origSetInterval(renderHud, HUD_REFRESH_MS);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (hudTimer) origClearInterval(hudTimer);
    hudEl?.remove?.();
    hudEl = null;
    restorers.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
    rafOwners.clear();
    resizeOwners.clear();
    intersectionOwners.clear();
    intervalOwners.clear();
    timeoutOwners.clear();
    if (window.__portfolioRuntimeCounters === api) {
      delete window.__portfolioRuntimeCounters;
    }
  }

  mountHud();

  const api = {
    enabled: true,
    getSnapshot,
    dispose,
  };
  window.__portfolioRuntimeCounters = api;
  return api;
}

export function getPortfolioRuntimeCounters() {
  if (typeof window === "undefined") return null;
  return window.__portfolioRuntimeCounters || null;
}
