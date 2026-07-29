import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { getNavigatorSections } from "./sectionCatalog.js";
import PortfolioSectionNavigator, {
  prefersReducedMotion,
  scrollToPortfolioSection,
} from "./PortfolioSectionNavigator.jsx";

const portfolioDir = path.dirname(fileURLToPath(import.meta.url));
const navigatorSource = readFileSync(
  path.join(portfolioDir, "PortfolioSectionNavigator.jsx"),
  "utf8"
);
const appSource = readFileSync(path.join(portfolioDir, "..", "App.jsx"), "utf8");

describe("PortfolioSectionNavigator", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders document sections in catalog order and omits Credentials", () => {
    render(<PortfolioSectionNavigator activeSectionId="hero" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const nav = screen.getByRole("navigation", { name: "Portfolio sections" });
    const items = within(nav).getAllByRole("button");
    const expected = getNavigatorSections();

    expect(items.map((item) => item.textContent.replace(/\s+/g, " ").trim())).toEqual(
      expected.map((section, index) =>
        index === 0 ? `${section.label} (current section)` : section.label
      )
    );
    expect(items).toHaveLength(7);
    expect(screen.queryByRole("button", { name: "Credentials" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insights" })).toBeNull();
  });

  it("starts closed and wires aria-expanded / aria-controls", () => {
    render(<PortfolioSectionNavigator />);
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    const panelId = trigger.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId);
    expect(panel).toBeTruthy();
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(panel.getAttribute("aria-modal")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel.hasAttribute("hidden")).toBe(false);

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  it("navigates to section targets, closes, and uses motion-aware scroll", () => {
    const scrollIntoView = vi.fn();
    const getElement = vi.fn((id) => ({ id, scrollIntoView }));
    const onSectionSelect = vi.fn();

    expect(
      scrollToPortfolioSection("capabilities", {
        reducedMotion: false,
        getElement,
      })
    ).toBe(true);
    expect(getElement).toHaveBeenCalledWith("capabilities");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    scrollIntoView.mockClear();
    expect(
      scrollToPortfolioSection("experience", {
        reducedMotion: true,
        getElement,
      })
    ).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });

    render(
      <PortfolioSectionNavigator
        activeSectionId="hero"
        onSectionSelect={onSectionSelect}
      />
    );
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    fireEvent.click(trigger);

    const hero = document.createElement("div");
    hero.id = "hero";
    hero.scrollIntoView = vi.fn();
    document.body.appendChild(hero);

    fireEvent.click(screen.getByRole("button", { name: /Overview/ }));
    expect(onSectionSelect).toHaveBeenCalledWith("hero");
    expect(hero.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" })
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);

    hero.remove();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<PortfolioSectionNavigator activeSectionId="hero" />);
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps entries keyboard-operable as buttons with focus styles", () => {
    render(<PortfolioSectionNavigator activeSectionId="hero" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const overview = screen.getByRole("button", { name: /Overview/ });
    expect(overview.tagName).toBe("BUTTON");
    expect(overview.className).toMatch(/focus-visible:ring/);
  });

  it("marks exactly one current section with aria-current and no Role Lens state", () => {
    render(<PortfolioSectionNavigator activeSectionId="experience" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const current = screen.getByRole("button", { name: /Experience/ });
    expect(current).toHaveAttribute("aria-current", "location");
    expect(current).toHaveAttribute("data-section-current", "true");
    expect(current.textContent).toMatch(/current section/i);

    const others = within(
      screen.getByRole("navigation", { name: "Portfolio sections" })
    )
      .getAllByRole("button")
      .filter((button) => button !== current);
    for (const button of others) {
      expect(button).not.toHaveAttribute("aria-current");
      expect(button).not.toHaveAttribute("data-section-current");
    }

    expect(document.querySelector("[data-macro-lens-relevant]")).toBeNull();
    expect(document.querySelector("[data-macro-relevance-marker]")).toBeNull();
    expect(screen.queryByText(/relevant to the selected role lens/i)).toBeNull();
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("is decoupled from Role Lens derivation and relevance pipelines", () => {
    expect(appSource).not.toMatch(/deriveMacroLensRelevance/);
    expect(appSource).not.toMatch(/macroLensRelevance/);
    expect(appSource).toMatch(/useActivePortfolioSection/);
    expect(navigatorSource).not.toMatch(/deriveMacroLensRelevance/);
    expect(navigatorSource).not.toMatch(/lensRelevance/);
    expect(navigatorSource).not.toMatch(/macroLensRelevance/);
    expect(navigatorSource).not.toMatch(/data-macro-lens-relevant/);
    expect(navigatorSource).not.toMatch(/IntersectionObserver/);
    expect(navigatorSource).not.toMatch(/requestAnimationFrame/);
    expect(navigatorSource).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(navigatorSource).not.toMatch(/aria-live/);
  });
});

describe("prefersReducedMotion / scrollToPortfolioSection helpers", () => {
  it("reads reduced-motion media safely", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
    expect(prefersReducedMotion(null)).toBe(false);
  });

  it("fails safely when the target is missing", () => {
    expect(
      scrollToPortfolioSection("missing", {
        getElement: () => null,
      })
    ).toBe(false);
  });

  it("uses approved navigator scroll targets", () => {
    expect(getNavigatorSections().map((section) => section.scrollTargetId)).toEqual([
      "hero",
      "role-lens",
      "capabilities",
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]);
  });
});
