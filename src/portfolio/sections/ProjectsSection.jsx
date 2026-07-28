import ProjectDeck from "../ProjectDeck.jsx";
import { Section } from "../portfolioUi.jsx";

export default function ProjectsSection({ selectedLens = "Overview" }) {
  return (
    <Section id="projects" title="Projects & Applied Work">
      <ProjectDeck selectedLens={selectedLens} />
    </Section>
  );
}
