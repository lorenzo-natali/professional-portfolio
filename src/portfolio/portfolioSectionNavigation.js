/**
 * @param {Pick<MediaQueryList, "matches"> | null | undefined} [media]
 * @returns {boolean}
 */
export function prefersReducedMotion(
  media = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)")
    : null
) {
  return Boolean(media?.matches);
}

/**
 * Scroll to a document section. No history mutation, no flash, no rAF.
 *
 * @param {string} scrollTargetId
 * @param {{
 *   reducedMotion?: boolean,
 *   getElement?: (id: string) => Element | null,
 * }} [options]
 * @returns {boolean}
 */
export function scrollToPortfolioSection(scrollTargetId, options = {}) {
  if (!scrollTargetId) return false;
  const getElement =
    options.getElement ?? ((id) => document.getElementById(id));
  const element = getElement(scrollTargetId);
  if (!element || typeof element.scrollIntoView !== "function") return false;

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();

  element.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
  return true;
}
