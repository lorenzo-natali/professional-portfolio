/**
 * Part B — Beyond-era git history suspects for idle homepage WebKit reload.
 * Derived from git history (Beyond introduction → HEAD) and corroborated by
 * the Step 6.2 Beyond-era differential audit.
 *
 * Prefer homepage-reachable global init over camera-session code.
 */

/** @typedef {{
 *   commit: string,
 *   title: string,
 *   files: string,
 *   homepageReachableSideEffect: string,
 *   risk: "high" | "medium" | "low",
 * }} BeyondGitSuspect
 */

/**
 * Beyond / AR first hit the production homepage in 5499715.
 * Parent immediately before: d56119c (portfolio intro sequence).
 * 86e0a2d / e52fdb6 are later content/target commits, not homepage wiring.
 */
export const BEYOND_INTRODUCTION = Object.freeze({
  firstArHomepageCommit: "5499715",
  firstArHomepageTitle: "test: deploy AR CV Lens MVP for mobile validation",
  parentBeforeAr: "d56119c",
  parentBeforeArTitle: "Add a subtle session-once portfolio intro sequence.",
  beyondBrandingRefresh: "09fd1bb",
  beyondDeepLink: "198e966",
  interestGlbGraphGrowth: "153bbdc",
  runtimeFlagLatch: "970f6d1",
});

/** @type {ReadonlyArray<BeyondGitSuspect>} */
export const BEYOND_GIT_SUSPECTS = Object.freeze([
  {
    commit: "5499715",
    title: "deploy AR CV Lens MVP for mobile validation",
    files: "App.jsx, src/components/ar/*, package.json, vite.config.js, index.css",
    homepageReachableSideEffect:
      "First static App→ARGovernanceView→MindARTrackingAdapter graph; AR card always in hero; mind-ar/three deps (packages stay dynamic until camera)",
    risk: "high",
  },
  {
    commit: "153bbdc",
    title: "ship Beyond the CV interest miniatures with web GLBs",
    files: "interest layer, loadInterestGlb, public GLBs, adapter",
    homepageReachableSideEffect:
      "Interest/GLB pipeline modules become statically reachable via adapter; assets not fetched until session",
    risk: "high",
  },
  {
    commit: "970f6d1",
    title: "latch runtime flags, audit build ID, and portal on html",
    files: "main.jsx, arRuntimeFlags.js, arBuildId.js, arViewport.js",
    homepageReachableSideEffect:
      "Always-on publishPortfolioBuildId + captureArRuntimeFlags before React; portal parent=documentElement when open",
    risk: "medium",
  },
  {
    commit: "164db3a",
    title: "isolate AR camera in a portaled full-screen shell",
    files: "ARGovernanceView, arViewport, index.css",
    homepageReachableSideEffect:
      "Portal/visualViewport listeners when open only — weak idle suspect",
    risk: "low",
  },
  {
    commit: "198e966",
    title: "open Beyond the CV from ?beyond=1 deep link",
    files: "beyondCvDeepLink.js, App.jsx",
    homepageReachableSideEffect:
      "Query parse on boot; can auto-open AR only when ?beyond= is present",
    risk: "low",
  },
  {
    commit: "d130bb5",
    title: "drop body fixed lock and auto-start calibrate camera",
    files: "arPageLock.js, calibrate paths, main.jsx (temporary)",
    homepageReachableSideEffect:
      "Body lock / calibrate boot were session-scoped; calibrate boot later removed",
    risk: "low",
  },
  {
    commit: "e41f600",
    title: "stabilize Beyond viewport, rigid anchoring, tracking experiments",
    files: "arViewport.js, index.css, adapter",
    homepageReachableSideEffect: "Viewport CSS/listeners used when portal opens",
    risk: "low",
  },
  {
    commit: "0b30808",
    title: "siteDiag shells and global lifecycle trace",
    files: "main.jsx, diagnostics/*",
    homepageReachableSideEffect:
      "Diagnostics opt-in only; Step 6.2 later splits boots so siteDiag no longer statically imports App",
    risk: "low",
  },
]);

/**
 * Smallest set that could explain idle homepage reload WITHOUT camera active.
 * mind-ar / TF / Three package execution, .mind/.glb fetches, portal locks are
 * NOT top idle suspects (gated on Beyond open / camera start).
 */
export const SMALLEST_IDLE_HOMEPAGE_SUSPECT_SET = Object.freeze([
  {
    id: "static-app-ar-graph",
    commit: "5499715",
    files: "App.jsx → beyondBundle → ARGovernanceView → MindARTrackingAdapter",
    why: "Root cause of AR modules on every normal homepage load even with AR closed",
  },
  {
    id: "interest-glb-pipeline-growth",
    commit: "153bbdc",
    files: "interest layer / loadInterestGlb / adapter static imports",
    why: "Largest eager JS-graph weight growth while assets stay unfetched until session",
  },
  {
    id: "closed-view-resize-hook",
    commit: "5499715+",
    files: "ARGovernanceView.jsx → useIsMobileDevice.js",
    why: "ARGovernanceView mounts when closed and installs window.resize; weak alone, real as App-mount delta vs siteDiag=effects",
  },
  {
    id: "global-main-latch",
    commit: "970f6d1",
    files: "main.jsx arRuntimeFlags + arBuildId (+ arRuntimeVariant GLB path table)",
    why: "Always runs before React; amplifier, not alone",
  },
  {
    id: "real-app-content-runtimes",
    commit: "pre-Beyond + retained",
    files: "App.jsx TickerStream, RiskRadar infinite motion, PortfolioAssistant interval",
    why: "effects shell is stable, so real App content owners remain primary non-AR candidates",
  },
]);

export function getBeyondGitSuspectMatrix() {
  return BEYOND_GIT_SUSPECTS.map((row) => ({ ...row }));
}
