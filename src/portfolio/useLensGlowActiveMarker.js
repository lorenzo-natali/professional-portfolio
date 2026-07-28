import { useEffect } from "react";
import {
  clearLensGlowActiveMarker,
  syncLensGlowActiveMarker,
} from "./lensGlowActive.js";

/**
 * Step 6 — mirrors `selectedLens` onto `document.documentElement` so CSS can
 * run `lens-glow-clock` only while a non-Overview Role Lens is active.
 * No timers, listeners, or observers.
 *
 * @param {string} selectedLens
 */
export function useLensGlowActiveMarker(selectedLens) {
  useEffect(() => {
    syncLensGlowActiveMarker(selectedLens);
    return () => {
      clearLensGlowActiveMarker();
    };
  }, [selectedLens]);
}
