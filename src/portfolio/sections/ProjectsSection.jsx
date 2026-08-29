import ProjectDeck from "../ProjectDeck.jsx";
import { Section } from "../portfolioUi.jsx";
import { PORTFOLIO_SECTION_TITLES } from "../sectionCatalog.js";

export default function ProjectsSection({ selectedLens = "Overview" }) {
  return (
    <Section id="projects" title={PORTFOLIO_SECTION_TITLES.projects}>
      <div className="p-3 sm:p-4">
        <ProjectDeck selectedLens={selectedLens} />
      </div>
    </Section>
  );
}
