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

/**
 * Scroll to a portfolio entity marked with data-role-lens-id and apply the
 * same temporary highlight used by Portfolio Assistant signals.
 * Falls back to a section id when the entity is not mounted.
 *
 * @param {string} entityId
 * @param {{
 *   fallbackSectionId?: string,
 *   reducedMotion?: boolean,
 *   highlightMs?: number,
 * }} [options]
 * @returns {boolean}
 */
export function navigateToPortfolioEntity(entityId, options = {}) {
  if (!entityId || typeof document === "undefined") return false;

  const element = document.querySelector(`[data-role-lens-id="${entityId}"]`);
  if (!element || typeof element.scrollIntoView !== "function") {
    return options.fallbackSectionId
      ? scrollToPortfolioSection(options.fallbackSectionId, {
          reducedMotion: options.reducedMotion,
        })
      : false;
  }

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  element.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "center",
  });

  element.classList.add("assistant-signal-target");
  window.setTimeout(() => {
    element.classList.remove("assistant-signal-target");
  }, options.highlightMs ?? 1800);

  return true;
}
