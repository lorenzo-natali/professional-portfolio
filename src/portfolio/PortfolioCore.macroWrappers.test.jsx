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

describe("PortfolioCore macro wrappers", () => {
  afterEach(() => {
    cleanup();
  });

  it("wraps contiguous sections without changing order or leaf markers", () => {
    const { container } = render(
      <PortfolioCore {...baseProps} enabledSections={[...PORTFOLIO_SECTION_IDS]} />
    );

    const macros = [
      ...container.querySelectorAll("[data-macro-section]"),
    ].map((el) => el.getAttribute("data-macro-section"));
    expect(macros).toEqual(["profile", "capabilities", "evidence"]);

    const leaves = [
      ...container.querySelectorAll("[data-portfolio-section]"),
    ].map((el) => el.getAttribute("data-portfolio-section"));
    expect(leaves).toEqual([...PORTFOLIO_SECTION_IDS]);

    const profile = container.querySelector('[data-macro-section="profile"]');
    expect(
      [...profile.querySelectorAll("[data-portfolio-section]")].map((el) =>
        el.getAttribute("data-portfolio-section")
      )
    ).toEqual(["hero", "role-lens"]);

    const capabilities = container.querySelector(
      '[data-macro-section="capabilities"]'
    );
    expect(
      [...capabilities.querySelectorAll("[data-portfolio-section]")].map((el) =>
        el.getAttribute("data-portfolio-section")
      )
    ).toEqual(["capabilities", "credentials"]);

    const evidence = container.querySelector('[data-macro-section="evidence"]');
    expect(
      [...evidence.querySelectorAll("[data-portfolio-section]")].map((el) =>
        el.getAttribute("data-portfolio-section")
      )
    ).toEqual(["experience", "projects", "education", "risk-radar"]);

    expect(container.querySelector('[data-macro-section="insights"]')).toBeNull();
    expect(container.querySelectorAll("[data-portfolio-section]")).toHaveLength(
      PORTFOLIO_SECTION_IDS.length
    );
  });

  it("does not hide or filter sections for Overview", () => {
    const { getByTestId } = render(
      <PortfolioCore {...baseProps} enabledSections={[...PORTFOLIO_SECTION_IDS]} />
    );

    for (const id of PORTFOLIO_SECTION_IDS) {
      expect(getByTestId(`section-${id}`)).toBeTruthy();
    }
  });

  it("omits macros with no mounted members under partial enables", () => {
    const { container } = render(
      <PortfolioCore
        {...baseProps}
        enabledSections={["experience", "projects"]}
      />
    );

    expect(
      [...container.querySelectorAll("[data-macro-section]")].map((el) =>
        el.getAttribute("data-macro-section")
      )
    ).toEqual(["evidence"]);
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

    for (const el of container.querySelectorAll("[data-macro-section]")) {
      expect(el.className).toBe("");
      expect(el.getAttribute("style")).toBeNull();
    }
  });
});
