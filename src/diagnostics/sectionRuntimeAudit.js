/**
 * Part 6.3 — Per-section runtime audit of the real production portfolio.
 * Static inventory only — no speculative fixes.
 */

/** @typedef {{
 *   section: string,
 *   files: string,
 *   continuousRuntime: string,
 *   compositorHeavyCss: string,
 *   observers: string,
 *   cleanup: string,
 *   risk: "high" | "medium" | "low" | "none",
 * }} SectionRuntimeRow
 */

/** @type {ReadonlyArray<SectionRuntimeRow>} */
export const PORTFOLIO_SECTION_RUNTIME_AUDIT = Object.freeze([
  {
    section: "hero",
    files: "sections/HeroSection.jsx, TickerStream.jsx",
    continuousRuntime:
      "Shared createTickerScheduler: one rAF owner for all TickerStream tracks; pauses offscreen",
    compositorHeavyCss:
      "ticker-mask mask-image (disabled on iOS stability); backdrop-blur on streams + language chips (softened on iOS)",
    observers: "one shared ResizeObserver + one shared IntersectionObserver for all tickers",
    cleanup: "unsubscribe disconnects observers when last stream unmounts; rAF stops when none visible",
    risk: "medium",
  },
  {
    section: "role-lens",
    files: "RoleLens.jsx, index.css (role-lens-*)",
    continuousRuntime:
      "CSS infinite: role-lens-type-scan, role-lens-reset-pulse; body lens-glow-clock (static on iOS stability)",
    compositorHeavyCss:
      "sticky + backdrop-blur bar (solid fill on iOS); infinite letter scan (disabled on iOS); glow box-shadows via --lens-glow",
    observers: "none in JS",
    cleanup: "CSS stops when nodes detach / prefers-reduced-motion / iOS stability profile",
    risk: "low",
  },
  {
    section: "capabilities",
    files: "sections/CapabilitiesSection.jsx, portfolioUi.jsx",
    continuousRuntime: "none continuous; Framer whileHover only on interaction",
    compositorHeavyCss:
      "SurfaceCard backdrop-blur + multi-layer shadows; icon drop-shadow; lens-glow when Role Lens filters",
    observers: "none",
    cleanup: "n/a",
    risk: "low",
  },
  {
    section: "credentials",
    files: "sections/CredentialsSection.jsx",
    continuousRuntime: "none continuous (horizontal scroll is user-driven)",
    compositorHeavyCss:
      "credentials-rail + attestation-rail overflow; attestation-card backdrop-blur + shadows; mask-image on rail fade (CSS)",
    observers: "none",
    cleanup: "n/a",
    risk: "low",
  },
  {
    section: "experience",
    files: "sections/ExperienceSection.jsx",
    continuousRuntime:
      "Framer whileInView entrance (once); expand/collapse AnimatePresence on click only",
    compositorHeavyCss: "SurfaceCard backdrop-blur/shadows; timeline cyan glows",
    observers:
      "Framer viewport observer equivalent for whileInView (IntersectionObserver internally)",
    cleanup: "Framer unmount; expand state local",
    risk: "low",
  },
  {
    section: "projects",
    files: "sections/ProjectsSection.jsx, ProjectDeck.jsx, CodeiakMascotVideo.jsx",
    continuousRuntime:
      "CSS project-stage-blink infinite on current stage; assistant:activate-project window listener always while mounted",
    compositorHeavyCss:
      "mascot image (full PNG decode); stage blink; card shadows; Framer slide transitions on deck change",
    observers: "none (listener only)",
    cleanup: "removeEventListener on ProjectDeck unmount; mascot is static <img>",
    risk: "medium",
  },
  {
    section: "education",
    files: "sections/EducationSection.jsx, portfolioUi.jsx AcademicFocusInfo",
    continuousRuntime: "none unless tooltip open",
    compositorHeavyCss: "education-rail snap scroll; SurfaceCard blur/shadow",
    observers:
      "AcademicFocusInfo: window resize + scroll (capture) while tooltip open only",
    cleanup: "removeEventListener when tooltip closes/unmount",
    risk: "low",
  },
  {
    section: "risk-radar",
    files: "RiskRadar.jsx, ProfileRadarChart.jsx, index.css (radar-sweep, lens-glow)",
    continuousRuntime:
      "Framer Motion repeat: Infinity dual pulses on active risk-map node; CSS radar-sweep 28s infinite; lens-glow-clock when highlights apply",
    compositorHeavyCss:
      "radar-sweep blur + will-change:transform; large backdrop-blur map panel; multi-layer shadows; SVG/DOM chart",
    observers: "none dedicated (Framer internal)",
    cleanup: "Framer cancels on unmount; CSS stops on detach",
    risk: "high",
  },
]);

export function getPortfolioSectionRuntimeAudit() {
  return PORTFOLIO_SECTION_RUNTIME_AUDIT.map((row) => ({ ...row }));
}
