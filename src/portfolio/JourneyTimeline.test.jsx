import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  formatJourneyPeriod,
  getFirstMilestoneIndexForYear,
  getJourneyYears,
  getYearIndexForMilestone,
  getYearMilestoneEntries,
  journeyMilestones,
} from "./journeyData.js";
import JourneyTimeline from "./JourneyTimeline.jsx";
import RiskRadar from "./RiskRadar.jsx";

vi.mock("./portfolioSectionNavigation.js", () => ({
  prefersReducedMotion: () => false,
}));

vi.mock("./radarSweepCadence.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    shouldReduceRadarSweepCadence: () => false,
    startCappedRadarSweep: () => () => {},
  };
});

describe("journeyData chronology", () => {
  it("orders newest first and never invents months", () => {
    expect(journeyMilestones[0].title).toBe("Banca Profilo");
    expect(journeyMilestones[journeyMilestones.length - 1].title).toBe(
      "High School Diploma"
    );
    expect(journeyMilestones.every((m, i, arr) => i === 0 || arr[i - 1].year >= m.year)).toBe(
      true
    );

    const yearOnly = journeyMilestones.filter((m) => m.month == null);
    expect(yearOnly.length).toBeGreaterThanOrEqual(2);
    expect(yearOnly.every((m) => m.monthLabel == null)).toBe(true);
    expect(formatJourneyPeriod(yearOnly[0])).toBe(String(yearOnly[0].year));
  });

  it("derives unique years and keeps both September 2017 milestones", () => {
    const years = getJourneyYears(journeyMilestones);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(2012);
    expect(new Set(years).size).toBe(years.length);

    const sep2017 = getYearMilestoneEntries(journeyMilestones, 2017);
    expect(sep2017).toHaveLength(2);
    expect(sep2017.every((entry) => entry.milestone.month === 9)).toBe(true);
  });

  it("resolves year indices and first milestone per year", () => {
    expect(getYearIndexForMilestone(journeyMilestones, 0)).toBe(0);
    expect(getFirstMilestoneIndexForYear(journeyMilestones, 2025)).toBe(
      journeyMilestones.findIndex((m) => m.id === "journey-boc")
    );
    expect(getYearMilestoneEntries(journeyMilestones, 2026)).toHaveLength(3);
    expect(getYearMilestoneEntries(journeyMilestones, 2020)).toHaveLength(1);
  });
});

describe("JourneyTimeline", () => {
  afterEach(() => {
    cleanup();
  });

  it("navigates by year and shows every milestone for the selected year", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={0}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText("2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Banca Profilo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /CISA/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Postgraduate Master's Completed/i })
    ).toBeTruthy();
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();

    expect(screen.getByRole("button", { name: "Newer year" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Older year" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, 2025)
    );

    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, 2025);
    rerender(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bocIndex}
        onSelect={onSelect}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("2025")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Bank of China/i })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /Prelios/i })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Auditing, Accounting & Sustainability Reporting/i,
      })
    ).toBeTruthy();

    const oldestIndex = getFirstMilestoneIndexForYear(journeyMilestones, 2012);
    rerender(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={oldestIndex}
        onSelect={onSelect}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Newer year" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, 2013)
    );
  });

  it("activates a milestone within the selected year on click", () => {
    const onSelect = vi.fn();
    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, 2025);
    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bocIndex}
        onSelect={onSelect}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Prelios Credit Servicing/i })
    );
    expect(onSelect).toHaveBeenCalledWith(bocIndex + 1);
  });

  it("supports keyboard year navigation toward present and past", () => {
    const onSelect = vi.fn();
    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, 2025);
    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bocIndex}
        onSelect={onSelect}
      />
    );
    const group = screen.getByRole("group", {
      name: "Professional journey timeline",
    });
    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, 2023)
    );
    fireEvent.keyDown(group, { key: "ArrowUp" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, 2026)
    );
    fireEvent.keyDown(group, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(group, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, 2012)
    );
  });

  it("omits invented month labels when month is absent", () => {
    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={0}
        onSelect={vi.fn()}
      />
    );
    const cisaButton = screen.getByRole("button", { name: /CISA/i });
    expect(cisaButton.textContent).not.toMatch(/\bJAN\b|\bSEP\b|\bOCT\b/);
    expect(cisaButton.getAttribute("aria-label")).toContain("2026");
    expect(cisaButton.getAttribute("aria-label")).not.toMatch(/^Jan |^Sep /);
  });
});

describe("Snapshot Journey integration", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      queueMicrotask(() => cb(0));
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps Risk Map as the default Snapshot tab", () => {
    render(<RiskRadar />);
    expect(screen.getByRole("button", { name: "Risk Map" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Journey" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.queryByRole("button", { name: "Profile Coverage" })).toBeNull();
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
    expect(
      screen.getByText(
        "Explore the domains shaping my professional profile and the journey behind its development."
      )
    ).toBeTruthy();
  });

  it("syncs the Evidence panel when changing year or milestone", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Journey" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: journeyMilestones[0].title })
      ).toBeTruthy();
    });
    expect(screen.getByText(journeyMilestones[0].explanation)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Older year" }));
    const first2025 = journeyMilestones[getFirstMilestoneIndexForYear(journeyMilestones, 2025)];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: first2025.title })
      ).toBeTruthy();
    });
    expect(screen.getByText(first2025.explanation)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Prelios Credit Servicing/i }));
    const prelios = journeyMilestones.find((m) => m.id === "journey-prelios");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: prelios.title })
      ).toBeTruthy();
    });
    expect(document.querySelector(".radar-sweep")).toBeNull();
  });
});
