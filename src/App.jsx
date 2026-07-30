import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  DEFAULT_APP_FEATURES,
  resolveAppFeatures,
} from "./diagnostics/appFeatures.js";
import PortfolioCore from "./portfolio/PortfolioCore.jsx";
import PortfolioSectionNavigator from "./portfolio/PortfolioSectionNavigator.jsx";
import { useActivePortfolioSection } from "./portfolio/useActivePortfolioSection.js";
import {
  assistantCategories,
  assistantPrompts,
  publicAsset,
  roleLenses,
  signalMap,
} from "./portfolio/portfolioData.js";
import { isOverviewLens } from "./portfolio/portfolioLens.js";
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

const assistantSelectionCardVariants = {
  topic: {
    layout: "min-h-[3.75rem] min-w-[12rem] max-w-[15rem] px-3 py-2.5",
    selected: "border-violet-300/50 bg-violet-400/10 text-violet-50",
    idle:
      "border-slate-800 bg-slate-900/35 text-slate-400 hover:border-violet-300/35 hover:text-slate-100",
    focus: "focus-visible:ring-violet-400/35",
  },
  question: {
    layout: "min-w-[13rem] max-w-[16rem] px-3 py-2.5 sm:min-w-[15rem]",
    selected:
      "border-cyan-300/50 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.12)]",
    idle:
      "border-slate-800 bg-slate-900/35 text-slate-400 hover:border-cyan-300/30 hover:text-slate-100",
    focus: "focus-visible:ring-cyan-400/35",
  },
};

function AssistantSelectionRail({ labelledBy, railRef, variant, children }) {
  return (
    <div
      ref={railRef}
      role="group"
      aria-labelledby={labelledBy}
      data-assistant-rail={variant}
      className="assistant-selection-rail flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-2"
    >
      {children}
    </div>
  );
}

function AssistantSelectionCard({ variant, selected, onClick, children }) {
  const styles = assistantSelectionCardVariants[variant];

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-assistant-card-variant={variant}
      onClick={onClick}
      className={`shrink-0 rounded-lg border text-left text-xs font-medium leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${styles.layout} ${styles.focus} ${
        selected ? styles.selected : styles.idle
      }`}
    >
      {children}
    </button>
  );
}

