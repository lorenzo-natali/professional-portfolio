import { useCallback, useEffect, useRef, useState } from "react";
import { getVisibleMacroSections } from "./macroSectionRegistry.js";

export const DEFAULT_ACTIVE_MACRO_KEY = "profile";

/**
 * Top-biased sensing band: shrink bottom so the upper mid-viewport wins.
 * Multiple thresholds reduce sparse callback gaps without per-frame work.
 */
export const MACRO_ACTIVE_OBSERVER_OPTIONS = Object.freeze({
  root: null,
  rootMargin: "-12% 0px -58% 0px",
  threshold: Object.freeze([0, 0.05, 0.1, 0.25, 0.5, 0.75, 1]),
});

/** Keep current macro when it remains competitive (reduces boundary flicker). */
export const MACRO_ACTIVE_HYSTERESIS = 0.18;

/**
 * @typedef {{ isIntersecting: boolean, ratio: number, top: number }} MacroIntersectionState
 */

/**
 * @param {Map<string, MacroIntersectionState> | Record<string, MacroIntersectionState>} states
 * @param {string} currentKey
 * @param {readonly string[]} orderedKeys
 * @param {{ scrollY?: number, viewportHeight?: number, documentHeight?: number }} [viewport]
 * @returns {string}
 */
export function resolveActiveMacroKey(
  states,
  currentKey,
  orderedKeys,
  viewport = {}
) {
  if (!orderedKeys.length) return DEFAULT_ACTIVE_MACRO_KEY;

  const first = orderedKeys[0];
  const last = orderedKeys[orderedKeys.length - 1];
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

  const getState = (key) => {
    if (states instanceof Map) return states.get(key);
    return states[key];
  };

  const intersecting = orderedKeys.filter((key) => {
    const state = getState(key);
    return Boolean(state?.isIntersecting && (state.ratio ?? 0) > 0);
  });

  if (intersecting.length === 0) {
    return orderedKeys.includes(currentKey) ? currentKey : first;
  }

  let bestKey = intersecting[0];
  let bestRatio = getState(bestKey)?.ratio ?? 0;
  let bestTop = getState(bestKey)?.top ?? Number.POSITIVE_INFINITY;

  for (let i = 1; i < intersecting.length; i += 1) {
    const key = intersecting[i];
    const state = getState(key);
    const ratio = state?.ratio ?? 0;
    const top = state?.top ?? Number.POSITIVE_INFINITY;
    if (
      ratio > bestRatio + 0.001 ||
      (Math.abs(ratio - bestRatio) <= 0.001 && top < bestTop)
    ) {
      bestKey = key;
      bestRatio = ratio;
      bestTop = top;
    }
  }

  if (bestKey === currentKey) return currentKey;

  const currentState = getState(currentKey);
  if (
    currentState?.isIntersecting &&
    (currentState.ratio ?? 0) + MACRO_ACTIVE_HYSTERESIS >= bestRatio
  ) {
    return currentKey;
  }

  return bestKey;
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
 * Observe the three visible macro roots and expose the active macro key.
 * Optimistic selectMacro() coordinates programmatic navigator jumps.
 *
 * @returns {{
 *   activeMacroKey: string,
 *   selectMacro: (macroKey: string) => void,
 * }}
 */
export function useActiveMacroSection() {
  const [activeMacroKey, setActiveMacroKey] = useState(DEFAULT_ACTIVE_MACRO_KEY);
  const activeRef = useRef(DEFAULT_ACTIVE_MACRO_KEY);
  const lockRef = useRef(false);
  const orderedKeysRef = useRef(
    /** @type {string[]} */ (getVisibleMacroSections().map((macro) => macro.key))
  );
  const ratiosRef = useRef(
    /** @type {Map<string, MacroIntersectionState>} */ (new Map())
  );
  const applyResolvedRef = useRef(() => {});

  useEffect(() => {
    activeRef.current = activeMacroKey;
  }, [activeMacroKey]);

  const selectMacro = useCallback((macroKey) => {
    if (!macroKey) return;
    activeRef.current = macroKey;
    setActiveMacroKey(macroKey);
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
      // Observer remains authority after settle; re-apply without waiting for a new entry.
      applyResolvedRef.current();
    };

    // Prefer scrollend when available; one-shot ≤500ms fallback if it never fires.
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", clearLock, { once: true });
    }
    timeoutId = window.setTimeout(clearLock, 500);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const orderedKeys = getVisibleMacroSections().map((macro) => macro.key);
    orderedKeysRef.current = orderedKeys;
    for (const key of orderedKeys) {
      if (!ratiosRef.current.has(key)) {
        ratiosRef.current.set(key, {
          isIntersecting: false,
          ratio: 0,
          top: 0,
        });
      }
    }

    const applyResolved = () => {
      if (lockRef.current) return;
      const next = resolveActiveMacroKey(
        ratiosRef.current,
        activeRef.current,
        orderedKeysRef.current,
        readViewportMetrics()
      );
      if (next === activeRef.current) return;
      activeRef.current = next;
      setActiveMacroKey(next);
    };
    applyResolvedRef.current = applyResolved;

    if (typeof IntersectionObserver !== "function") {
      return () => {
        applyResolvedRef.current = () => {};
      };
    }

    const roots = orderedKeys
      .map((key) => document.querySelector(`[data-macro-section="${key}"]`))
      .filter(Boolean);

    if (roots.length === 0) {
      return () => {
        applyResolvedRef.current = () => {};
      };
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-macro-section");
        if (!key || !orderedKeys.includes(key)) continue;
        ratiosRef.current.set(key, {
          isIntersecting: Boolean(entry.isIntersecting),
          ratio: entry.intersectionRatio ?? 0,
          top: entry.boundingClientRect?.top ?? 0,
        });
      }
      applyResolved();
    }, MACRO_ACTIVE_OBSERVER_OPTIONS);

    for (const root of roots) {
      observer.observe(root);
    }

    applyResolved();

    return () => {
      observer.disconnect();
      applyResolvedRef.current = () => {};
    };
  }, []);

  return { activeMacroKey, selectMacro };
}
