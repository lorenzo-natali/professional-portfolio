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

/** Human-readable labels for diagnostics / counters. */
export const PORTFOLIO_SECTION_LABELS = Object.freeze({
  hero: "Hero",
  "role-lens": "Role Lens",
  capabilities: "Professional Capabilities",
  credentials: "Credentials",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  "risk-radar": "Risk Radar",
});

/**
 * Document table-of-contents entries for the section navigator.
 * Append future sections here (e.g. Insights) when they exist on the page.
 */
export const NAVIGATOR_SECTIONS = Object.freeze([
  Object.freeze({
    id: "hero",
    label: "Overview",
    scrollTargetId: "hero",
  }),
  Object.freeze({
    id: "role-lens",
    label: "Role Lens",
    scrollTargetId: "role-lens",
  }),
  Object.freeze({
    id: "capabilities",
    label: "Professional Capabilities",
    scrollTargetId: "capabilities",
  }),
  Object.freeze({
    id: "credentials",
    label: "Professional Certifications Roadmap",
    scrollTargetId: "credentials",
  }),
  Object.freeze({
    id: "experience",
    label: "Experience",
    scrollTargetId: "experience",
  }),
  Object.freeze({
    id: "projects",
    label: "Projects",
    scrollTargetId: "projects",
  }),
  Object.freeze({
    id: "education",
    label: "Education",
    scrollTargetId: "education",
  }),
  Object.freeze({
    id: "risk-radar",
    label: "Risk Radar",
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
  return PORTFOLIO_SECTION_LABELS[id] ?? id;
}
