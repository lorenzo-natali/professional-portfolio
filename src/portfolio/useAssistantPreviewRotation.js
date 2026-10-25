import { useEffect, useState } from "react";

/** Homepage preview only. Not the deterministic assistantPrompts catalog. */
export const ASSISTANT_PREVIEW_QUESTIONS = Object.freeze([
  "How do the different parts of your profile fit together?",
  "What is your exposure to AI Governance?",
  "What is Cognitive Behavior Intelligence?",
  "How did your studies lead you into audit?",
  "What interests you beyond your professional work?",
]);

export const ASSISTANT_PREVIEW_INTERVAL_MS = 5000;

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * @param {string} query
 * @returns {MediaQueryList | null}
 */
function mediaQuery(query) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

/**
 * @param {MediaQueryList | null} query
 * @param {() => void} listener
 */
function subscribe(query, listener) {
  if (!query) return () => {};
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }
  if (typeof query.addListener === "function") {
    query.addListener(listener);
    return () => query.removeListener(listener);
  }
  return () => {};
}

/**
 * Rotates the shared preview question while the preview is on screen.
 * One timer for every viewport. No timer without IntersectionObserver and motion allowed.
 * @param {import("react").RefObject<Element | null>} rootRef
 */
export function useAssistantPreviewRotation(rootRef) {
  const [index, setIndex] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(
    () => !mediaQuery(REDUCE_MOTION_QUERY)?.matches,
  );
  const [animateQuestion, setAnimateQuestion] = useState(false);

  useEffect(() => {
    const reduceQuery = mediaQuery(REDUCE_MOTION_QUERY);
    const session = {
      cancelled: false,
      timerId: 0,
      inViewport: false,
      documentVisible: document.visibilityState !== "hidden",
      reduced: Boolean(reduceQuery?.matches),
      /** @type {IntersectionObserver | null} */
      observer: null,
      visibilityBound: false,
    };

    const clearTimer = () => {
      if (!session.timerId) return;
      window.clearInterval(session.timerId);
      session.timerId = 0;
    };

    const disconnectObserver = () => {
      session.observer?.disconnect();
      session.observer = null;
    };

    const onVisibility = () => {
      if (session.cancelled) return;
      session.documentVisible = document.visibilityState !== "hidden";
      syncTimer();
    };

    const unbindVisibility = () => {
      if (!session.visibilityBound) return;
      document.removeEventListener("visibilitychange", onVisibility);
      session.visibilityBound = false;
    };

    const syncTimer = () => {
      if (session.cancelled) return;
      const shouldRun =
        !session.reduced &&
        session.inViewport &&
        session.documentVisible;
      if (!shouldRun) {
        clearTimer();
        return;
      }
      if (session.timerId) return;
      session.timerId = window.setInterval(() => {
        if (session.cancelled) return;
        setAnimateQuestion(true);
        setIndex((current) => (current + 1) % ASSISTANT_PREVIEW_QUESTIONS.length);
      }, ASSISTANT_PREVIEW_INTERVAL_MS);
    };

    const applyMode = () => {
      clearTimer();
      disconnectObserver();
      unbindVisibility();
      session.inViewport = false;
      if (session.cancelled || session.reduced) return;
      if (typeof IntersectionObserver !== "function") return;
      const root = rootRef.current;
      if (!root) return;

      document.addEventListener("visibilitychange", onVisibility);
      session.visibilityBound = true;
      session.observer = new IntersectionObserver(
        (entries) => {
          if (session.cancelled) return;
          const entry = entries[0];
          session.inViewport = Boolean(
            entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0,
          );
          syncTimer();
        },
        { root: null, rootMargin: "0px", threshold: [0, 0.01] },
      );
      session.observer.observe(root);
    };

    const unsubReduce = subscribe(reduceQuery, () => {
      const reduced = Boolean(reduceQuery?.matches);
      session.reduced = reduced;
      if (session.cancelled) return;
      if (reduced) {
        setIndex(0);
        setAnimateQuestion(false);
        setMotionEnabled(false);
      } else {
        setMotionEnabled(true);
      }
      applyMode();
    });

    applyMode();

    return () => {
      session.cancelled = true;
      clearTimer();
      disconnectObserver();
      unbindVisibility();
      unsubReduce();
    };
  }, [rootRef]);

  return { index, motionEnabled, animateQuestion };
}
