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

function openNavigator(props = {}) {
  render(<PortfolioSectionNavigator activeSectionId="hero" {...props} />);
  const trigger = screen.getByRole("button", { name: "Portfolio navigator" });
  fireEvent.click(trigger);
  return trigger;
}

function getSectionNavButtons() {
  const nav = screen.getByRole("navigation", { name: "Portfolio navigator" });
  return within(nav)
    .getAllByRole("button")
    .filter((button) => !/Clear .+ Role Lens/.test(button.getAttribute("aria-label") || ""));
}

describe("PortfolioSectionNavigator", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders document sections in catalog order and omits Credentials", () => {
    openNavigator();

    const items = getSectionNavButtons();
    const expected = getNavigatorSections();

    expect(items.map((item) => item.textContent.replace(/\s+/g, " ").trim())).toEqual(
      expected.map((section, index) =>
        index === 0 ? `${section.label} (current section)` : section.label
      )
    );
    expect(items).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Credentials" })).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Certifications",
      })
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Insights" })).toBeNull();

    const labels = items.map((item) =>
      item.textContent.replace(/\s*\(current section\)\s*/g, "").replace(/\s+/g, " ").trim()
    );
    expect(labels.indexOf("Certifications")).toBe(
      labels.indexOf("Expertise") + 1
    );
    expect(labels.indexOf("Experience")).toBe(
      labels.indexOf("Certifications") + 1
    );
  });

  it("starts closed and wires aria-expanded / aria-controls", () => {
    render(<PortfolioSectionNavigator />);
    const trigger = screen.getByRole("button", { name: "Portfolio navigator" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(within(trigger).getByText("Navigator")).toBeTruthy();
    expect(trigger).toHaveClass(
      "h-12",
      "min-w-12",
      "gap-2.5",
      "sm:h-[3.125rem]",
      "sm:px-3.5"
    );
    expect(trigger.querySelector("svg")).toHaveClass("h-5", "w-5");
    expect(trigger.querySelector("span")).toHaveClass("text-sm");

    const panelId = trigger.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId);
    expect(panel).toBeTruthy();
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(panel.getAttribute("aria-modal")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel.hasAttribute("hidden")).toBe(false);
    expect(
      within(screen.getByRole("navigation", { name: "Portfolio navigator" }))
        .getByText("Navigator")
    ).toBeTruthy();

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

    const trigger = openNavigator({ onSectionSelect });

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
    const trigger = openNavigator();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps entries keyboard-operable as buttons with focus styles", () => {
    openNavigator();

    const overview = screen.getByRole("button", { name: /Overview/ });
    expect(overview.tagName).toBe("BUTTON");
    expect(overview.className).toMatch(/focus-visible:ring/);
  });

  it("marks exactly one current section with aria-current and no Role Lens relevance state", () => {
    openNavigator({ activeSectionId: "experience" });

    const current = screen.getByRole("button", { name: /Experience/ });
    expect(current).toHaveAttribute("aria-current", "location");
    expect(current).toHaveAttribute("data-section-current", "true");
    expect(current.textContent).toMatch(/current section/i);

    const others = getSectionNavButtons().filter((button) => button !== current);
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
    expect(appSource).toMatch(/onClearLens=\{clearSelectedLens\}/);
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

describe("PortfolioSectionNavigator Role Lens filter control", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an inactive non-interactive filter status when no lens is active", () => {
    const onSectionSelect = vi.fn();
    const onClearLens = vi.fn();
    openNavigator({ onSectionSelect, onClearLens });

    const inactive = document.querySelector('[data-role-lens-filter="inactive"]');
    expect(inactive).toBeTruthy();
    expect(inactive.tagName).toBe("SPAN");
    expect(inactive).toHaveClass("mr-1", "h-9", "w-9");
    expect(screen.getByText("No Role Lens active")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Clear .+ Role Lens/ })
    ).toBeNull();
    expect(document.querySelectorAll("[data-role-lens-filter]")).toHaveLength(1);

    const roleLens = document.createElement("div");
    roleLens.id = "role-lens";
    roleLens.scrollIntoView = vi.fn();
    document.body.appendChild(roleLens);

    fireEvent.click(screen.getByRole("button", { name: /^Role Lens$/ }));
    expect(onSectionSelect).toHaveBeenCalledWith("role-lens");
    expect(roleLens.scrollIntoView).toHaveBeenCalled();
    expect(onClearLens).not.toHaveBeenCalled();

    roleLens.remove();
  });

  it("clears the active lens from the filter without navigating or closing", () => {
    const onSectionSelect = vi.fn();
    const onClearLens = vi.fn();
    const trigger = openNavigator({
      activeSectionId: "role-lens",
      activeLensLabel: "IT Audit",
      onSectionSelect,
      onClearLens,
    });

    const clearButton = screen.getByRole("button", {
      name: "Clear IT Audit Role Lens",
    });
    expect(clearButton).toHaveAttribute("data-role-lens-filter", "active");
    expect(clearButton).toHaveClass(
      "mr-1",
      "h-9",
      "w-9",
      "rounded-full",
      "text-cyan-200",
      "focus-visible:ring-2"
    );
    expect(clearButton).not.toHaveClass(
      "border",
      "rounded-md",
      "bg-cyan-400/10"
    );
    expect(document.querySelector('[data-role-lens-filter="inactive"]')).toBeNull();

    const roleLensNav = screen.getByRole("button", { name: /^Role Lens/ });
    expect(roleLensNav).toHaveAttribute("aria-current", "location");

    fireEvent.click(clearButton);
    expect(onClearLens).toHaveBeenCalledTimes(1);
    expect(onSectionSelect).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(roleLensNav).toHaveAttribute("aria-current", "location");
  });

  it("keeps Role Lens navigation closing the panel while active filter stays a sibling", () => {
    const onSectionSelect = vi.fn();
    const onClearLens = vi.fn();
    const trigger = openNavigator({
      activeLensLabel: "Financial Risk",
      onSectionSelect,
      onClearLens,
    });

    const roleLens = document.createElement("div");
    roleLens.id = "role-lens";
    roleLens.scrollIntoView = vi.fn();
    document.body.appendChild(roleLens);

    fireEvent.click(screen.getByRole("button", { name: /^Role Lens$/ }));
    expect(onSectionSelect).toHaveBeenCalledWith("role-lens");
    expect(roleLens.scrollIntoView).toHaveBeenCalled();
    expect(onClearLens).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    roleLens.remove();
  });

  it("navigates certifications to the existing credentials anchor", () => {
    const onSectionSelect = vi.fn();
    const trigger = openNavigator({ onSectionSelect });

    const credentials = document.createElement("div");
    credentials.id = "credentials";
    credentials.scrollIntoView = vi.fn();
    document.body.appendChild(credentials);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Certifications",
      })
    );
    expect(onSectionSelect).toHaveBeenCalledWith("credentials");
    expect(credentials.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" })
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    credentials.remove();
  });

  it("can mark certifications as the current location", () => {
    openNavigator({ activeSectionId: "credentials" });
    const current = screen.getByRole("button", {
      name: /Certifications/,
    });
    expect(current).toHaveAttribute("aria-current", "location");
    expect(current).toHaveAttribute("data-section-current", "true");
    expect(current.querySelector(".whitespace-normal")).toBeTruthy();
  });

  it("becomes inactive after reset and never shows relevance markers", () => {
    const { rerender } = render(
      <PortfolioSectionNavigator
        activeSectionId="experience"
        activeLensLabel="Technology Risk"
        onClearLens={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Portfolio navigator" }));

    expect(
      screen.getByRole("button", { name: "Clear Technology Risk Role Lens" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Experience/ })).toHaveAttribute(
      "aria-current",
      "location"
    );

    rerender(
      <PortfolioSectionNavigator
        activeSectionId="experience"
        activeLensLabel={null}
        onClearLens={() => {}}
      />
    );

    expect(
      screen.queryByRole("button", { name: /Clear .+ Role Lens/ })
    ).toBeNull();
    expect(document.querySelector('[data-role-lens-filter="inactive"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /Experience/ })).toHaveAttribute(
      "aria-current",
      "location"
    );
    expect(document.querySelector("[data-macro-lens-relevant]")).toBeNull();
    expect(document.querySelectorAll("[data-role-lens-filter]")).toHaveLength(1);
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
      "credentials",
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]);
  });
});