function PortfolioAssistant() {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const questionRailRef = useRef(null);
  const savedScrollYRef = useRef(0);
  const restoreFocusOnCloseRef = useRef(false);
  const previewQuestion = assistantPrompts[previewIndex % assistantPrompts.length].question;

  useEffect(() => {
    const previewTimer = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % assistantPrompts.length);
    }, 3600);

    return () => window.clearInterval(previewTimer);
  }, []);

  const openAssistant = () => {
    restoreFocusOnCloseRef.current = false;
    savedScrollYRef.current = window.scrollY;
    setSelectedPrompt(null);
    setSelectedCategory(null);
    setIsDrawerOpen(true);
  };

  const closeAssistant = useCallback((restoreFocus = true) => {
    restoreFocusOnCloseRef.current = restoreFocus;
    setIsDrawerOpen(false);
  }, []);

  const categoryPrompts = selectedCategory
    ? assistantPrompts.filter((prompt) =>
        prompt.categories.includes(selectedCategory)
      )
    : [];

  useEffect(() => {
    if (isDrawerOpen || !restoreFocusOnCloseRef.current) return;
    restoreFocusOnCloseRef.current = false;
    openButtonRef.current?.focus();
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const body = document.body;
    const savedScrollY = savedScrollYRef.current;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;

    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.width = "100%";

    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAssistant(true);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, savedScrollY);
    };
  }, [closeAssistant, isDrawerOpen]);

  const handleAssistantSignalClick = (event, signal) => {
    event.preventDefault();

    const target = signal.target;
    if (signal.missing || !target) {
      console.warn("Missing Portfolio Assistant signal mapping:", signal.id);
      return;
    }

    closeAssistant(false);

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
        <div className="mb-4 flex items-center gap-4 border-b border-slate-800 pb-4 sm:gap-3">
          <img
            src={publicAsset("profile.png")}
            alt="Lorenzo Natali"
            className="h-16 w-16 shrink-0 rounded-full border border-cyan-400/30 object-cover sm:h-11 sm:w-11"
          />
          <div>
            <p className="text-base font-semibold leading-tight tracking-tight text-slate-50 sm:text-sm">Portfolio Assistant</p>
          </div>
        </div>

        <p className="max-w-[30ch] text-sm font-medium leading-6 text-slate-400 sm:text-xs sm:leading-5 sm:text-slate-500">
          Guided answers on my background, projects and professional direction.
        </p>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 px-4 py-3.5 sm:mt-3.5 sm:px-3 sm:py-3">
          <p className="text-xs font-semibold uppercase leading-none tracking-[0.2em] text-cyan-300/75 sm:text-[11px] sm:tracking-[0.22em]">
            Example questions
          </p>
          {/* Fixed height sized for the longest showcase questions — avoids card resize on rotate. */}
          <div className="mt-2.5 flex h-[6rem] items-start overflow-hidden sm:mt-2 sm:h-[5rem]">
            <motion.p
              key={previewQuestion}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="text-sm font-medium leading-6 text-slate-200 sm:text-xs sm:leading-5 sm:text-slate-300"
            >
              {previewQuestion}
            </motion.p>
          </div>
        </div>

        <button
          ref={openButtonRef}
          type="button"
          onClick={() => openAssistant()}
          className="mt-5 w-full rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-4 text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 sm:py-3 sm:text-sm"
        >
          Open Assistant
        </button>
      </aside>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isDrawerOpen && (
                <motion.div
                  data-assistant-overlay="scroll"
                  className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-slate-950/75 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => closeAssistant(true)}
                >
                  <div className="flex min-h-full justify-center p-4 sm:p-6">
                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="portfolio-assistant-modal-title"
                      aria-describedby="portfolio-assistant-modal-description"
                      className="w-full max-w-4xl self-start rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/70"
                      initial={{ y: 18, scale: 0.98 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={{ y: 18, scale: 0.98 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={publicAsset("profile.png")}
                      alt="Lorenzo Natali"
                      className="h-11 w-11 rounded-full border border-cyan-400/30 object-cover"
                    />
                    <div className="min-w-0">
                      <p id="portfolio-assistant-modal-title" className="text-sm font-semibold text-slate-50">Portfolio Assistant</p>
                      <p id="portfolio-assistant-modal-description" className="mt-1 max-w-xl text-xs leading-4 text-slate-500 sm:leading-5">
                        Explore my experience through curated questions and guided answers.
                      </p>
                    </div>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => closeAssistant(true)}
                    className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
                  >
                    Close
                  </button>
                </div>

                <div data-assistant-modal-content className="p-5 sm:p-6">
                  <p
                    id="assistant-topic-rail-label"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Explore by topic
                  </p>

                  <div className="mt-3">
                    <AssistantSelectionRail
                      labelledBy="assistant-topic-rail-label"
                      variant="topic"
                    >
                      {assistantCategories.map((category) => {
                        const isActive = category === selectedCategory;
                        return (
                          <AssistantSelectionCard
                            key={category}
                            variant="topic"
                            selected={isActive}
                            onClick={() => {
                              if (category === selectedCategory) return;
                              setSelectedCategory(category);
                              setSelectedPrompt(null);
                              if (questionRailRef.current) {
                                questionRailRef.current.scrollLeft = 0;
                              }
                            }}
                          >
                            {category}
                          </AssistantSelectionCard>
                        );
                      })}
                    </AssistantSelectionRail>
                  </div>

                  {selectedCategory ? (
                    <div className="mt-6">
                      <p
                        id="assistant-question-rail-label"
                        className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
                      >
                        Suggested questions
                      </p>
                      <AssistantSelectionRail
                        labelledBy="assistant-question-rail-label"
                        railRef={questionRailRef}
                        variant="question"
                      >
                        {categoryPrompts.map((prompt) => {
                          const isActive = prompt.question === selectedPrompt?.question;
                          return (
                            <AssistantSelectionCard
                              key={prompt.question}
                              variant="question"
                              selected={isActive}
                              onClick={() => setSelectedPrompt(prompt)}
                            >
                              {prompt.question}
                            </AssistantSelectionCard>
                          );
                        })}
                      </AssistantSelectionRail>
                    </div>
                  ) : null}

                  {selectedPrompt ? (
                    <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-900/25 p-5 sm:p-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedPrompt.question}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <h2 className="break-words text-base font-semibold leading-6 text-slate-100 sm:text-lg sm:leading-7">
                            {selectedPrompt.question}
                          </h2>

                          <div className="mt-4">
                            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                              {selectedPrompt.answer}
                            </p>
                          </div>

                          <div className="mt-5 border-t border-slate-800/70 pt-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Continue exploring</p>
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
                  ) : null}
                </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
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
  const { activeSectionId, selectSection } = useActivePortfolioSection();
  const activeLensLabel = isOverviewLens(selectedLens)
    ? null
    : (() => {
        const lens = roleLenses.find((item) => item.name === selectedLens);
        return lens ? lens.label ?? lens.name : null;
      })();
  const clearSelectedLens = () => setSelectedLens("Overview");
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
        activeSectionId={activeSectionId}
        onSectionSelect={selectSection}
        activeLensLabel={activeLensLabel}
        onClearLens={clearSelectedLens}
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
