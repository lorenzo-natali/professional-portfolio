import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info, MessageSquare, X } from "lucide-react";
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
import { trackPortfolioEvent } from "./portfolio/analytics/createPortfolioAnalytics.js";
import { AssistantAvailabilityIndicator } from "./portfolio/AssistantAvailability.jsx";
import { interpretAskResult } from "./portfolio/assistantAsk.js";
import { resolveAssistantEndpoint, useAssistantAvailability } from "./portfolio/useAssistantAvailability.js";
import { AssistantConversation } from "./portfolio/AssistantConversation.jsx";
import {
  ASSISTANT_PREVIEW_QUESTIONS,
  useAssistantPreviewRotation,
} from "./portfolio/useAssistantPreviewRotation.js";
import {
  highestAssistantMessageSeq,
  loadAssistantConversation,
  saveAssistantConversation,
} from "./portfolio/assistantConversationStore.js";
import {
  beyondCvAnchorId,
  dismissBeyondCv,
  loadBeyondCvSession,
  offerBeyondCv,
  saveBeyondCvSession,
  unlockBeyondCv,
  BEYOND_CV_ACTION,
} from "./portfolio/beyondCvEasterEgg.js";
import { useIsMobileDevice } from "./components/ar/useIsMobileDevice.js";
import {
  ASSISTANT_ASK_TIMEOUT_MS,
  ASSISTANT_BURST_MESSAGE,
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_GLOBAL_LIMIT_MESSAGE,
  ASSISTANT_ABOUT_PARAGRAPHS,
  ASSISTANT_ABOUT_TEXT,
  ASSISTANT_VISITOR_LIMIT_MESSAGE,
  canSendAssistantQuestion,
  clampAssistantQuestion,
} from "./portfolio/assistantChatModel.js";
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
  },
  question: {
    layout: "min-w-[13rem] max-w-[16rem] px-3 py-2.5 sm:min-w-[15rem]",
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
      className={`assistant-choice shrink-0 rounded-lg border text-left text-xs font-medium leading-5 transition focus-visible:outline-none ${styles.layout}`}
    >
      {children}
    </button>
  );
}

