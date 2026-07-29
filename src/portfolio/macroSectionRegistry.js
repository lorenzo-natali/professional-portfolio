import { PORTFOLIO_SECTION_IDS } from "./sectionCatalog.js";

/**
 * Canonical macro-section registry for navigation foundations (Phase 1).
 * Working labels only — membership and scroll targets are the contract.
 *
 * `markerGroups` names lensRelevance groups that may light a macro marker.
 * `streamItems` is intentionally omitted (element-level ticker highlighting only).
 */
export const ELEMENT_ONLY_LENS_GROUPS = Object.freeze(["streamItems"]);

export const MACRO_SECTIONS = Object.freeze([
  Object.freeze({
    key: "profile",
    label: "Profile",
    visible: true,
    scrollTargetId: "hero",
    memberSectionIds: Object.freeze(["hero", "role-lens"]),
    markerGroups: Object.freeze([]),
    order: 0,
  }),
  Object.freeze({
    key: "capabilities",
    label: "Capabilities",
    visible: true,
    scrollTargetId: "capabilities",
    memberSectionIds: Object.freeze(["capabilities", "credentials"]),
    markerGroups: Object.freeze(["capabilities", "credentials"]),
    order: 1,
  }),
  Object.freeze({
    key: "evidence",
    label: "Evidence",
    visible: true,
    scrollTargetId: "experience",
    memberSectionIds: Object.freeze([
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]),
    markerGroups: Object.freeze([
      "experiences",
      "projects",
      "education",
      "radar",
    ]),
    order: 2,
  }),
  Object.freeze({
    key: "insights",
    label: "Insights",
    visible: false,
    scrollTargetId: null,
    memberSectionIds: Object.freeze([]),
    markerGroups: Object.freeze([]),
    order: 3,
  }),
]);

const SECTION_TO_MACRO = Object.freeze(
  Object.fromEntries(
    MACRO_SECTIONS.flatMap((macro) =>
      macro.memberSectionIds.map((sectionId) => [sectionId, macro.key])
    )
  )
);

/**
 * @returns {readonly typeof MACRO_SECTIONS[number][]}
 */
export function getVisibleMacroSections() {
  return MACRO_SECTIONS.filter((macro) => macro.visible);
}

/**
 * @param {string} key
 * @returns {typeof MACRO_SECTIONS[number] | undefined}
 */
export function getMacroSectionByKey(key) {
  return MACRO_SECTIONS.find((macro) => macro.key === key);
}

/**
 * @param {string} sectionId
 * @returns {string | undefined}
 */
export function getMacroKeyForSectionId(sectionId) {
  return SECTION_TO_MACRO[sectionId];
}

/**
 * Group enabled catalog section ids into visible macros, preserving catalog order.
 * Macros with no mounted members are omitted (SiteDiag partial mounts).
 *
 * @param {readonly string[]} orderedSectionIds
 * @returns {{ key: string, scrollTargetId: string | null, memberSectionIds: string[] }[]}
 */
export function groupSectionIdsByMacro(orderedSectionIds) {
  const enabled = new Set(orderedSectionIds);
  /** @type {{ key: string, scrollTargetId: string | null, memberSectionIds: string[] }[]} */
  const groups = [];

  for (const macro of getVisibleMacroSections()) {
    const memberSectionIds = macro.memberSectionIds.filter((id) =>
      enabled.has(id)
    );
    if (memberSectionIds.length === 0) continue;
    groups.push({
      key: macro.key,
      scrollTargetId: macro.scrollTargetId,
      memberSectionIds,
    });
  }

  return groups;
}

/**
 * Assert registry membership covers the catalog exactly once (dev/test aid).
 * @returns {boolean}
 */
export function registryCoversCatalogExactly() {
  const visibleMembers = getVisibleMacroSections().flatMap(
    (macro) => macro.memberSectionIds
  );
  if (visibleMembers.length !== PORTFOLIO_SECTION_IDS.length) return false;
  if (new Set(visibleMembers).size !== visibleMembers.length) return false;
  return PORTFOLIO_SECTION_IDS.every((id) => visibleMembers.includes(id));
}
