import { useCallback, useEffect, useRef, useState } from "react";
import { getNavigatorSections } from "./sectionCatalog.js";

export const DEFAULT_ACTIVE_SECTION_ID = "hero";

/**
 * Top-biased sensing band: shrink bottom so the upper mid-viewport wins.
 * Multiple thresholds reduce sparse callback gaps without per-frame work.
 */
export const SECTION_ACTIVE_OBSERVER_OPTIONS = Object.freeze({
  root: null,
  rootMargin: "-12% 0px -58% 0px",
  threshold: Object.freeze([0, 0.05, 0.1, 0.25, 0.5, 0.75, 1]),
});

/** Keep current section when it remains competitive (reduces boundary flicker). */
export const SECTION_ACTIVE_HYSTERESIS = 0.18;

/**
 * @typedef {{ isIntersecting: boolean, ratio: number, top: number }} SectionIntersectionState
 */

/**
 * @param {Map<string, SectionIntersectionState> | Record<string, SectionIntersectionState>} states
 * @param {string} currentId
 * @param {readonly string[]} orderedIds
 * @param {{ scrollY?: number, viewportHeight?: number, documentHeight?: number }} [viewport]
 * @returns {string}
 */
export function resolveActiveSectionId(
  states,
  currentId,
  orderedIds,
  viewport = {}
) {
  if (!orderedIds.length) return DEFAULT_ACTIVE_SECTION_ID;

  const first = orderedIds[0];
  const last = orderedIds[orderedIds.length - 1];
  const scrollY = viewport.scrollY ?? 0;
  const viewportHeight = viewport.viewportHeight ?? 0;
  const documentHeight = viewport.documentHeight ?? 0;

  if (scrollY <= 16) return first;
  if (
    documentHeight > 0 &&
    viewportHeight > 0 &&
    scrollY + viewportHeight >= documentHeight - 48
  ) {
    return last;
  }

  const getState = (id) => {
    if (states instanceof Map) return states.get(id);
    return states[id];
  };

  const intersecting = orderedIds.filter((id) => {
    const state = getState(id);
    return Boolean(state?.isIntersecting && (state.ratio ?? 0) > 0);
  });

  if (intersecting.length === 0) {
    return orderedIds.includes(currentId) ? currentId : first;
  }

  let bestId = intersecting[0];
  let bestRatio = getState(bestId)?.ratio ?? 0;
  let bestTop = getState(bestId)?.top ?? Number.POSITIVE_INFINITY;

  for (let i = 1; i < intersecting.length; i += 1) {
    const id = intersecting[i];
    const state = getState(id);
    const ratio = state?.ratio ?? 0;
    const top = state?.top ?? Number.POSITIVE_INFINITY;
    if (
      ratio > bestRatio + 0.001 ||
      (Math.abs(ratio - bestRatio) <= 0.001 && top < bestTop)
    ) {
      bestId = id;
      bestRatio = ratio;
      bestTop = top;
    }
  }

  if (bestId === currentId) return currentId;

  const currentState = getState(currentId);
  if (
    currentState?.isIntersecting &&
    (currentState.ratio ?? 0) + SECTION_ACTIVE_HYSTERESIS >= bestRatio
  ) {
    return currentId;
  }

  return bestId;
}

function readViewportMetrics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { scrollY: 0, viewportHeight: 0, documentHeight: 0 };
  }
  return {
    scrollY: window.scrollY || window.pageYOffset || 0,
    viewportHeight: window.innerHeight || 0,
    documentHeight: Math.max(
      document.documentElement?.scrollHeight ?? 0,
      document.body?.scrollHeight ?? 0
    ),
  };
}

/**
 * Observe document section roots listed in the navigator catalog.
 * Optimistic selectSection() coordinates programmatic navigator jumps.
 *
 * @returns {{
 *   activeSectionId: string,
 *   selectSection: (sectionId: string) => void,
 * }}
 */
export function useActivePortfolioSection() {
  const [activeSectionId, setActiveSectionId] = useState(
    DEFAULT_ACTIVE_SECTION_ID
  );
  const activeRef = useRef(DEFAULT_ACTIVE_SECTION_ID);
  const lockRef = useRef(false);
  const orderedIdsRef = useRef(
    /** @type {string[]} */ (getNavigatorSections().map((section) => section.id))
  );
  const ratiosRef = useRef(
    /** @type {Map<string, SectionIntersectionState>} */ (new Map())
  );
  const applyResolvedRef = useRef(() => {});

  useEffect(() => {
    activeRef.current = activeSectionId;
  }, [activeSectionId]);

  const selectSection = useCallback((sectionId) => {
    if (!sectionId) return;
    activeRef.current = sectionId;
    setActiveSectionId(sectionId);
    lockRef.current = true;

    if (typeof window === "undefined") {
      lockRef.current = false;
      return;
    }

    let settled = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timeoutId = null;

    const clearLock = () => {
      if (settled) return;
      settled = true;
      lockRef.current = false;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener("scrollend", clearLock);
      applyResolvedRef.current();
    };

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", clearLock, { once: true });
    }
    timeoutId = window.setTimeout(clearLock, 500);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const orderedIds = getNavigatorSections().map((section) => section.id);
    orderedIdsRef.current = orderedIds;
    for (const id of orderedIds) {
      if (!ratiosRef.current.has(id)) {
        ratiosRef.current.set(id, {
          isIntersecting: false,
          ratio: 0,
          top: 0,
        });
      }
    }

    const applyResolved = () => {
      if (lockRef.current) return;
      const next = resolveActiveSectionId(
        ratiosRef.current,
        activeRef.current,
        orderedIdsRef.current,
        readViewportMetrics()
      );
      if (next === activeRef.current) return;
      activeRef.current = next;
      setActiveSectionId(next);
    };
    applyResolvedRef.current = applyResolved;

    if (typeof IntersectionObserver !== "function") {
      return () => {
        applyResolvedRef.current = () => {};
      };
    }

    const roots = orderedIds
      .map((id) => document.querySelector(`[data-portfolio-section="${id}"]`))
      .filter(Boolean);

    if (roots.length === 0) {
      return () => {
        applyResolvedRef.current = () => {};
      };
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute("data-portfolio-section");
        if (!id || !orderedIds.includes(id)) continue;
        ratiosRef.current.set(id, {
          isIntersecting: Boolean(entry.isIntersecting),
          ratio: entry.intersectionRatio ?? 0,
          top: entry.boundingClientRect?.top ?? 0,
        });
      }
      applyResolved();
    }, SECTION_ACTIVE_OBSERVER_OPTIONS);

    for (const root of roots) {
      observer.observe(root);
    }

    applyResolved();

    return () => {
      observer.disconnect();
      applyResolvedRef.current = () => {};
    };
  }, []);

  return { activeSectionId, selectSection };
}
