import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_SECTION_IDS,
  PORTFOLIO_SECTION_TITLES,
  getNavigatorSections,
} from "./sectionCatalog.js";

describe("sectionCatalog titles and navigation", () => {
  it("keeps the approved section order and visible titles", () => {
    expect(PORTFOLIO_SECTION_IDS).toEqual([
      "hero",
      "role-lens",
      "capabilities",
      "credentials",
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]);

    expect(PORTFOLIO_SECTION_IDS.map((id) => PORTFOLIO_SECTION_TITLES[id])).toEqual([
      "Lorenzo Natali",
      "Role Lens",
      "Expertise",
      "Certifications",
      "Experience",
      "Projects",
      "Education",
      "Professional Snapshot",
    ]);
  });

  it("keeps the approved navigator labels mapped to unchanged targets", () => {
    const sections = getNavigatorSections();

    expect(sections.map(({ label }) => label)).toEqual([
      "Overview",
      "Role Lens",
      "Expertise",
      "Certifications",
      "Experience",
      "Projects",
      "Education",
      "Snapshot",
    ]);
    expect(sections.map(({ id }) => id)).toEqual(PORTFOLIO_SECTION_IDS);
    expect(sections.map(({ scrollTargetId }) => scrollTargetId)).toEqual(
      PORTFOLIO_SECTION_IDS
    );
  });
});
