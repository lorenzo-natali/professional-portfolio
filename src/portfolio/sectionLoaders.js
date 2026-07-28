import HeroSection from "./sections/HeroSection.jsx";
import RoleLens from "./RoleLens.jsx";
import CapabilitiesSection from "./sections/CapabilitiesSection.jsx";
import CredentialsSection from "./sections/CredentialsSection.jsx";
import ExperienceSection from "./sections/ExperienceSection.jsx";
import ProjectsSection from "./sections/ProjectsSection.jsx";
import EducationSection from "./sections/EducationSection.jsx";
import RiskRadar from "./RiskRadar.jsx";

/**
 * Dynamic import loaders for half/quarter bisection.
 * PortfolioCore inlines an equivalent map so its dynamic path does not evaluate
 * this module's static EAGER_SECTION_MODULES imports.
 */
export const SECTION_LOADERS = Object.freeze({
  hero: () => import("./sections/HeroSection.jsx"),
  "role-lens": () => import("./RoleLens.jsx"),
  capabilities: () => import("./sections/CapabilitiesSection.jsx"),
  credentials: () => import("./sections/CredentialsSection.jsx"),
  experience: () => import("./sections/ExperienceSection.jsx"),
  projects: () => import("./sections/ProjectsSection.jsx"),
  education: () => import("./sections/EducationSection.jsx"),
  "risk-radar": () => import("./RiskRadar.jsx"),
});

/**
 * Eager static modules for production — App passes these so the full portfolio
 * does not pay for dynamic-import waterfalls.
 * @type {Readonly<Record<string, import("react").ComponentType<any>>>}
 */
export const EAGER_SECTION_MODULES = Object.freeze({
  hero: HeroSection,
  "role-lens": RoleLens,
  capabilities: CapabilitiesSection,
  credentials: CredentialsSection,
  experience: ExperienceSection,
  projects: ProjectsSection,
  education: EducationSection,
  "risk-radar": RiskRadar,
});
