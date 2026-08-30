/**
 * Part B — Global portfolio runtime-owner audit (homepage / production App).
 * Static inventory only — no speculative fixes.
 *
 * Columns:
 *   subsystem | mountedOnHomepage | loopListenerObserver | cleanup | suspectedRisk
 */

/** @typedef {{
 *   subsystem: string,
 *   mountedOnHomepage: boolean | "opt-in" | "on-demand",
 *   loopListenerObserver: string,
 *   cleanup: string,
 *   suspectedRisk: "high" | "medium" | "low" | "none",
 *   owner: string,
 *   notes?: string,
 * }} RuntimeOwnerRow
 */

/** @type {ReadonlyArray<RuntimeOwnerRow>} */
export const PORTFOLIO_RUNTIME_OWNERS = Object.freeze([
  {
    subsystem: "React root + StrictMode",
    mountedOnHomepage: true,
    loopListenerObserver: "single createRoot; StrictMode double-invoke in dev",
    cleanup: "n/a (document lifetime)",
    suspectedRisk: "low",
    owner: "src/main.jsx",
    notes: "Prove one root via lifecycle reactRootMountCount===1 per boot",
  },
  {
    subsystem: "TickerStream rAF + ResizeObserver",
    mountedOnHomepage: true,
    loopListenerObserver: "requestAnimationFrame loop per stream; ResizeObserver on track",
    cleanup: "cancelAnimationFrame + resizeObserver.disconnect on unmount",
    suspectedRisk: "high",
    owner: "src/App.jsx TickerStream",
    notes: "Continuous GPU/compositor work while homepage idle",
  },
  {
    subsystem: "PortfolioAssistant preview interval",
    mountedOnHomepage: true,
    loopListenerObserver:
      "IntersectionObserver + setInterval 3600ms only while Hero preview visible (and tab visible)",
    cleanup: "clearInterval + observer.disconnect + visibilitychange remove on unmount",
    suspectedRisk: "low",
    owner: "src/App.jsx PortfolioAssistant",
    notes: "No preview timer while off-screen or document.hidden; modal/drawer unchanged",
  },
  {
    subsystem: "ProjectDeck assistant listener",
    mountedOnHomepage: true,
    loopListenerObserver: "window assistant:activate-project",
    cleanup: "removeEventListener on unmount",
    suspectedRisk: "low",
    owner: "src/App.jsx ProjectDeck",
  },
  {
    subsystem: "AcademicFocusInfo reposition",
    mountedOnHomepage: "on-demand",
    loopListenerObserver: "resize + scroll (capture) while tooltip open",
    cleanup: "removeEventListener when closed/unmount",
    suspectedRisk: "low",
    owner: "src/App.jsx AcademicFocusInfo",
  },
  {
    subsystem: "Framer Motion infinite radar pulses",
    mountedOnHomepage: true,
    loopListenerObserver: "motion.span repeat: Infinity (active risk-map node)",
    cleanup: "Framer unmount cancels animation",
    suspectedRisk: "medium",
    owner: "src/App.jsx RiskRadar",
  },
  {
    subsystem: "Framer Motion finite transitions",
    mountedOnHomepage: true,
    loopListenerObserver: "AnimatePresence / motion enter-exit",
    cleanup: "Framer unmount",
    suspectedRisk: "low",
    owner: "src/App.jsx (deck, radar, intro)",
  },
  {
    subsystem: "CSS infinite animations (lens glow, radar sweep, stage blink)",
    mountedOnHomepage: true,
    loopListenerObserver: "CSS @keyframes infinite on role-lens / radar / stage",
    cleanup: "DOM detach / prefers-reduced-motion overrides",
    suspectedRisk: "medium",
    owner: "src/index.css",
    notes: "Compositor work without JS ownership",
  },
  {
    subsystem: "PortfolioIntro timeouts",
    mountedOnHomepage: "on-demand",
    loopListenerObserver: "setTimeout chain (~3.8s) then dismiss",
    cleanup: "clearTimeout on unmount",
    suspectedRisk: "low",
    owner: "src/App.jsx PortfolioIntro",
  },
  {
    subsystem: "Beyond the CV / AR stack",
    mountedOnHomepage: "on-demand",
    loopListenerObserver: "MindAR worker, setAnimationLoop, camera, rAF layers",
    cleanup: "adapter stop + portal teardown (existing patches)",
    suspectedRisk: "high",
    owner: "src/components/ar/*",
    notes: "NOT required to reproduce idle Safari reset (Step 6 finding)",
  },
  {
    subsystem: "AR viewport resize listeners",
    mountedOnHomepage: "on-demand",
    loopListenerObserver: "resize, orientationchange, visualViewport resize/scroll",
    cleanup: "unbindArViewportListeners",
    suspectedRisk: "medium",
    owner: "src/components/ar/arViewport.js",
  },
  {
    subsystem: "useIsMobileDevice resize",
    mountedOnHomepage: "on-demand",
    loopListenerObserver: "window resize while AR governance mounted",
    cleanup: "removeEventListener",
    suspectedRisk: "low",
    owner: "src/components/ar/useIsMobileDevice.js",
  },
  {
    subsystem: "Canvas / WebGL / WebGPU (homepage)",
    mountedOnHomepage: false,
    loopListenerObserver: "none on idle homepage",
    cleanup: "n/a",
    suspectedRisk: "none",
    owner: "—",
    notes: "WebGL only under AR / arDiag; Journey timeline is plain DOM/CSS + finite Framer year enter/exit",
  },
  {
    subsystem: "Autoplay video/audio (homepage)",
    mountedOnHomepage: false,
    loopListenerObserver: "none",
    cleanup: "n/a",
    suspectedRisk: "none",
    owner: "CodeiakMascotVideo uses static img",
  },
  {
    subsystem: "Service worker forced reload",
    mountedOnHomepage: false,
    loopListenerObserver: "none registered in this repo",
    cleanup: "n/a",
    suspectedRisk: "none",
    owner: "—",
    notes: "No SW source; lifecycle still listens for controllerchange if present",
  },
  {
    subsystem: "Top-level ErrorBoundary → homepage redirect",
    mountedOnHomepage: false,
    loopListenerObserver: "none in production App",
    cleanup: "n/a",
    suspectedRisk: "none",
    owner: "ARTrackingErrorBoundary only (AR subtree)",
    notes: "No silent homepage redirect found; siteDiag adds recording boundary",
  },
  {
    subsystem: "Portfolio Assistant local-model init",
    mountedOnHomepage: false,
    loopListenerObserver: "prompt UI only (no TF/local model bootstrap on homepage)",
    cleanup: "n/a",
    suspectedRisk: "none",
    owner: "src/App.jsx PortfolioAssistant",
  },
  {
    subsystem: "Unbounded arrays / histories",
    mountedOnHomepage: false,
    loopListenerObserver: "AR audit/exit/rotate traces are opt-in + bounded",
    cleanup: "fixed caps",
    suspectedRisk: "low",
    owner: "diagnostics + ar audit modules",
  },
  {
    subsystem: "Preloaded GLTF/textures on homepage",
    mountedOnHomepage: false,
    loopListenerObserver: "none until AR opens",
    cleanup: "AR dispose path",
    suspectedRisk: "none",
    owner: "src/components/ar/*",
  },
]);

/**
 * Compact matrix for HUD / reports.
 * @returns {ReadonlyArray<{
 *   subsystem: string,
 *   mountedOnHomepage: string,
 *   loopListenerObserver: string,
 *   cleanup: string,
 *   suspectedRisk: string,
 * }>}
 */
export function getPortfolioRuntimeOwnerMatrix() {
  return PORTFOLIO_RUNTIME_OWNERS.map((row) => ({
    subsystem: row.subsystem,
    mountedOnHomepage: String(row.mountedOnHomepage),
    loopListenerObserver: row.loopListenerObserver,
    cleanup: row.cleanup,
    suspectedRisk: row.suspectedRisk,
  }));
}
