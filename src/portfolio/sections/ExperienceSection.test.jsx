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

  it("renders upcoming experiences without unpublished responsibility copy", () => {
    const profilo = experiences.find((exp) => exp.id === "experience-banca-profilo");
    expect(profilo.upcoming).toBe(true);
    expect(profilo.intro).toBeUndefined();
    expect(profilo.points).toBeUndefined();
    expect(profilo.details).toBeUndefined();

    const { container } = render(<ExperienceHarness />);
    const article = container.querySelector(
      '[data-role-lens-id="experience-banca-profilo"]'
    );
    expect(within(article).getByText(profilo.upcomingNote)).toBeTruthy();
    expect(
      within(article).getByRole("link", { name: profilo.reference.label })
    ).toBeTruthy();
    expect(within(article).queryByText("Summary")).toBeNull();
    expect(within(article).queryByText("Details")).toBeNull();
    expect(
      within(article).queryByRole("button", { name: "View details" })
    ).toBeNull();
    expect(article.textContent).not.toMatch(/Tinaba|risk-based internal audits/i);
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

  it("renders an optional external reference on upcoming cards", () => {
    const profilo = experiences.find((exp) => exp.id === "experience-banca-profilo");
    const { container } = render(<ExperienceHarness />);
    const article = container.querySelector(
      '[data-role-lens-id="experience-banca-profilo"]'
    );
    const note = within(article).getByText(profilo.upcomingNote);
    const link = within(article).getByRole("link", {
      name: profilo.reference.label,
    });
    expect(link).toHaveAttribute("href", profilo.reference.href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(
      note.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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
