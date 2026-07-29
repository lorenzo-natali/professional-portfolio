import { lensRelevance } from "./portfolioData.js";
import { isOverviewLens } from "./portfolioLens.js";
import { MACRO_SECTIONS } from "./macroSectionRegistry.js";

/**
 * Derive boolean Role Lens relevance per macro-section from `lensRelevance`.
 * Does not copy entity ID lists; uses registry `markerGroups` only.
 * `streamItems` never contributes (element-only ticker highlighting).
 *
 * @param {string | null | undefined} selectedLens
 * @param {typeof lensRelevance} [relevanceMap]
 * @returns {Readonly<Record<string, boolean>>}
 */
export function deriveMacroLensRelevance(
  selectedLens,
  relevanceMap = lensRelevance
) {
  /** @type {Record<string, boolean>} */
  const result = {};
  for (const macro of MACRO_SECTIONS) {
    result[macro.key] = false;
  }

  if (
    selectedLens == null ||
    selectedLens === "" ||
    isOverviewLens(selectedLens)
  ) {
    return Object.freeze(result);
  }

  if (!relevanceMap || typeof relevanceMap !== "object") {
    return Object.freeze(result);
  }

  const groups = relevanceMap[selectedLens];
  if (!groups || typeof groups !== "object") {
    return Object.freeze(result);
  }

  for (const macro of MACRO_SECTIONS) {
    if (!macro.visible) {
      result[macro.key] = false;
      continue;
    }

    result[macro.key] = macro.markerGroups.some((groupName) => {
      const values = groups[groupName];
      return Array.isArray(values) && values.length > 0;
    });
  }

  return Object.freeze(result);
}
