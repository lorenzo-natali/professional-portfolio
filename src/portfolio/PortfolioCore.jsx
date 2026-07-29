import { useEffect, useState } from "react";
import { PORTFOLIO_SECTION_IDS } from "./sectionCatalog.js";

/**
 * Local loaders (not imported from sectionLoaders.js) so the dynamic path does
 * not pull EAGER_SECTION_MODULES' static imports and load every section.
 */
const SECTION_LOADERS = Object.freeze({
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
 * Renders enabled portfolio sections in catalog order.
 *
 * Production passes `sectionModules` (eager static imports). Diagnostic boots
 * omit it so only `enabledSections` are dynamically imported.
 *
 * @param {{
 *   enabledSections: string[],
 *   selectedLens: string,
 *   setSelectedLens: (lens: string) => void,
 *   expandedExperiences: Record<string, boolean>,
 *   toggleExperienceDetails: (id: string) => void,
 *   sidebarSlot?: import("react").ReactNode,
 *   sectionModules?: Record<string, import("react").ComponentType<any>> | null,
 * }} props
 */
export default function PortfolioCore({
  enabledSections,
  selectedLens,
  setSelectedLens,
  expandedExperiences,
  toggleExperienceDetails,
  sidebarSlot = null,
  sectionModules = null,
}) {
  const orderedIds = PORTFOLIO_SECTION_IDS.filter((id) =>
    enabledSections.includes(id)
  );

  const [dynamicModules, setDynamicModules] = useState(
    /** @type {Record<string, import("react").ComponentType<any>> | null} */ (
      null
    )
  );
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (sectionModules) {
      setDynamicModules(null);
      setLoadError(null);
      return undefined;
    }

    let cancelled = false;
    setLoadError(null);

    Promise.all(
      orderedIds.map(async (id) => {
        const loader = SECTION_LOADERS[id];
        if (!loader) {
          throw new Error(`Unknown portfolio section: ${id}`);
        }
        const mod = await loader();
        return [id, mod.default];
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setDynamicModules(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error?.message ?? String(error));
      });

    return () => {
      cancelled = true;
    };
    // orderedIds content drives which modules to fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionModules, orderedIds.join("|")]);

  const modules = sectionModules ?? dynamicModules;

  if (!sectionModules && loadError) {
    return (
      <div className="px-5 py-16 text-sm text-rose-300" role="alert">
        Failed to load portfolio sections: {loadError}
      </div>
    );
  }

  if (!modules) {
    return null;
  }

  return (
    <>
      {orderedIds.map((id) => {
        const SectionComponent = modules[id];
        if (!SectionComponent) return null;

        const sectionProps = {
          selectedLens,
          setSelectedLens,
          onSelectLens: setSelectedLens,
          expandedExperiences,
          toggleExperienceDetails,
          sidebarSlot: id === "hero" ? sidebarSlot : undefined,
        };

        return (
          <div key={id} data-portfolio-section={id}>
            <SectionComponent {...sectionProps} />
          </div>
        );
      })}
    </>
  );
}
