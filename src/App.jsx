import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DEFAULT_APP_FEATURES,
  resolveAppFeatures,
} from "./diagnostics/appFeatures.js";
import PortfolioCore from "./portfolio/PortfolioCore.jsx";
import PortfolioSectionNavigator from "./portfolio/PortfolioSectionNavigator.jsx";
import { useActiveMacroSection } from "./portfolio/useActiveMacroSection.js";
import {
  assistantCategories,
  assistantPrompts,
  publicAsset,
  signalMap,
} from "./portfolio/portfolioData.js";
import { PORTFOLIO_SECTION_IDS } from "./portfolio/sectionCatalog.js";
import { useLensGlowActiveMarker } from "./portfolio/useLensGlowActiveMarker.js";
import "./index.css";

/**
 * @typedef {{
 *   ARGovernanceCard?: import("react").ComponentType<{ onLaunch: () => void }>,
 *   ARGovernanceView?: import("react").ComponentType<{ open: boolean, onClose: () => void }>,
 *   shouldLaunchBeyondCvFromLocation?: (loc?: Location | { search?: string, hash?: string, href?: string }) => boolean,
 * }} BeyondModules
 */

function getAssistantSignals(prompt) {
  if (!prompt.signalIds?.length) {
    return [];
  }

  return prompt.signalIds.map((signalId) => {
    const signal = signalMap[signalId];
    if (!signal) {
      return {
        id: signalId,
        label: signalId,
        missing: true,
      };
    }

    return {
      id: signalId,
      ...signal,
    };
  });
}

function getSignalTargetElement(signal) {
  const target = signal.target;
  if (!target) return null;

  if (target.type === "section") {
    return document.getElementById(target.id);
  }

  return document.querySelector(`[data-role-lens-id="${target.id}"]`);
}

function highlightSignalTarget(target) {
  target.classList.add("assistant-signal-target");
  window.setTimeout(() => {
    target.classList.remove("assistant-signal-target");
  }, 1800);
}

