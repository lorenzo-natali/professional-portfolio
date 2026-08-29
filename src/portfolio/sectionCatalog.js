/** Canonical portfolio section ids in production render order. */
export const PORTFOLIO_SECTION_IDS = Object.freeze([
  "hero",
  "role-lens",
  "capabilities",
  "credentials",
  "experience",
  "projects",
  "education",
  "risk-radar",
]);

/** Canonical visible titles for portfolio sections and diagnostics. */
export const PORTFOLIO_SECTION_TITLES = Object.freeze({
  hero: "Lorenzo Natali",
  "role-lens": "Role Lens",
  capabilities: "Expertise",
  credentials: "Certifications",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  "risk-radar": "Professional Overview",
});

/** Backwards-compatible diagnostic label export. */
export const PORTFOLIO_SECTION_LABELS = PORTFOLIO_SECTION_TITLES;

/**
 * Document table-of-contents entries for the section navigator.
 * Append future sections here (e.g. Insights) when they exist on the page.
 */
export const NAVIGATOR_SECTIONS = Object.freeze([
  Object.freeze({
    id: "hero",
    // Distinct from Professional Overview ("Overview") — hero is page top, not the Snapshot section.
    label: "Home",
    scrollTargetId: "hero",
  }),
  Object.freeze({
    id: "role-lens",
    label: PORTFOLIO_SECTION_TITLES["role-lens"],
    scrollTargetId: "role-lens",
  }),
  Object.freeze({
    id: "capabilities",
    label: PORTFOLIO_SECTION_TITLES.capabilities,
    scrollTargetId: "capabilities",
  }),
  Object.freeze({
    id: "credentials",
    label: PORTFOLIO_SECTION_TITLES.credentials,
    scrollTargetId: "credentials",
  }),
  Object.freeze({
    id: "experience",
    label: PORTFOLIO_SECTION_TITLES.experience,
    scrollTargetId: "experience",
  }),
  Object.freeze({
    id: "projects",
    label: PORTFOLIO_SECTION_TITLES.projects,
    scrollTargetId: "projects",
  }),
  Object.freeze({
    id: "education",
    label: PORTFOLIO_SECTION_TITLES.education,
    scrollTargetId: "education",
  }),
  Object.freeze({
    id: "risk-radar",
    label: "Overview",
    scrollTargetId: "risk-radar",
  }),
]);

/**
 * @returns {readonly typeof NAVIGATOR_SECTIONS[number][]}
 */
export function getNavigatorSections() {
  return NAVIGATOR_SECTIONS;
}

/**
 * SiteDiag bisection membership maps.
 * Parent wires modes; this catalog only defines which sections each half/quarter includes.
 */
export const SITE_DIAG_SECTION_SETS = Object.freeze({
  "full-top-half": Object.freeze([
    "hero",
    "role-lens",
    "capabilities",
    "credentials",
  ]),
  "full-bottom-half": Object.freeze([
    "experience",
    "projects",
    "education",
    "risk-radar",
  ]),
  "full-q1": Object.freeze(["hero", "role-lens"]),
  "full-q2": Object.freeze(["capabilities", "credentials"]),
  "full-q3": Object.freeze(["experience", "projects"]),
  "full-q4": Object.freeze(["education", "risk-radar"]),
});

/**
 * @param {string | null | undefined} mode
 * @returns {readonly string[] | null} section ids for a known bisection mode, else null
 */
export function getSectionsForSiteDiagMode(mode) {
  if (!mode || typeof mode !== "string") return null;
  return SITE_DIAG_SECTION_SETS[mode] ?? null;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function getSectionLabel(id) {
  return PORTFOLIO_SECTION_TITLES[id] ?? id;
}
