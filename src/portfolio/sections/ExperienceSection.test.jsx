import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { experiences } from "../portfolioData.js";
import ExperienceSection from "./ExperienceSection.jsx";

vi.mock("../portfolioSectionNavigation.js", () => ({
  prefersReducedMotion: () => false,
}));

function ExperienceHarness({ selectedLens = "Overview" } = {}) {
  const [expandedExperiences, setExpandedExperiences] = useState({});
  const toggleExperienceDetails = (experienceId) => {
    setExpandedExperiences((current) => {
      if (current[experienceId]) return {};
      return { [experienceId]: true };
    });
  };

  return (
    <ExperienceSection
      selectedLens={selectedLens}
      expandedExperiences={expandedExperiences}
      toggleExperienceDetails={toggleExperienceDetails}
    />
  );
}

describe("ExperienceSection bounded viewport", () => {
  beforeEach(() => {
    class MockIO {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIO);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders Banca Profilo first as the newest experience", () => {
    render(<ExperienceHarness />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0].textContent).toBe("IT Audit Specialist");
    expect(screen.getByText("Banca Profilo · Milan")).toBeTruthy();
    expect(screen.getByText("September 2026 – Present")).toBeTruthy();
  });

  it("renders Banca Profilo as an active experience with summary and expandable details", () => {
    const profilo = experiences.find((exp) => exp.id === "experience-banca-profilo");
    const boc = experiences.find((exp) => exp.id === "experience-boc");
    expect(experiences[0].id).toBe("experience-banca-profilo");
    expect(experiences[1].id).toBe("experience-boc");
    expect(profilo.upcoming).toBeFalsy();
    expect(profilo.upcomingNote).toBeUndefined();
    expect(profilo.points).toEqual([
      "Performing risk-based IT audits focused on ICT governance, technology risk management and internal control effectiveness.",
      "Conducting IT audit engagements on DORA Pillar I, as well as ICT change and incident management processes, assessing regulatory compliance, governance arrangements and digital operational resilience.",
      "Executing ICT outsourcing audits within the Bank's fiduciary business, assessing third-party technology risks, outsourcing governance and associated internal controls.",
      "Contributing to the development of the Bank's AI Policy, drawing on the EU AI Act, NIST AI RMF and international AI governance standards.",
    ]);
    expect(profilo.details[0]).toBe(
      "Performing risk-based IT audit activities covering ICT governance, technology risk management and the design and effectiveness of internal controls within a regulated banking environment."
    );
    expect(profilo.details.slice(1, 4)).toEqual([
      "Conducting audit engagements on DORA Pillar I, assessing ICT risk management governance, regulatory requirements, control frameworks and their implementation within the Bank.",
      "Assessing ICT change management and incident management processes through risk-owner interviews, documentation review and control testing, evaluating their alignment with digital operational resilience requirements.",
      "Executing ICT outsourcing audits within the Bank's fiduciary business, assessing third-party technology risks, outsourcing governance and related internal controls.",
    ]);
    expect(profilo.details).toHaveLength(8);
    expect(profilo.details[4]).toMatch(/Bank's internal AI Policy/);
    expect(boc.role).toBe("Internal Auditor");
    expect(boc.company).toBe("Bank of China · Milan · 中国银行米兰分行");
    expect(boc.period).toBe("Oct 2025 – Sep 2026");
    expect(boc.points).toHaveLength(4);
    expect(boc.details).toHaveLength(7);

    const { container } = render(<ExperienceHarness />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0].textContent).toBe("IT Audit Specialist");
    expect(headings[1].textContent).toBe("Internal Auditor");

    const article = container.querySelector(
      '[data-role-lens-id="experience-banca-profilo"]'
    );
    expect(within(article).getByText(profilo.intro)).toBeTruthy();
    expect(within(article).queryByText(/I am joining Banca Profilo/)).toBeNull();
    expect(within(article).getByText("Summary")).toBeTruthy();
    for (const point of profilo.points) {
      expect(within(article).getByText(point)).toBeTruthy();
    }
    expect(within(article).queryByRole("link", { name: /Industrial Plan/i })).toBeNull();
    expect(article.innerHTML).not.toMatch(/bancaprofilo\.it/);

    fireEvent.click(within(article).getByRole("button", { name: "View details" }));
    expect(within(article).getByText("Details")).toBeTruthy();
    for (const detail of profilo.details) {
      expect(within(article).getByText(detail)).toBeTruthy();
    }
    const bocArticle = container.querySelector('[data-role-lens-id="experience-boc"]');
    expect(within(bocArticle).getByText(boc.points[0])).toBeTruthy();
    expect(within(bocArticle).getByText("Oct 2025 – Sep 2026")).toBeTruthy();
    expect(within(bocArticle).queryByText(boc.details[0])).toBeNull();
  });

  it("keeps optional intro visible for non-upcoming experiences when expanded", async () => {
    const withIntro = experiences.find((exp) => exp.intro && !exp.upcoming);
    if (!withIntro) {
      // No non-upcoming intro in current data; TopLife uses note instead.
      const withNote = experiences.find((exp) => exp.note && !exp.upcoming);
      expect(withNote?.note).toBeTruthy();
      const { container } = render(<ExperienceHarness />);
      const article = container.querySelector(
        `[data-role-lens-id="${withNote.id}"]`
      );
      expect(within(article).getByText(withNote.note)).toBeTruthy();
      return;
    }

    const { container } = render(<ExperienceHarness />);
    const article = container.querySelector(
      `[data-role-lens-id="${withIntro.id}"]`
    );
    expect(within(article).getByText(withIntro.intro)).toBeTruthy();
  });

  it("renders a single bounded experience list viewport with all roles", () => {
    const { container } = render(<ExperienceHarness />);

    const viewport = container.querySelector("[data-experience-list-viewport]");
    expect(viewport).toBeTruthy();
    expect(viewport.className).toMatch(/experience-list-viewport/);
    expect(container.querySelectorAll("[data-experience-list-viewport]")).toHaveLength(
      1
    );
    expect(
      viewport.querySelector(".experience-list-content")
    ).toBeTruthy();

    for (const exp of experiences) {
      expect(screen.getByRole("heading", { name: exp.role })).toBeTruthy();
      expect(
        container.querySelector(`[data-role-lens-id="${exp.id}"]`)
      ).toBeTruthy();
    }
  });

  it("keeps internal breathing room for Role Lens glow and first-card hover transform", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const css = readFileSync(resolve("src/index.css"), "utf8");

    expect(css).toMatch(
      /\.experience-list-content\s*\{[^}]*padding-top:\s*1\.25rem/s
    );
    expect(css).toMatch(
      /\.experience-list-content\s*\{[^}]*padding-right:\s*1\.25rem/s
    );
    expect(css).toMatch(
      /\.experience-list-viewport\s*\{[^}]*margin-top:\s*-1\.25rem/s
    );
  });

  it("keeps accordion expansion inside the viewport and preserves all roles in the DOM", async () => {
    const { container } = render(<ExperienceHarness />);
    const expandable = experiences.filter(
      (exp) =>
        !exp.upcoming &&
        Array.isArray(exp.details) &&
        exp.details.length > 0
    );
    expect(expandable.length).toBeGreaterThanOrEqual(2);

    const first = expandable[0];
    const second = expandable[1];
    const firstArticle = container.querySelector(
      `[data-role-lens-id="${first.id}"]`
    );
    const secondArticle = container.querySelector(
      `[data-role-lens-id="${second.id}"]`
    );

    fireEvent.click(
      within(firstArticle).getByRole("button", { name: "View details" })
    );
    expect(
      within(firstArticle).getByRole("button", { name: "Show less" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(firstArticle).getByText("Details")).toBeTruthy();
    expect(
      within(firstArticle).queryByRole("button", { name: "View details" })
    ).toBeNull();

    fireEvent.click(
      within(secondArticle).getByRole("button", { name: "View details" })
    );

    await waitFor(() => {
      expect(
        within(secondArticle).getByRole("button", { name: "Show less" })
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        within(firstArticle).queryByRole("button", { name: "Show less" })
      ).toBeNull();
      expect(
        within(firstArticle).getByRole("button", { name: "View details" })
      ).toHaveAttribute("aria-expanded", "false");
    });

    for (const exp of experiences) {
      expect(screen.getByRole("heading", { name: exp.role })).toBeTruthy();
    }

    expect(container.querySelectorAll("[data-experience-list-viewport]")).toHaveLength(
      1
    );
    expect(firstArticle.closest("[data-experience-list-viewport]")).toBeTruthy();
    expect(secondArticle.closest("[data-experience-list-viewport]")).toBeTruthy();
  });

  it("exposes accessibility state for expand and collapse controls", () => {
    const { container } = render(<ExperienceHarness />);
    const first = experiences.find(
      (exp) =>
        !exp.upcoming &&
        Array.isArray(exp.details) &&
        exp.details.length > 0
    );
    const article = container.querySelector(`[data-role-lens-id="${first.id}"]`);

    const openButton = within(article).getByRole("button", {
      name: "View details",
    });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(openButton).toHaveAttribute("aria-controls", `${first.id}-details`);

    fireEvent.click(openButton);
    const closeButton = within(article).getByRole("button", {
      name: "Show less",
    });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");
    expect(closeButton).toHaveAttribute("aria-controls", `${first.id}-details`);
    expect(article.querySelector(`#${first.id}-details`)).toBeTruthy();
  });

  it("preserves Role Lens surface classes on experience cards", () => {
    const { container } = render(
      <ExperienceHarness selectedLens="IT Audit" />
    );
    const profilo = container.querySelector(
      '[data-role-lens-id="experience-banca-profilo"]'
    );
    const boc = container.querySelector('[data-role-lens-id="experience-boc"]');
    expect(profilo).toBeTruthy();
    expect(boc).toBeTruthy();
    expect(profilo.innerHTML).toMatch(
      /role-lens-highlight|opacity|border-cyan|border-violet/
    );
    expect(boc.innerHTML).toMatch(/role-lens-highlight|opacity|border-cyan|border-violet/);
  });

  it("does not create nested scroll containers inside experience cards", () => {
    const { container } = render(<ExperienceHarness />);
    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[0]);

    const cards = container.querySelectorAll("[data-role-lens-id]");
    for (const card of cards) {
      expect(card.querySelector("[data-experience-list-viewport]")).toBeNull();
      expect(card.className).not.toMatch(/overflow-y-auto/);
    }
    expect(container.querySelectorAll("[data-experience-list-viewport]")).toHaveLength(
      1
    );
  });
});
