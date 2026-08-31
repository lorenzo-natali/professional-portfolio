import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";
import InternationalMobility, {
  InternationalMobilitySummary,
} from "./InternationalMobility.jsx";
import { journeyMilestones, formatJourneyPeriod } from "./journeyData.js";
import JourneyTimeline from "./JourneyTimeline.jsx";
import { radarDomains, sectionAnchors } from "./portfolioData.js";
import { getRadarTone } from "./portfolioLens.js";
import { SurfaceCard } from "./portfolioUi.jsx";
import { PORTFOLIO_SECTION_TITLES } from "./sectionCatalog.js";
import {
  getRadarSweepPeriodMs,
  shouldReduceRadarSweepCadence,
  startCappedRadarSweep,
} from "./radarSweepCadence.js";

const SNAPSHOT_TABS = Object.freeze([
  ["journey", "Career Timeline"],
  ["risk-map", "Risk Exposure"],
  ["mobility", "International Mobility"],
]);

/** Initial Professional Overview tab — Career Timeline (path → exposure → mobility). */
const DEFAULT_SNAPSHOT_TAB = "journey";

const journeyPanelTone = {
  dot: "bg-cyan-300",
};

export default function RiskRadar({ selectedLens: _selectedLens = "Overview" }) {
  const [activeDomain, setActiveDomain] = useState(0);
  const [mapView, setMapView] = useState(DEFAULT_SNAPSHOT_TAB);
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);
  const sweepRef = useRef(null);
  const selectedDomain = radarDomains[activeDomain];
  const selectedTone = getRadarTone(selectedDomain.maturity);
  const selectedMilestone =
    journeyMilestones[activeJourneyIndex] ?? journeyMilestones[0];

  // Step 4: mobile/iOS only — cap sweep compositor updates to ~30 FPS via one rAF loop.
  // Desktop keeps CSS @keyframes unchanged (effect no-ops when shouldReduce is false).
  // Non-risk tabs unmount the sweep node and skip this effect entirely.
  useEffect(() => {
    if (mapView !== "risk-map") return undefined;
    const element = sweepRef.current;
    if (!element || !shouldReduceRadarSweepCadence()) return undefined;
    return startCappedRadarSweep(element, { periodMs: getRadarSweepPeriodMs() });
  }, [mapView]);

  return (
    <section id="risk-radar" className="border-t border-slate-800/70 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight !text-slate-50 sm:text-3xl">
            {PORTFOLIO_SECTION_TITLES["risk-radar"]}
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            An interactive view of my professional path, risk exposure and international career outlook.
          </p>
        </div>

        <div className="grid gap-6 lg:min-h-[616px] lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 p-4 shadow-xl shadow-slate-950/25 backdrop-blur sm:p-6 lg:flex lg:h-full lg:flex-col">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
              <div className="inline-flex max-w-full flex-wrap rounded-lg border border-slate-800 bg-slate-950/45 p-1">
                {SNAPSHOT_TABS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mapView === value}
                    onClick={() => setMapView(value)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                      mapView === value
                        ? "bg-cyan-300/12 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Fills remaining left-panel height at lg so only journey content can be centered. */}
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <AnimatePresence mode="wait">
              {mapView === "risk-map" ? (
                <motion.div
                  key="risk-map"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="radar-plane relative mx-auto aspect-square w-full max-w-[500px] overflow-hidden rounded-full border border-slate-800/80 bg-slate-950/45"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_18%),radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_42%)]" />
                  <div ref={sweepRef} className="radar-sweep" />
                  <div className="absolute inset-[14%] rounded-full border border-slate-700/35" />
                  <div className="absolute inset-[26%] rounded-full border border-slate-800/75" />
                  <div className="absolute inset-[38%] rounded-full border border-slate-800/60" />
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    {radarDomains.map((domain) => {
                      // Extend each spoke past its node so it crosses the
                      // outermost ring (the dish edge at radius 50) instead of
                      // stopping at the node ring.
                      const dx = domain.x - 50;
                      const dy = domain.y - 50;
                      const dist = Math.hypot(dx, dy) || 1;
                      const factor = 49 / dist;
                      return (
                        <line
                          key={domain.title}
                          x1="50"
                          y1="50"
                          x2={50 + dx * factor}
                          y2={50 + dy * factor}
                          stroke="rgba(148, 163, 184, 0.12)"
                          strokeWidth="0.25"
                        />
                      );
                    })}
                  </svg>

                  <div
                    className="absolute inset-[38%] z-10 flex items-center justify-center rounded-full border border-cyan-300/35 bg-slate-950/90 text-slate-100 shadow-[0_0_34px_rgba(34,211,238,0.18)]"
                    role="img"
                    aria-label="My Profile"
                  >
                    <User
                      className="h-[46%] w-[46%] text-slate-100"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>

                  {radarDomains.map((domain, index) => {
                    const isActive = index === activeDomain;
                    const tone = getRadarTone(domain.maturity);
                    return (
                      <button
                        key={domain.title}
                        type="button"
                        data-role-lens-id={domain.id}
                        aria-pressed={isActive}
                        onClick={() => setActiveDomain(index)}
                        className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center opacity-100 transition-opacity"
                        style={{ left: `${domain.x}%`, top: `${domain.y}%` }}
                      >
                        <span
                          className={`relative flex h-4 w-4 items-center justify-center rounded-full border transition ${
                            isActive
                              ? tone.activeDot
                              : "border-slate-500 bg-slate-800 group-hover:border-cyan-300/60"
                          }`}
                        >
                          {isActive && (
                            <>
                              <motion.span
                                className={`absolute inset-[-10px] rounded-full border ${tone.pulsePrimary}`}
                                initial={{ scale: 0.45, opacity: 0 }}
                                animate={{ scale: [0.45, 1.7], opacity: [0, 0.65, 0] }}
                                transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
                              />
                              <motion.span
                                className={`absolute inset-[-14px] rounded-full border ${tone.pulseSecondary}`}
                                initial={{ scale: 0.45, opacity: 0 }}
                                animate={{ scale: [0.45, 1.95], opacity: [0, 0.38, 0] }}
                                transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
                              />
                            </>
                          )}
                        </span>
                        <span
                          className={`max-w-[92px] text-[10px] font-medium leading-4 transition [text-shadow:0_1px_8px_rgba(2,6,23,0.92)] sm:max-w-[130px] sm:text-xs ${
                            isActive
                              ? "text-slate-50"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        >
                          {domain.title}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              ) : mapView === "journey" ? (
                <motion.div
                  key="journey"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="lg:flex lg:flex-1 lg:flex-col lg:justify-center"
                >
                  <JourneyTimeline
                    milestones={journeyMilestones}
                    activeIndex={activeJourneyIndex}
                    onSelect={setActiveJourneyIndex}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="mobility"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <InternationalMobility />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          <SurfaceCard
            className={`p-5 sm:p-6 ${
              mapView === "risk-map" ? "min-h-[380px]" : "min-h-0 sm:min-h-[380px]"
            }`}
          >
            <AnimatePresence mode="wait">
              {mapView === "risk-map" ? (
                <motion.div
                  key={`domain-${selectedDomain.title}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="border-b border-slate-800 pb-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${selectedTone.badge}`}>
                      {selectedDomain.maturity}
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-50">{selectedDomain.title}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-400">{selectedDomain.category}</p>
                    <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">{selectedDomain.explanation}</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Focus Areas</p>
                    <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                      {selectedDomain.signals.map((signal) => (
                        <li key={signal} className="flex gap-3">
                          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${selectedTone.dot}`} />
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <p className="text-sm text-slate-400">Related portfolio sections:</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {selectedDomain.sections.map((section, index) => (
                        <span key={section} className="inline-flex items-center gap-2">
                          <a href={sectionAnchors[section]} className={`font-medium transition ${selectedTone.link}`}>
                            {section}
                          </a>
                          {index < selectedDomain.sections.length - 1 && <span className="text-slate-600">·</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : mapView === "journey" ? (
                <motion.div
                  key={`journey-${selectedMilestone.id}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {selectedMilestone.narrativeHeading ? (
                    <div className="flex flex-col gap-5">
                      <h3 className="text-2xl font-semibold text-slate-50">
                        {selectedMilestone.narrativeHeading}
                      </h3>
                      {selectedMilestone.narrativeBody ||
                      selectedMilestone.narrativeContext ||
                      selectedMilestone.narrativeDetail ? (
                        <div>
                          {selectedMilestone.narrativeBody ? (
                            <p className="text-sm leading-6 text-slate-300 sm:text-base">
                              {selectedMilestone.narrativeBody}
                            </p>
                          ) : null}
                          {selectedMilestone.narrativeContext ? (
                            <p className="mt-4 text-xs leading-5 text-slate-500 sm:text-sm">
                              {selectedMilestone.narrativeContext}
                            </p>
                          ) : null}
                          {selectedMilestone.narrativeDetail ? (
                            <p className="mt-2 text-[11px] leading-5 text-slate-600 sm:text-xs">
                              {selectedMilestone.narrativeDetail}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-50">
                          {selectedMilestone.title}
                        </h3>
                        {selectedMilestone.subtitle ? (
                          <p className="mt-2 text-sm font-medium text-slate-300">
                            {selectedMilestone.subtitle}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm font-medium text-slate-400">
                          {formatJourneyPeriod(selectedMilestone)}
                        </p>
                        {selectedMilestone.explanation ? (
                          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
                            {selectedMilestone.explanation}
                          </p>
                        ) : null}
                      </div>

                      {selectedMilestone.highlights?.length ? (
                        <div className="mt-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Highlights</p>
                          <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                            {selectedMilestone.highlights.map((item) => (
                              <li key={item} className="flex gap-3">
                                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${journeyPanelTone.dot}`} />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="mobility-summary"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <InternationalMobilitySummary />
                </motion.div>
              )}
            </AnimatePresence>
          </SurfaceCard>
        </div>

        <div className="mt-14 border-t border-slate-800 pt-7 text-sm leading-6 text-slate-500">
          <p className="font-medium text-slate-400">Privacy & Technology</p>
          <p className="mt-2">
            Built with React and Vite. First-party analytics are designed with privacy and data minimisation principles to understand aggregate usage and improve the experience. No raw IP addresses, full user-agent strings, cookies or fingerprinting data are stored.
          </p>
          <p className="mt-1">
            Frontend: GitHub Pages · Analytics: Cloudflare Workers + D1
          </p>
        </div>
      </div>
    </section>
  );
}
