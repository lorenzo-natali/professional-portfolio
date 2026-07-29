import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PortfolioCore from "./PortfolioCore.jsx";
import { PORTFOLIO_SECTION_IDS } from "./sectionCatalog.js";

function StubSection({ id }) {
  return <section data-testid={`section-${id}`}>{id}</section>;
}

const stubModules = Object.fromEntries(
  PORTFOLIO_SECTION_IDS.map((id) => [
    id,
    function SectionStub() {
      return <StubSection id={id} />;
    },
  ])
);

const baseProps = {
  selectedLens: "Overview",
  setSelectedLens: () => {},
  expandedExperiences: {},
  toggleExperienceDetails: () => {},
  sectionModules: stubModules,
};

describe("PortfolioCore section wrappers", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders catalog sections in order without macro grouping wrappers", () => {
    const { container } = render(
      <PortfolioCore {...baseProps} enabledSections={[...PORTFOLIO_SECTION_IDS]} />
    );

    expect(container.querySelectorAll("[data-macro-section]")).toHaveLength(0);

    const leaves = [
      ...container.querySelectorAll("[data-portfolio-section]"),
    ].map((el) => el.getAttribute("data-portfolio-section"));
    expect(leaves).toEqual([...PORTFOLIO_SECTION_IDS]);
  });

  it("does not hide or filter sections for Overview", () => {
    const { getByTestId } = render(
      <PortfolioCore {...baseProps} enabledSections={[...PORTFOLIO_SECTION_IDS]} />
    );

    for (const id of PORTFOLIO_SECTION_IDS) {
      expect(getByTestId(`section-${id}`)).toBeTruthy();
    }
  });

  it("renders only enabled sections under partial mounts", () => {
    const { container } = render(
      <PortfolioCore
        {...baseProps}
        enabledSections={["experience", "projects"]}
      />
    );

    expect(
      [...container.querySelectorAll("[data-portfolio-section]")].map((el) =>
        el.getAttribute("data-portfolio-section")
      )
    ).toEqual(["experience", "projects"]);
  });

  it("adds no layout or animation classes on wrappers", () => {
    const { container } = render(
      <PortfolioCore {...baseProps} enabledSections={[...PORTFOLIO_SECTION_IDS]} />
    );

    for (const el of container.querySelectorAll("[data-portfolio-section]")) {
      expect(el.className).toBe("");
      expect(el.getAttribute("style")).toBeNull();
    }
  });
});
