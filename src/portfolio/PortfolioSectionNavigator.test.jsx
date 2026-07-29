import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { getVisibleMacroSections } from "./macroSectionRegistry.js";
import PortfolioSectionNavigator, {
  prefersReducedMotion,
  scrollToMacroSection,
} from "./PortfolioSectionNavigator.jsx";

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

    expect(screen.queryByText(/Role Lens matches/i)).toBeNull();
    expect(
      document.querySelector("[data-macro-lens-relevant]")
    ).toBeNull();
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