function PortfolioAssistant({ onLaunchBeyondCv }) {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [panel, setPanel] = useState("chat");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => loadAssistantConversation());
  const [beyondCv, setBeyondCv] = useState(() => loadBeyondCvSession());
  const beyondCvMobile = useIsMobileDevice();
  const [reply, setReply] = useState(
    /** @type {{ phase: "idle" | "loading" | "unavailable" | "error", text: string }} */ ({
      phase: "idle",
      text: "",
    }),
  );
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const openButtonRef = useRef(null);
  const composerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const disclaimerButtonRef = useRef(null);
  const disclaimerCloseRef = useRef(null);
  const disclaimerOpenRef = useRef(false);
  disclaimerOpenRef.current = disclaimerOpen;
  const dialogRef = useRef(null);
  const assistantFrameRef = useRef(null);
  const questionRailRef = useRef(null);
  const previewRootRef = useRef(null);
  const savedScrollYRef = useRef(0);
  const { index: previewIndex, motionEnabled: previewMotion, animateQuestion: previewAnimate } =
    useAssistantPreviewRotation(previewRootRef);
  const restoreFocusOnCloseRef = useRef(false);
  const askSeqRef = useRef(highestAssistantMessageSeq(messages));
  const askAbortRef = useRef(/** @type {AbortController | null} */ (null));
  const askDeadlineRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const sendingRef = useRef(false);
  const messagesRef = useRef(messages);
  const pendingMessageIdRef = useRef(/** @type {string | null} */ (null));
  const { status: availability, refresh: refreshAvailability } = useAssistantAvailability(isDrawerOpen);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const persistSettledMessages = useCallback((next = messagesRef.current) => {
    const pendingId = pendingMessageIdRef.current;
    const settled = pendingId ? next.filter((message) => message.id !== pendingId) : next;
    saveAssistantConversation(settled);
  }, []);

  useEffect(() => {
    persistSettledMessages(messages);
  }, [messages, persistSettledMessages]);

  useEffect(() => {
    saveBeyondCvSession(beyondCv);
  }, [beyondCv]);

  const clearAskDeadline = useCallback(() => {
    if (askDeadlineRef.current != null) {
      window.clearTimeout(askDeadlineRef.current);
      askDeadlineRef.current = null;
    }
  }, []);

  const cancelAsk = useCallback(() => {
    clearAskDeadline();
    askSeqRef.current += 1;
    sendingRef.current = false;
    const controller = askAbortRef.current;
    askAbortRef.current = null;
    controller?.abort();
  }, [clearAskDeadline]);

  const releasePendingMessage = useCallback((drop) => {
    const pendingId = pendingMessageIdRef.current;
    pendingMessageIdRef.current = null;
    if (drop && pendingId) {
      setMessages((current) => {
        const next = current.filter((message) => message.id !== pendingId);
        saveAssistantConversation(next);
        return next;
      });
      setReply({ phase: "idle", text: "" });
      return;
    }
    saveAssistantConversation(messagesRef.current);
  }, []);

  const openAssistant = (prefill) => {
    cancelAsk();
    releasePendingMessage(true);
    restoreFocusOnCloseRef.current = false;
    savedScrollYRef.current = window.scrollY;
    setSelectedPrompt(null);
    setSelectedCategory(null);
    setPanel("chat");
    setDisclaimerOpen(false);
    setReply({ phase: "idle", text: "" });
    setDraft(typeof prefill === "string" ? clampAssistantQuestion(prefill) : "");
    setIsDrawerOpen(true);
    // Compact event only — no prompt/answer text ever leaves this surface via analytics.
    trackPortfolioEvent("assistant_open");
  };

  const sendQuestion = () => {
    const text = clampAssistantQuestion(draft).trim();
    if (!canSendAssistantQuestion(text) || sendingRef.current) return;

    if (availability === "visitor_limit" || availability === "global_limit") {
      setReply({
        phase: "unavailable",
        text:
          availability === "visitor_limit"
            ? ASSISTANT_VISITOR_LIMIT_MESSAGE
            : ASSISTANT_GLOBAL_LIMIT_MESSAGE,
      });
      return;
    }

    const endpoint = resolveAssistantEndpoint();
    if (!endpoint) {
      const seq = ++askSeqRef.current;
      setMessages((current) => [
        ...current,
        { id: `user-${seq}`, role: "user", text },
      ]);
      setDraft("");
      setReply({ phase: "unavailable", text: "" });
      return;
    }

    sendingRef.current = true;
    clearAskDeadline();
    askAbortRef.current?.abort();
    const seq = ++askSeqRef.current;
    const controller = new AbortController();
    askAbortRef.current = controller;
    const userMessageId = `user-${seq}`;
    pendingMessageIdRef.current = userMessageId;
    setMessages((current) => [...current, { id: userMessageId, role: "user", text }]);
    setDraft("");
    setReply({ phase: "loading", text: "" });

    const deadlineId = window.setTimeout(() => {
      if (askDeadlineRef.current === deadlineId) askDeadlineRef.current = null;
      if (seq !== askSeqRef.current) return;
      askSeqRef.current += 1;
      sendingRef.current = false;
      const active = askAbortRef.current;
      askAbortRef.current = null;
      active?.abort();
      pendingMessageIdRef.current = null;
      saveAssistantConversation(messagesRef.current);
      setReply({ phase: "unavailable", text: "" });
      void refreshAvailability();
    }, ASSISTANT_ASK_TIMEOUT_MS);
    askDeadlineRef.current = deadlineId;

    const applyReply = (next) => {
      if (seq !== askSeqRef.current) return;
      setReply(next);
    };

    void (async () => {
      try {
        const response = await fetch(`${endpoint}/ask`, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
          signal: controller.signal,
        });
        if (seq !== askSeqRef.current) return;
        let body = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        if (seq !== askSeqRef.current) return;
        const outcome = interpretAskResult(response.status, body);
        if (outcome.type === "answer") {
          pendingMessageIdRef.current = null;
          setMessages((current) => [
            ...current,
            {
              id: `assistant-${seq}`,
              role: "assistant",
              text: outcome.answer,
              signalIds: outcome.signalIds,
            },
          ]);
          if (outcome.action === BEYOND_CV_ACTION) {
            setBeyondCv((current) =>
              offerBeyondCv(current, {
                question: text,
                answer: outcome.answer,
                anchorId: `assistant-${seq}`,
              }),
            );
          }
          applyReply({ phase: "idle", text: "" });
          void refreshAvailability();
        } else if (outcome.type === "quota") {
          pendingMessageIdRef.current = null;
          saveAssistantConversation(messagesRef.current);
          const next = await refreshAvailability();
          if (seq !== askSeqRef.current) return;
          if (next === "visitor_limit") {
            applyReply({ phase: "unavailable", text: ASSISTANT_VISITOR_LIMIT_MESSAGE });
          } else if (next === "global_limit") {
            applyReply({ phase: "unavailable", text: ASSISTANT_GLOBAL_LIMIT_MESSAGE });
          } else if (next === "available") {
            applyReply({ phase: "unavailable", text: ASSISTANT_BURST_MESSAGE });
          } else {
            applyReply({ phase: "unavailable", text: "" });
          }
        } else {
          pendingMessageIdRef.current = null;
          saveAssistantConversation(messagesRef.current);
          applyReply({ phase: "error", text: ASSISTANT_ERROR_MESSAGE });
          void refreshAvailability();
        }
      } catch (error) {
        if (seq !== askSeqRef.current) return;
        if (error?.name === "AbortError") return;
        pendingMessageIdRef.current = null;
        saveAssistantConversation(messagesRef.current);
        applyReply({ phase: "unavailable", text: "" });
        void refreshAvailability();
      } finally {
        if (seq === askSeqRef.current) {
          clearAskDeadline();
          sendingRef.current = false;
        }
      }
    })();
  };

  const closeAssistant = useCallback((restoreFocus = true) => {
    cancelAsk();
    releasePendingMessage(true);
    restoreFocusOnCloseRef.current = restoreFocus;
    setIsDrawerOpen(false);
  }, [cancelAsk, releasePendingMessage]);

  useEffect(() => cancelAsk, [cancelAsk]);

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
    const applicationRoot = openButtonRef.current?.closest("main") ?? null;
    const supportsInert = Boolean(applicationRoot && "inert" in applicationRoot);
    const previousApplicationInert = supportsInert
      ? applicationRoot.inert
      : false;
    const previousApplicationInertAttribute =
      applicationRoot?.getAttribute("inert");
    const previousApplicationAriaHidden = applicationRoot?.getAttribute(
      "aria-hidden"
    );

    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.width = "100%";

    if (applicationRoot) {
      applicationRoot.setAttribute("inert", "");
      if (supportsInert) {
        applicationRoot.inert = true;
      } else {
        applicationRoot.setAttribute("aria-hidden", "true");
      }
    }

    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (disclaimerOpenRef.current) {
          setDisclaimerOpen(false);
          disclaimerButtonRef.current?.focus();
          return;
        }
        closeAssistant(true);
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusRoot = disclaimerOpenRef.current
        ? dialog.querySelector("[data-assistant-disclaimer]") ?? dialog
        : dialog;

      const focusableElements = Array.from(
        focusRoot.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          element.getAttribute("tabindex") !== "-1"
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (!firstFocusable || !lastFocusable) return;

      const activeElement = document.activeElement;
      if (
        event.shiftKey &&
        (activeElement === firstFocusable || !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastFocusable || !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      if (applicationRoot) {
        if (supportsInert) {
          applicationRoot.inert = previousApplicationInert;
        }
        if (previousApplicationInertAttribute == null) {
          applicationRoot.removeAttribute("inert");
        } else {
          applicationRoot.setAttribute("inert", previousApplicationInertAttribute);
        }
        if (!supportsInert) {
          if (previousApplicationAriaHidden == null) {
            applicationRoot.removeAttribute("aria-hidden");
          } else {
            applicationRoot.setAttribute(
              "aria-hidden",
              previousApplicationAriaHidden
            );
          }
        }
      }
      window.scrollTo(0, savedScrollY);
    };
  }, [closeAssistant, isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen || !disclaimerOpen) return undefined;
    disclaimerCloseRef.current?.focus();
    return undefined;
  }, [disclaimerOpen, isDrawerOpen]);

  const closeDisclaimer = useCallback(() => {
    setDisclaimerOpen(false);
    disclaimerButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const viewport = window.visualViewport;
    const frame = assistantFrameRef.current;
    if (!viewport || !frame) return undefined;

    const desktop = window.matchMedia("(min-width: 640px)");
    const syncFrameToVisibleViewport = () => {
      if (desktop.matches) {
        frame.style.top = "";
        frame.style.height = "";
        return;
      }
      frame.style.top = `${viewport.offsetTop}px`;
      frame.style.height = `${viewport.height}px`;
    };

    syncFrameToVisibleViewport();
    viewport.addEventListener("resize", syncFrameToVisibleViewport);
    viewport.addEventListener("scroll", syncFrameToVisibleViewport);
    desktop.addEventListener("change", syncFrameToVisibleViewport);
    return () => {
      viewport.removeEventListener("resize", syncFrameToVisibleViewport);
      viewport.removeEventListener("scroll", syncFrameToVisibleViewport);
      desktop.removeEventListener("change", syncFrameToVisibleViewport);
      frame.style.top = "";
      frame.style.height = "";
    };
  }, [isDrawerOpen]);

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
      // Canonical projects[].id from signalMap target — emit once here.
      // ProjectDeck applies state without emitting source:deck for this path.
      trackPortfolioEvent("project_view", {
        project_id: target.id,
        source: "assistant",
      });
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
      <aside className="assistant-theme assistant-surface w-full rounded-2xl p-6 sm:p-5 lg:px-7 lg:py-10">
        <div className="mb-4 flex items-center gap-4 border-b assistant-divider pb-4 max-sm:justify-center sm:gap-3 lg:justify-center">
          <img
            src={publicAsset("profile.png")}
            alt="Lorenzo Natali"
            className="assistant-avatar-ring h-16 w-16 shrink-0 rounded-full border object-cover sm:h-11 sm:w-11"
          />
          <div className="min-w-0">
            <p className="assistant-text text-base font-semibold leading-tight tracking-tight sm:text-sm lg:text-[0.9375rem]">
              AI Portfolio{" "}
              <span className="whitespace-nowrap">
                Assistant
                <AssistantAvailabilityIndicator status={availability} />
              </span>
            </p>
          </div>
        </div>

        <p className="assistant-muted w-full text-center text-sm font-medium leading-6 sm:mx-auto sm:max-w-[30ch] sm:text-xs sm:leading-5 lg:hidden">
          Explore my background, experience, and interests through my AI Assistant.
        </p>

        <div ref={previewRootRef} data-assistant-preview-root className="hidden lg:block">
          <p className="assistant-muted text-sm leading-6">
            I built this AI Assistant to share insights beyond my portfolio and make it easier to explore my background and connect with me.
          </p>
          <div className="mt-8">
            <p className="assistant-accent text-[11px] font-medium uppercase leading-none tracking-[0.18em]">
              YOU CAN ASK ME...
            </p>
            <div className="mt-3 grid">
              {ASSISTANT_PREVIEW_QUESTIONS.map((question, questionIndex) => {
                const active = questionIndex === previewIndex;
                return (
                  <p
                    key={question}
                    data-assistant-preview-question={active ? "true" : "false"}
                    aria-hidden={active ? undefined : true}
                    className={`assistant-preview-quote assistant-text col-start-1 row-start-1 min-w-0 break-words text-base italic leading-6 ${
                      active
                        ? previewMotion && previewAnimate
                          ? "assistant-preview-question-in"
                          : ""
                        : "invisible"
                    }`}
                  >
                    {question}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        <button
          ref={openButtonRef}
          type="button"
          onClick={() => openAssistant()}
          className="assistant-cta mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-4 text-base font-semibold transition focus-visible:outline-none sm:py-3 sm:text-sm lg:mt-8"
        >
          <MessageSquare className="h-4 w-4 shrink-0 lg:hidden" aria-hidden="true" />
          <span className="lg:hidden">Chat</span>
          <span className="hidden lg:inline">Ask the Assistant</span>
          <ArrowRight className="hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />
        </button>
      </aside>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isDrawerOpen && (
                <motion.div
                  data-assistant-overlay="scroll"
                  className="fixed inset-0 z-50 overflow-hidden bg-slate-950/75 backdrop-blur-sm"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                  onClick={() => closeAssistant(true)}
                >
                  <div
                    ref={assistantFrameRef}
                    className="absolute inset-x-0 top-0 flex h-dvh min-h-0 w-full flex-col overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:h-[100dvh] sm:items-center sm:justify-center sm:overflow-visible sm:p-6"
                  >
                    <motion.div
                      ref={dialogRef}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="portfolio-assistant-modal-title"
                      aria-describedby="portfolio-assistant-modal-description"
                      data-assistant-motion={reduceMotion ? "reduced" : "animated"}
                      className="assistant-theme assistant-surface relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl sm:h-[78vh] sm:max-h-[80vh] sm:max-w-4xl sm:flex-none"
                      initial={reduceMotion ? false : { y: 18, scale: 0.98 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 1 } : { y: 18, scale: 0.98 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                <p id="portfolio-assistant-modal-description" className="sr-only">
                  {ASSISTANT_ABOUT_TEXT}
                </p>
                <div
                  data-assistant-header
                  className="relative z-20 flex min-h-14 shrink-0 items-center gap-2 border-b assistant-divider px-3 sm:px-4"
                >
                  <img
                    src={publicAsset("profile.png")}
                    alt=""
                    className="assistant-avatar-ring h-10 w-10 shrink-0 rounded-full border object-cover"
                  />
                  <div className="flex min-w-0 flex-1 items-center">
                    <p id="portfolio-assistant-modal-title" className="assistant-text min-w-0 truncate text-sm font-semibold">
                      AI Portfolio Assistant
                    </p>
                    <AssistantAvailabilityIndicator
                      status={availability}
                      tabIndex={-1}
                      spacious
                    />
                  </div>
                  <button
                    ref={disclaimerButtonRef}
                    type="button"
                    aria-label="About this assistant"
                    aria-expanded={disclaimerOpen}
                    aria-controls="assistant-disclaimer"
                    onClick={() => setDisclaimerOpen(true)}
                    className="assistant-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none"
                  >
                    <Info className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Close"
                    onClick={() => closeAssistant(true)}
                    className="assistant-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div data-assistant-modal-content className="flex min-h-0 flex-1 flex-col">
                  {panel === "chat" ? (
                    <AssistantConversation
                      messages={messages}
                      draft={draft}
                      onDraftChange={setDraft}
                      onSend={sendQuestion}
                      onSignalClick={handleAssistantSignalClick}
                      signalMap={signalMap}
                      status={reply.phase}
                      unavailableMessage={reply.text}
                      errorMessage={reply.text || ASSISTANT_ERROR_MESSAGE}
                      composerRef={composerRef}
                      beyondCv={
                        beyondCvAnchorId(messages, beyondCv)
                          ? {
                              messageId: beyondCvAnchorId(messages, beyondCv),
                              lang: beyondCv.lang === "it" ? "it" : "en",
                              state: beyondCv.state,
                              mobile: beyondCvMobile,
                            }
                          : null
                      }
                      onBeyondCvAccept={() => setBeyondCv((current) => unlockBeyondCv(current))}
                      onBeyondCvDismiss={() => setBeyondCv((current) => dismissBeyondCv(current))}
                      onBeyondCvLaunch={() => onLaunchBeyondCv?.()}
                    />
                  ) : (
                    <div
                      data-assistant-curated
                      className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5"
                    >
                  <button
                    type="button"
                    onClick={() => setPanel("chat")}
                    className="assistant-muted mb-4 text-xs font-medium underline decoration-[color:var(--assistant-border)] underline-offset-4 transition hover:text-[var(--assistant-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--assistant-accent)]"
                  >
                    Back to AI Assistant
                  </button>
                  <p
                    id="assistant-topic-rail-label"
                    className="assistant-muted text-[11px] font-semibold uppercase tracking-[0.2em]"
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
                        className="assistant-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
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
                              onClick={() => {
                                // Privacy boundary: only prompt_id + category — never question/answer text.
                                if (selectedCategory && prompt?.id) {
                                  trackPortfolioEvent("assistant_curated_question", {
                                    prompt_id: prompt.id,
                                    category: selectedCategory,
                                  });
                                }
                                setSelectedPrompt(prompt);
                              }}
                            >
                              {prompt.question}
                            </AssistantSelectionCard>
                          );
                        })}
                      </AssistantSelectionRail>
                    </div>
                  ) : null}

                  {selectedPrompt ? (
                    <div className="assistant-panel mt-5 rounded-xl p-5 sm:p-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedPrompt.question}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <h2 className="assistant-text break-words text-base font-semibold leading-6 sm:text-lg sm:leading-7">
                            {selectedPrompt.question}
                          </h2>

                          <div className="mt-4">
                            <p className="assistant-text max-w-3xl text-sm leading-7 sm:text-base">
                              {selectedPrompt.answer}
                            </p>
                          </div>

                          <div className="assistant-divider mt-5 border-t pt-4">
                            <p className="assistant-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]">Continue exploring</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-2">
                              {getAssistantSignals(selectedPrompt).map((signal) => (
                                <a
                                  key={signal.id}
                                  href={signal.href ?? "#"}
                                  aria-disabled={signal.missing ? "true" : undefined}
                                  onClick={(event) => handleAssistantSignalClick(event, signal)}
                                  className={`text-xs font-medium underline underline-offset-4 transition ${
                                    signal.missing
                                      ? "cursor-not-allowed text-[color:color-mix(in_srgb,var(--assistant-muted)_45%,transparent)] decoration-[color:var(--assistant-border)]"
                                      : "assistant-link"
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
                  )}
                </div>
                {disclaimerOpen ? (
                  <div
                    id="assistant-disclaimer"
                    data-assistant-disclaimer
                    className="assistant-scrim absolute inset-0 z-30 flex items-center justify-center px-4"
                    onClick={closeDisclaimer}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="assistant-disclaimer-title"
                      className="assistant-panel flex max-h-[85%] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3">
                        <h2 id="assistant-disclaimer-title" className="assistant-text min-w-0 text-base font-semibold">
                          About this assistant
                        </h2>
                        <button
                          ref={disclaimerCloseRef}
                          type="button"
                          aria-label="Close"
                          onClick={closeDisclaimer}
                          className="assistant-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none"
                        >
                          <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="min-h-0 overflow-y-auto px-5 pb-5">
                        <div className="assistant-text space-y-3 text-sm leading-6">
                          {ASSISTANT_ABOUT_PARAGRAPHS.map((paragraph, index) => (
                            <p
                              key={paragraph}
                              className={
                                index === ASSISTANT_ABOUT_PARAGRAPHS.length - 1
                                  ? "pt-3 font-bold"
                                  : index === 0
                                    ? undefined
                                    : "pt-3"
                              }
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
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
  const beyondDeeplinkTrackedRef = useRef(false);
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
      if (!beyondDeeplinkTrackedRef.current) {
        beyondDeeplinkTrackedRef.current = true;
        trackPortfolioEvent("beyond_cv_open", { source: "deeplink" });
      }
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

  // Accordion: only one experience details panel open at a time.
  const toggleExperienceDetails = (experienceId) => {
    const isOpen = Boolean(expandedExperiences[experienceId]);
    if (isOpen) {
      setExpandedExperiences({});
      return;
    }
    trackPortfolioEvent("experience_open", { experience_id: experienceId });
    setExpandedExperiences({ [experienceId]: true });
  };

  // Homepage entry stays hidden. The assistant invitation and ?beyond=1
  // still open the same ARGovernanceView.
  const beyondSlot = null;

  const sidebarSlot = features.assistant ? (
    <PortfolioAssistant
      onLaunchBeyondCv={() => {
        trackPortfolioEvent("beyond_cv_open", { source: "assistant" });
        setArOpen(true);
      }}
    />
  ) : null;

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
        beyondSlot={beyondSlot}
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
