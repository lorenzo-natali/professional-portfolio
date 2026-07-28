import { isOverviewLens } from "./portfolioLens.js";

/** Step 6 — root marker enabling CSS `lens-glow-clock` only for non-Overview lenses. */
export const LENS_GLOW_ACTIVE_ATTR = "data-lens-glow-active";
export const LENS_GLOW_ACTIVE_VALUE = "true";

/**
 * Syncs the root glow marker from Role Lens state (single source of truth).
 * Overview → remove attribute; any other lens → set `data-lens-glow-active="true"`.
 *
 * @param {string} selectedLens
 * @param {Element | null | undefined} [root]
 */
export function syncLensGlowActiveMarker(
  selectedLens,
  root = typeof document !== "undefined" ? document.documentElement : null,
) {
  if (!root) return;
  if (isOverviewLens(selectedLens)) {
    root.removeAttribute(LENS_GLOW_ACTIVE_ATTR);
    return;
  }
  root.setAttribute(LENS_GLOW_ACTIVE_ATTR, LENS_GLOW_ACTIVE_VALUE);
}

/**
 * @param {Element | null | undefined} [root]
 */
export function clearLensGlowActiveMarker(
  root = typeof document !== "undefined" ? document.documentElement : null,
) {
  root?.removeAttribute(LENS_GLOW_ACTIVE_ATTR);
}

/**
 * @param {Element | null | undefined} [root]
 */
export function isLensGlowActiveMarkerPresent(
  root = typeof document !== "undefined" ? document.documentElement : null,
) {
  return root?.getAttribute(LENS_GLOW_ACTIVE_ATTR) === LENS_GLOW_ACTIVE_VALUE;
}
