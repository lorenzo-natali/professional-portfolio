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
