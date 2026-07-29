import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { deriveMacroLensRelevance } from "./deriveMacroLensRelevance.js";
import { getVisibleMacroSections } from "./macroSectionRegistry.js";
import { lensOptions } from "./portfolioLens.js";
import PortfolioSectionNavigator, {
  MACRO_LENS_RELEVANT_LABEL,
  prefersReducedMotion,
  scrollToMacroSection,
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

  it("renders exactly the visible registry macros in order and omits Insights", () => {
    render(<PortfolioSectionNavigator activeMacroKey="profile" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const nav = screen.getByRole("navigation", { name: "Portfolio sections" });
    const items = within(nav).getAllByRole("button");
    const visible = getVisibleMacroSections();

    expect(items.map((item) => item.textContent.replace(/\s+/g, " ").trim())).toEqual(
      visible.map((macro, index) =>
        index === 0 ? `${macro.label} (current section)` : macro.label
      )
    );
    expect(items).toHaveLength(3);
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

  it("navigates to registry targets, closes, and uses motion-aware scroll", () => {
    const scrollIntoView = vi.fn();
    const getElement = vi.fn((id) => ({ id, scrollIntoView }));
    const onActiveMacroSelect = vi.fn();

    expect(
      scrollToMacroSection("capabilities", {
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
      scrollToMacroSection("experience", {
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
        activeMacroKey="profile"
        onActiveMacroSelect={onActiveMacroSelect}
      />
    );
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    fireEvent.click(trigger);

    const hero = document.createElement("div");
    hero.id = "hero";
    hero.scrollIntoView = vi.fn();
    document.body.appendChild(hero);

    fireEvent.click(screen.getByRole("button", { name: /Profile/ }));
    expect(onActiveMacroSelect).toHaveBeenCalledWith("profile");
    expect(hero.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" })
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);

    hero.remove();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<PortfolioSectionNavigator activeMacroKey="profile" />);
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps entries keyboard-operable as buttons with focus styles", () => {
    render(<PortfolioSectionNavigator activeMacroKey="profile" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const profile = screen.getByRole("button", { name: /Profile/ });
    expect(profile.tagName).toBe("BUTTON");
    expect(profile.className).toMatch(/focus-visible:ring/);
  });

  it("marks exactly one current macro with aria-current and a static indicator", () => {
    render(<PortfolioSectionNavigator activeMacroKey="capabilities" />);
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const current = screen.getByRole("button", { name: /Capabilities/ });
    expect(current).toHaveAttribute("aria-current", "location");
    expect(current).toHaveAttribute("data-macro-current", "true");
    expect(current.textContent).toMatch(/current section/i);

    const others = [
      screen.getByRole("button", { name: /^Profile$/ }),
      screen.getByRole("button", { name: /^Evidence$/ }),
    ];
    for (const button of others) {
      expect(button).not.toHaveAttribute("aria-current");
      expect(button).not.toHaveAttribute("data-macro-current");
    }

    expect(screen.queryByText(MACRO_LENS_RELEVANT_LABEL)).toBeNull();
    expect(
      document.querySelector("[data-macro-lens-relevant]")
    ).toBeNull();
  });
});

describe("PortfolioSectionNavigator Role Lens relevance (Phase 4)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("receives derived relevance from App and does not recreate lens mappings", () => {
    expect(appSource).toMatch(
      /import\s*\{\s*deriveMacroLensRelevance\s*\}\s*from\s*["'].*deriveMacroLensRelevance\.js["']/
    );
    expect(appSource).toMatch(
      /deriveMacroLensRelevance\(\s*selectedLens\s*\)/
    );
    expect(appSource).toMatch(/macroLensRelevance=\{macroLensRelevance\}/);

    expect(navigatorSource).not.toMatch(/deriveMacroLensRelevance/);
    expect(navigatorSource).not.toMatch(/lensRelevance/);
    expect(navigatorSource).not.toMatch(/portfolioData/);
    expect(navigatorSource).not.toMatch(/IntersectionObserver/);
    expect(navigatorSource).not.toMatch(/requestAnimationFrame/);
    expect(navigatorSource).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(navigatorSource).not.toMatch(/setInterval|setTimeout/);
    expect(navigatorSource).not.toMatch(/aria-live/);
  });

  it("shows no relevance markers in Overview while keeping current state", () => {
    const relevance = deriveMacroLensRelevance("Overview");
    render(
      <PortfolioSectionNavigator
        activeMacroKey="profile"
        macroLensRelevance={relevance}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    expect(document.querySelectorAll("[data-macro-lens-relevant]")).toHaveLength(
      0
    );
    expect(document.querySelectorAll("[data-macro-relevance-marker]")).toHaveLength(
      0
    );
    expect(screen.queryByText(MACRO_LENS_RELEVANT_LABEL)).toBeNull();
    expect(screen.getByRole("button", { name: /Profile/ })).toHaveAttribute(
      "aria-current",
      "location"
    );
  });

  it("clears relevance markers immediately when resetting to Overview", () => {
    const { rerender } = render(
      <PortfolioSectionNavigator
        activeMacroKey="capabilities"
        macroLensRelevance={deriveMacroLensRelevance("AI Governance")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));
    expect(document.querySelectorAll("[data-macro-lens-relevant]").length).toBeGreaterThan(
      0
    );

    rerender(
      <PortfolioSectionNavigator
        activeMacroKey="capabilities"
        macroLensRelevance={deriveMacroLensRelevance("Overview")}
      />
    );

    expect(document.querySelectorAll("[data-macro-lens-relevant]")).toHaveLength(
      0
    );
    expect(screen.queryByText(MACRO_LENS_RELEVANT_LABEL)).toBeNull();
    expect(screen.getByRole("button", { name: /Capabilities/ })).toHaveAttribute(
      "aria-current",
      "location"
    );
  });

  it.each(lensOptions.map((lens) => [lens.name]))(
    "marks Capabilities and Evidence for %s without Profile, Insights, counts, or ranking",
    (lensName) => {
      const relevance = deriveMacroLensRelevance(lensName);
      render(
        <PortfolioSectionNavigator
          activeMacroKey="profile"
          macroLensRelevance={relevance}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

      const profile = screen.getByRole("button", { name: /Profile/ });
      const capabilities = screen.getByRole("button", { name: /Capabilities/ });
      const evidence = screen.getByRole("button", { name: /Evidence/ });

      expect(profile).not.toHaveAttribute("data-macro-lens-relevant");
      expect(capabilities).toHaveAttribute("data-macro-lens-relevant", "true");
      expect(evidence).toHaveAttribute("data-macro-lens-relevant", "true");
      expect(screen.queryByRole("button", { name: /Insights/ })).toBeNull();

      expect(capabilities.querySelector("[data-macro-relevance-marker]")).toBeTruthy();
      expect(evidence.querySelector("[data-macro-relevance-marker]")).toBeTruthy();
      expect(profile.querySelector("[data-macro-relevance-marker]")).toBeNull();

      expect(capabilities.textContent).toContain(MACRO_LENS_RELEVANT_LABEL);
      expect(evidence.textContent).toContain(MACRO_LENS_RELEVANT_LABEL);
      expect(profile.textContent).not.toContain(MACRO_LENS_RELEVANT_LABEL);

      expect(document.body.textContent).not.toMatch(/\b(best match|rank|score)\b/i);
      expect(document.body.textContent).not.toMatch(/\d+\s+(matches|items|results)/i);
    }
  );

  it("supports combined current + relevant state without collapsing meanings", () => {
    render(
      <PortfolioSectionNavigator
        activeMacroKey="evidence"
        macroLensRelevance={deriveMacroLensRelevance("Technology Risk")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Portfolio sections" }));

    const evidence = screen.getByRole("button", { name: /Evidence/ });
    const capabilities = screen.getByRole("button", { name: /Capabilities/ });
    const profile = screen.getByRole("button", { name: /Profile/ });

    expect(evidence).toHaveAttribute("aria-current", "location");
    expect(evidence).toHaveAttribute("data-macro-current", "true");
    expect(evidence).toHaveAttribute("data-macro-lens-relevant", "true");
    expect(evidence.textContent).toMatch(/current section/i);
    expect(evidence.textContent).toContain(MACRO_LENS_RELEVANT_LABEL);
    expect(evidence.querySelector("[data-macro-location-marker]")).toBeTruthy();
    expect(evidence.querySelector("[data-macro-relevance-marker]")).toBeTruthy();

    expect(capabilities).not.toHaveAttribute("aria-current");
    expect(capabilities).toHaveAttribute("data-macro-lens-relevant", "true");
    expect(capabilities.textContent).not.toMatch(/current section/i);
    expect(capabilities.textContent).toContain(MACRO_LENS_RELEVANT_LABEL);

    expect(profile).not.toHaveAttribute("aria-current");
    expect(profile).not.toHaveAttribute("data-macro-lens-relevant");

    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(1);
    expect(document.querySelectorAll("[data-macro-lens-relevant]")).toHaveLength(2);
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("keeps navigation usable for relevant entries without filtering", () => {
    const onActiveMacroSelect = vi.fn();
    render(
      <PortfolioSectionNavigator
        activeMacroKey="profile"
        onActiveMacroSelect={onActiveMacroSelect}
        macroLensRelevance={deriveMacroLensRelevance("IT Audit")}
      />
    );
    const trigger = screen.getByRole("button", { name: "Portfolio sections" });
    fireEvent.click(trigger);

    const experience = document.createElement("div");
    experience.id = "experience";
    experience.scrollIntoView = vi.fn();
    document.body.appendChild(experience);

    fireEvent.click(screen.getByRole("button", { name: /Evidence/ }));
    expect(onActiveMacroSelect).toHaveBeenCalledWith("evidence");
    expect(experience.scrollIntoView).toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector('[data-macro-section="capabilities"]')).toBeNull();
    // Relevance is a marker only — panel close does not remove portfolio content.
    expect(document.getElementById("experience")).toBe(experience);

    experience.remove();
  });
});

describe("prefersReducedMotion / scrollToMacroSection helpers", () => {
  it("reads reduced-motion media safely", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
    expect(prefersReducedMotion(null)).toBe(false);
  });

  it("fails safely when the target is missing", () => {
    expect(
      scrollToMacroSection("missing", {
        getElement: () => null,
      })
    ).toBe(false);
  });

  it("uses approved registry targets for visible macros", () => {
    expect(getVisibleMacroSections().map((m) => m.scrollTargetId)).toEqual([
      "hero",
      "capabilities",
      "experience",
    ]);
  });
});
