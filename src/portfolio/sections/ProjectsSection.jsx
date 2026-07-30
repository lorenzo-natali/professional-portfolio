import ProjectDeck from "../ProjectDeck.jsx";
import { Section } from "../portfolioUi.jsx";
import { PORTFOLIO_SECTION_TITLES } from "../sectionCatalog.js";

export default function ProjectsSection({ selectedLens = "Overview" }) {
  return (
    <Section id="projects" title={PORTFOLIO_SECTION_TITLES.projects}>
      <ProjectDeck selectedLens={selectedLens} />
    </Section>
  );
}