function PortfolioAssistant() {
  const [selectedPrompt, setSelectedPrompt] = useState(assistantPrompts[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(assistantPrompts[0].categories[0]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const questionRailRef = useRef(null);
  const previewQuestion = assistantPrompts[previewIndex % assistantPrompts.length].question;

  useEffect(() => {
    const previewTimer = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % assistantPrompts.length);
    }, 3600);

    return () => window.clearInterval(previewTimer);
  }, []);

  const openAssistant = (prompt = assistantPrompts[0]) => {
    setSelectedPrompt(prompt);
    setSelectedCategory(prompt.categories[0]);
    setIsDrawerOpen(true);
  };

  const categoryPrompts = assistantPrompts.filter((prompt) => prompt.categories.includes(selectedCategory));

  const handleAssistantSignalClick = (event, signal) => {
    event.preventDefault();

    const target = signal.target;
    if (signal.missing || !target) {
      console.warn("Missing Portfolio Assistant signal mapping:", signal.id);
      return;
    }

    setIsDrawerOpen(false);

    const scrollToTarget = () => {
      const element = getSignalTargetElement(signal);
      if (!element) return false;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightSignalTarget(element);
      return true;
    };

    // Project cards render one at a time in a carousel: activate the requested
    // project first, then scroll once its card has mounted.
    if (target.type === "project") {
      window.dispatchEvent(
        new CustomEvent("assistant:activate-project", { detail: target.id })
      );
      let attempts = 0;
      const attemptScroll = () => {
        if (scrollToTarget()) return;
        if (attempts++ < 14) {
          window.setTimeout(attemptScroll, 70);
        } else {
          console.warn("Missing Portfolio Assistant signal target:", signal.id);
        }
      };
      window.setTimeout(attemptScroll, 120);
      return;
    }

    window.setTimeout(() => {
      if (!scrollToTarget()) {
        console.warn("Missing Portfolio Assistant signal target:", signal.id);
      }
    }, 160);
  };

  return (
    <>
      <aside className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-5">
        <div className="mb-5 flex items-center gap-4 border-b border-slate-800 pb-5 sm:mb-4 sm:gap-3 sm:pb-4">
          <img
            src={publicAsset("profile.png")}
            alt="Lorenzo Natali"
            className="h-16 w-16 shrink-0 rounded-full border border-cyan-400/30 object-cover sm:h-11 sm:w-11"
          />
          <div>
            <p className="text-base font-semibold text-slate-50 sm:text-sm">Portfolio Assistant</p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-400 sm:text-xs sm:leading-5 sm:text-slate-500">
          Guided answers on my background, projects and professional direction.
        </p>

        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/35 px-4 py-4 sm:mt-4 sm:px-3 sm:py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/75 sm:text-[11px] sm:tracking-[0.22em]">
            Example questions
          </p>
          {/* Fixed height sized for the longest showcase questions — avoids card resize on rotate. */}
          <div className="mt-3 h-[6rem] overflow-hidden sm:mt-2 sm:h-[5rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={previewQuestion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="text-sm leading-6 text-slate-200 sm:text-xs sm:leading-5 sm:text-slate-300"
              >
                {previewQuestion}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAssistant()}
          className="mt-6 w-full rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-4 text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 sm:mt-5 sm:py-3 sm:text-sm"
        >
          Ask the assistant
        </button>
      </aside>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close assistant overlay"
              className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/70">
                <div className="flex items-center justify-between border-b border-slate-800 p-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={publicAsset("profile.png")}
                      alt="Lorenzo Natali"
                      className="h-11 w-11 rounded-full border border-cyan-400/30 object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-50">Portfolio Assistant</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                  <p className="text-xs leading-5 text-slate-500">
                    Guided answers on my background, projects and professional direction.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {assistantCategories.map((category) => {
                      const isActive = category === selectedCategory;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category);
                            const nextPrompt = assistantPrompts.find((prompt) => prompt.categories.includes(category));
                            if (nextPrompt) setSelectedPrompt(nextPrompt);
                            if (questionRailRef.current) questionRailRef.current.scrollLeft = 0;
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-cyan-300/45 bg-cyan-400/10 text-cyan-50"
                              : "border-slate-700 bg-slate-900/45 text-slate-400 hover:border-violet-300/30 hover:text-slate-100"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Question rail</p>
                    <div
                      ref={questionRailRef}
                      className="assistant-question-rail flex gap-2 overflow-x-auto pb-2"
                    >
                      {categoryPrompts.map((prompt) => {
                        const isActive = prompt.question === selectedPrompt.question;
                        return (
                          <button
                            key={prompt.question}
                            type="button"
                            onClick={() => setSelectedPrompt(prompt)}
                            className={`min-w-[13rem] max-w-[16rem] shrink-0 rounded-lg border px-3 py-2.5 text-left text-xs leading-5 transition sm:min-w-[15rem] ${
                              isActive
                                ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                                : "border-slate-800 bg-slate-900/35 text-slate-400 hover:border-violet-300/30 hover:text-slate-100"
                            }`}
                          >
                            {prompt.question}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-900/25 p-5 sm:p-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedPrompt.question}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className=""
                      >
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
                          {selectedPrompt.question}
                        </p>

                        <div className="pt-10">
                          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                            {selectedPrompt.answer}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-800/70 pt-4">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Explore in the portfolio</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-2">
                            {getAssistantSignals(selectedPrompt).map((signal) => (
                              <a
                                key={signal.id}
                                href={signal.href ?? "#"}
                                aria-disabled={signal.missing ? "true" : undefined}
                                onClick={(event) => handleAssistantSignalClick(event, signal)}
                                className={`text-xs font-medium underline underline-offset-4 transition ${
                                  signal.missing
                                    ? "cursor-not-allowed text-slate-600 decoration-slate-700"
                                    : "text-cyan-200/80 decoration-cyan-400/25 hover:text-cyan-100 hover:decoration-cyan-300/60"
                                }`}
                              >
                                {signal.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function PortfolioIntro({ onComplete }) {
  const words = ["Risk", "Controls", "Technology"];
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Per word: ~220ms scan + settle into accent + ~180ms verified hold before next pillar.
    const timers = [
      window.setTimeout(() => setActiveIndex(0), 1200),
      window.setTimeout(() => setActiveIndex(1), 1900),
      window.setTimeout(() => setActiveIndex(2), 2600),
      window.setTimeout(() => setReady(true), 3000),
      window.setTimeout(() => onComplete?.(), 3800),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [onComplete]);

  return (
    <motion.div
      key="portfolio-intro"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2.5 px-6 text-center">
        <div className="relative flex h-5 w-full items-center justify-center">
          <AnimatePresence mode="sync" initial={false}>
            <motion.p
              key={ready ? "ready" : "init"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-x-0 text-sm font-medium tracking-[0.18em] text-slate-200"
            >
              {ready ? "Profile ready." : "Initializing professional profile"}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-center gap-5 text-sm font-medium uppercase tracking-[0.2em] sm:gap-7 sm:text-base">
          {words.map((word, index) => {
            const active = index <= activeIndex;
            const scanning = index === activeIndex;
            return (
              <span key={word} className="relative inline-block">
                <span
                  className={`transition-colors duration-500 ease-out ${
                    active ? "text-cyan-300" : "text-slate-500"
                  }`}
                >
                  {word}
                </span>
                {scanning && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 select-none"
                    style={{
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      backgroundImage:
                        "linear-gradient(90deg, transparent 46%, rgba(224,242,254,0.55) 50%, transparent 54%)",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "250% 100%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                    initial={{ backgroundPosition: "120% 0%" }}
                    animate={{ backgroundPosition: "-20% 0%" }}
                    transition={{ duration: 0.24, ease: [0.33, 0, 0.2, 1] }}
                  >
                    {word}
                  </motion.span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Production portfolio App.
 * Beyond modules are injected by the boot entry so siteDiag subtractive variants
 * can omit AR imports entirely (not merely hide the UI).
 *
 * @param {{
 *   features?: Partial<import("./diagnostics/appFeatures.js").AppFeatures> & {
 *     sections?: string[] | null,
 *   },
 *   beyondModules?: BeyondModules | null,
 *   eagerSectionModules?: Record<string, import("react").ComponentType<any>> | null,
 * }} [props]
 */
function App({
  features: featuresProp,
  beyondModules = null,
  eagerSectionModules = null,
} = {}) {
  const features = resolveAppFeatures(featuresProp ?? DEFAULT_APP_FEATURES);
  const beyondEnabled = Boolean(features.beyond && beyondModules);
  const launchBeyond =
    beyondEnabled &&
    typeof beyondModules.shouldLaunchBeyondCvFromLocation === "function"
      ? () => beyondModules.shouldLaunchBeyondCvFromLocation()
      : () => false;

  const BeyondCard = beyondEnabled ? beyondModules.ARGovernanceCard : null;
  const BeyondView = beyondEnabled ? beyondModules.ARGovernanceView : null;

  /** @type {string[] | null | undefined} */
  const sectionSelection = /** @type {any} */ (features).sections ?? featuresProp?.sections;
  const enabledSections = Array.isArray(sectionSelection)
    ? sectionSelection
    : [...PORTFOLIO_SECTION_IDS];

  const [selectedLens, setSelectedLens] = useState("Overview");
  // Step 6: gate CSS lens-glow-clock to non-Overview Role Lens only.
  useLensGlowActiveMarker(selectedLens);
  const { activeMacroKey, selectMacro } = useActiveMacroSection();
  const [expandedExperiences, setExpandedExperiences] = useState({});
  // QR / shared deep link: ?beyond=1 opens Beyond the CV on first paint.
  const [arOpen, setArOpen] = useState(() => launchBeyond());
  const [showIntro, setShowIntro] = useState(() => {
    if (!features.intro) return false;
    if (typeof window === "undefined") return false;
    // Deep-link launches skip the portfolio splash so AR is not covered.
    if (launchBeyond()) return false;
    try {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
      if (window.sessionStorage.getItem("portfolioIntroSeen") === "1") return false;
    } catch {
      return false;
    }
    return true;
  });

  useLayoutEffect(() => {
    // Ensure deep-link opens the same AR portal as the Beyond the CV button,
    // even if something reset arOpen before first paint.
    if (!beyondEnabled) return;
    if (launchBeyond()) {
      setArOpen(true);
      setShowIntro(false);
    }
  }, [beyondEnabled]);

  useEffect(() => {
    if (!features.intro || !showIntro) return;
    try {
      window.sessionStorage.setItem("portfolioIntroSeen", "1");
    } catch {
      // sessionStorage unavailable (e.g. privacy mode); intro simply won't persist.
    }
  }, [features.intro, showIntro]);

  const toggleExperienceDetails = (experienceId) => {
    setExpandedExperiences((current) => ({
      ...current,
      [experienceId]: !current[experienceId],
    }));
  };

  const sidebarSlot = (
    <>
      {BeyondCard ? <BeyondCard onLaunch={() => setArOpen(true)} /> : null}
      {features.assistant ? <PortfolioAssistant /> : null}
    </>
  );

  // Explicit features.sections → PortfolioCore dynamic-imports only those modules.
  // Production passes eagerSectionModules from bootProduction (static graph).
  const sectionModules = Array.isArray(sectionSelection)
    ? null
    : eagerSectionModules;

  return (
    <>
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <PortfolioCore
        enabledSections={enabledSections}
        selectedLens={selectedLens}
        setSelectedLens={setSelectedLens}
        expandedExperiences={expandedExperiences}
        toggleExperienceDetails={toggleExperienceDetails}
        sidebarSlot={sidebarSlot}
        sectionModules={sectionModules}
      />

      <PortfolioSectionNavigator
        activeMacroKey={activeMacroKey}
        onActiveMacroSelect={selectMacro}
      />

      {BeyondView ? (
        <BeyondView open={arOpen} onClose={() => setArOpen(false)} />
      ) : null}
    </main>
    <AnimatePresence>
      {features.intro && showIntro ? (
        <PortfolioIntro onComplete={() => setShowIntro(false)} />
      ) : null}
    </AnimatePresence>
    </>
  );
}

export default App;
