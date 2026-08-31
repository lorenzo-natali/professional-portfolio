import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  formatJourneyPeriod,
  getFirstMilestoneIndexForYear,
  getJourneyYears,
  getPeriodKey,
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
      "Scientific & Technological High School Diploma"
    );
    expect(journeyMilestones[journeyMilestones.length - 1].subtitle).toBe(
      "Sant’Ambrogio Don Bosco — Milan"
    );
    expect(journeyMilestones[journeyMilestones.length - 1].type).toBe("Education");
    expect(journeyMilestones[journeyMilestones.length - 1].stage).toBe("FOUNDATION");
    expect(journeyMilestones[journeyMilestones.length - 1].narrativeHeading).toBe(
      "High School Diploma"
    );
    expect(
      journeyMilestones.every(
        (m, i, arr) => i === 0 || (arr[i - 1].startYear ?? arr[i - 1].year) >= (m.startYear ?? m.year)
      )
    ).toBe(true);

    const yearOnly = journeyMilestones.filter(
      (m) => m.month == null && (m.endYear ?? m.year) === (m.startYear ?? m.year)
    );
    expect(yearOnly.length).toBeGreaterThanOrEqual(2);
    expect(yearOnly.every((m) => m.monthLabel == null)).toBe(true);
    expect(formatJourneyPeriod(yearOnly[0])).toBe(String(yearOnly[0].year));
  });

  it("merges Australia into one 2013–2014 period without month labels", () => {
    const australia = journeyMilestones.filter((m) => m.id.startsWith("journey-australia"));
    expect(australia).toHaveLength(1);
    expect(australia[0].startYear).toBe(2013);
    expect(australia[0].endYear).toBe(2014);
    expect(australia[0].month).toBeNull();
    expect(australia[0].monthLabel).toBeNull();
    expect(formatJourneyPeriod(australia[0])).toBe("2013–2014");
    expect(getPeriodKey(australia[0])).toBe("2013–2014");

    const years = getJourneyYears(journeyMilestones);
    expect(years).toContain("2013–2014");
    expect(years).not.toContain(2013);
    expect(years).not.toContain(2014);
    expect(years).not.toContain("2013");
    expect(years).not.toContain("2014");
    expect(getYearMilestoneEntries(journeyMilestones, "2013–2014")).toHaveLength(1);
  });

  it("derives unique years and keeps both September 2017 milestones", () => {
    const years = getJourneyYears(journeyMilestones);
    expect(years[0]).toBe("2026");
    expect(years[years.length - 1]).toBe("2012");
    expect(new Set(years).size).toBe(years.length);

    const sep2017 = getYearMilestoneEntries(journeyMilestones, "2017");
    expect(sep2017).toHaveLength(2);
    expect(sep2017.every((entry) => entry.milestone.month === 9)).toBe(true);
  });

  it("resolves year indices and first milestone per year", () => {
    expect(getYearIndexForMilestone(journeyMilestones, 0)).toBe(0);
    expect(getFirstMilestoneIndexForYear(journeyMilestones, "2025")).toBe(
      journeyMilestones.findIndex((m) => m.id === "journey-boc")
    );
    expect(getYearMilestoneEntries(journeyMilestones, "2026")).toHaveLength(3);
    expect(getYearMilestoneEntries(journeyMilestones, "2020")).toHaveLength(1);
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
    expect(
      screen.getByRole("button", { name: /Started CISA Preparation/i })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Completed Postgraduate Master's in Auditing, Accounting & Sustainability Reporting/i,
      })
    ).toBeTruthy();
    expect(screen.getByText(/26\/30 \(A−\)/)).toBeTruthy();
    expect(screen.queryByText(/100\/110|105\/110/)).toBeNull();

    expect(screen.getByRole("button", { name: "Newer year" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Older year" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, "2025")
    );

    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2025");
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
        name: /Started Postgraduate Master's in Auditing, Accounting & Sustainability Reporting/i,
      })
    ).toBeTruthy();

    const oldestIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2012");
    rerender(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={oldestIndex}
        onSelect={onSelect}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("2012")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Older year" })).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Newer year" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, "2013–2014")
    );
  });

  it("activates a milestone within the selected year on click", () => {
    const onSelect = vi.fn();
    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2025");
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
    const bocIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2025");
    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bocIndex}
        onSelect={onSelect}
      />
    );
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, "2023")
    );
    fireEvent.keyDown(group, { key: "ArrowUp" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, "2026")
    );
    fireEvent.keyDown(group, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(group, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith(
      getFirstMilestoneIndexForYear(journeyMilestones, "2012")
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
    const cisaButton = screen.getByRole("button", {
      name: /Started CISA Preparation/i,
    });
    expect(cisaButton.textContent).not.toMatch(/\bJAN\b|\bSEP\b|\bOCT\b/);
    expect(cisaButton.getAttribute("aria-label")).toContain("2026");
    expect(cisaButton.getAttribute("aria-label")).not.toMatch(/^Jan |^Sep /);
  });

  it("shows Australia as a continuous 2013–2014 chapter without month labels", () => {
    const australiaIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2013–2014");
    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={australiaIndex}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("2013")).toBeTruthy();
    expect(screen.getByText("2014")).toBeTruthy();
    expect(screen.queryByText("2013–2014")).toBeNull();
    const australiaButton = screen.getByRole("button", {
      name: /Living & Working in Australia/i,
    });
    expect(australiaButton.textContent).not.toMatch(/\bJAN\b|\bOCT\b/);
    expect(screen.queryByText("Australia Experience Completed")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Australia$/ })).toBeNull();
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

  it("keeps Career Timeline as the default Overview tab", () => {
    render(<RiskRadar />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Professional Overview" })
    ).toBeTruthy();
    const tabs = screen.getAllByRole("button").filter((btn) =>
      ["Career Timeline", "Risk Exposure", "International Mobility"].includes(
        btn.textContent ?? ""
      )
    );
    expect(tabs.map((btn) => btn.textContent)).toEqual([
      "Career Timeline",
      "Risk Exposure",
      "International Mobility",
    ]);
    expect(screen.getByRole("button", { name: "Career Timeline" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Risk Exposure" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "International Mobility" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.queryByRole("button", { name: "Profile Coverage" })).toBeNull();
    expect(document.querySelector(".radar-sweep")).toBeNull();
    expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    expect(
      screen.getByText(
        "An interactive view of my professional path, risk exposure and international career outlook."
      )
    ).toBeTruthy();
  });

  it("syncs the Evidence panel when changing year or milestone", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: journeyMilestones[0].narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    expect(screen.queryByText("SPECIALIZATION")).toBeNull();
    expect(screen.getByText(journeyMilestones[0].narrativeBody)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Older year" }));
    const first2025 = journeyMilestones[getFirstMilestoneIndexForYear(journeyMilestones, "2025")];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: first2025.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("CAREER PIVOT")).toBeNull();
    expect(screen.getByText(first2025.narrativeBody)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Prelios Credit Servicing/i }));
    const prelios = journeyMilestones.find((m) => m.id === "journey-prelios");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: prelios.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("APPLIED EXPERIENCE")).toBeNull();
    expect(document.querySelector(".radar-sweep")).toBeNull();
  });

  it("omits stage labels and type pills from the Career Timeline detail panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    const banca = journeyMilestones.find((m) => m.id === "journey-banca-profilo");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: banca.narrativeHeading })
      ).toBeTruthy();
    });
    expect(screen.queryByText(banca.stage)).toBeNull();
    expect(document.querySelector(".rounded-full.border.px-3.py-1")).toBeNull();

    // Hybrid milestone previously used as a legacy type-pill case; still verify no pill.
    fireEvent.click(screen.getByRole("button", { name: "Older year" })); // 2025
    fireEvent.click(screen.getByRole("button", { name: "Older year" })); // 2023
    fireEvent.click(screen.getByRole("button", { name: "Older year" })); // 2021
    fireEvent.click(screen.getByRole("button", { name: "Older year" })); // 2020
    fireEvent.click(screen.getByRole("button", { name: "Older year" })); // 2017

    const roundTable = journeyMilestones.find((m) => m.id === "journey-round-table");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /RT75 Milan — Round Table International/i })
      ).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /RT75 Milan — Round Table International/i })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: roundTable.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.getByText(roundTable.narrativeBody)).toBeTruthy();
    expect(roundTable.subtitle).toBeNull();
    expect(document.querySelector(".rounded-full.border.px-3.py-1")).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();
    expect(screen.queryByText("Sep 2017")).toBeNull();
  });

  it("keeps 2026 milestones as completion, CISA preparation and IT Audit specialization", async () => {
    const onSelect = vi.fn();
    const bancaIndex = journeyMilestones.findIndex((m) => m.id === "journey-banca-profilo");
    const cisaIndex = journeyMilestones.findIndex((m) => m.id === "journey-cisa");
    const postgradIndex = journeyMilestones.findIndex(
      (m) => m.id === "journey-postgrad-complete"
    );
    // Newest → oldest: Sep → year-only CISA → Jan
    expect(bancaIndex).toBeLessThan(cisaIndex);
    expect(cisaIndex).toBeLessThan(postgradIndex);

    const banca = journeyMilestones[bancaIndex];
    const cisa = journeyMilestones[cisaIndex];
    const postgrad = journeyMilestones[postgradIndex];

    expect(postgrad.month).toBe(1);
    expect(postgrad.title).toBe(
      "Completed Postgraduate Master's in Auditing, Accounting & Sustainability Reporting"
    );
    expect(postgrad.subtitle).toBe(
      "ALTIS · Università Cattolica del Sacro Cuore — Milan · In partnership with EY · 26/30 (A−)"
    );
    expect(postgrad.stage).toBe("ACADEMIC MILESTONE");
    expect(postgrad.connectedEvidence.map((link) => link.entityId)).toEqual([
      "education-altis-ey",
    ]);

    expect(cisa.month).toBeNull();
    expect(cisa.title).toBe("Started CISA Preparation");
    expect(cisa.subtitle).toBe("ISACA · Exam planned 2026");
    expect(cisa.title).not.toMatch(/obtained|certified|passed/i);
    expect(cisa.subtitle).not.toMatch(/obtained|certified|passed/i);
    expect(cisa.stage).toBe("PROFESSIONAL DEVELOPMENT");
    expect(cisa.connectedEvidence.map((link) => link.entityId)).toEqual([
      "credential-cisa",
    ]);

    expect(banca.month).toBe(9);
    expect(banca.stage).toBe("SPECIALIZATION");
    expect(banca.narrativeBody).not.toMatch(/AI Governance/i);
    expect(banca.narrativeContext).toBeNull();
    expect(banca.connectedEvidence.map((link) => link.entityId)).toEqual([
      "experience-banca-profilo",
      "capability-audit-control",
      "capability-technology-risk",
      "radar-control-audit-risk",
      "radar-technology-ict-risk",
    ]);
    expect(banca.connectedEvidence.map((link) => link.entityId)).not.toContain(
      "capability-ai-governance"
    );
    expect(banca.connectedEvidence.map((link) => link.entityId)).not.toContain(
      "radar-ai-model-governance"
    );

    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bancaIndex}
        onSelect={onSelect}
      />
    );
    expect(screen.getByRole("button", { name: /Banca Profilo/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Started CISA Preparation/i })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Postgraduate Master's in Auditing, Accounting & Sustainability Reporting/i,
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /Started CISA Preparation/i })
    );
    expect(onSelect).toHaveBeenCalledWith(cisaIndex);
  });

  it("renders the 2026 SPECIALIZATION / CISA / ACADEMIC MILESTONE panels", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    const banca = journeyMilestones.find((m) => m.id === "journey-banca-profilo");
    const cisa = journeyMilestones.find((m) => m.id === "journey-cisa");
    const postgrad = journeyMilestones.find(
      (m) => m.id === "journey-postgrad-complete"
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: banca.narrativeHeading })
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /Started CISA Preparation/i })
      ).toBeTruthy();
    });
    expect(screen.queryByText("SPECIALIZATION")).toBeNull();
    expect(screen.getByText(banca.narrativeBody)).toBeTruthy();
    expect(screen.queryByText(/digitalization, fintech/i)).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();
    expect(screen.queryByText("Related portfolio sections:")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /Started CISA Preparation/i })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: cisa.narrativeHeading })
      ).toBeTruthy();
    });
    expect(screen.queryByText("PROFESSIONAL DEVELOPMENT")).toBeNull();
    expect(screen.getByText(cisa.narrativeBody)).toBeTruthy();
    expect(screen.queryByText(/CISA certified|CISA obtained|exam passed/i)).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Postgraduate Master's in Auditing, Accounting & Sustainability Reporting/i,
      })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: postgrad.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("ACADEMIC MILESTONE")).toBeNull();
    expect(screen.getByText(postgrad.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("keeps 2025 milestones as a selectable applied-to-audit progression", async () => {
    const onSelect = vi.fn();
    const bocIndex = journeyMilestones.findIndex((m) => m.id === "journey-boc");
    const preliosIndex = journeyMilestones.findIndex((m) => m.id === "journey-prelios");
    const postgradIndex = journeyMilestones.findIndex(
      (m) => m.id === "journey-postgrad-start"
    );
    // Newest → oldest: Oct → May → Jan
    expect(bocIndex).toBeLessThan(preliosIndex);
    expect(preliosIndex).toBeLessThan(postgradIndex);

    const boc = journeyMilestones[bocIndex];
    const prelios = journeyMilestones[preliosIndex];
    const postgrad = journeyMilestones[postgradIndex];

    expect(postgrad.month).toBe(1);
    expect(postgrad.title).toBe(
      "Started Postgraduate Master's in Auditing, Accounting & Sustainability Reporting"
    );
    expect(postgrad.subtitle).toBe(
      "ALTIS · Università Cattolica del Sacro Cuore — Milan · In partnership with EY"
    );
    expect(postgrad.stage).toBe("PROFESSIONAL PIVOT");
    expect(postgrad.narrativeHeading).toBe(
      "From Economic Analysis to Accounting & Assurance"
    );
    expect(postgrad.narrativeBody).not.toMatch(
      /Internal Audit|Technology Risk|AI Governance/i
    );
    expect(postgrad.connectedEvidence.map((link) => link.entityId)).toEqual([
      "education-altis-ey",
    ]);

    expect(prelios.month).toBe(5);
    expect(prelios.subtitle).toBe(
      "Accounting & Administration Intern · NPL/UTP Portfolios · Milan"
    );
    expect(prelios.stage).toBe("APPLIED EXPERIENCE");
    expect(prelios.narrativeBody).not.toMatch(
      /not the right path|disliked accounting/i
    );
    expect(prelios.connectedEvidence.map((link) => link.entityId)).toEqual([
      "experience-prelios",
      "capability-banking-risk",
      "radar-credit-risk",
    ]);

    expect(boc.month).toBe(10);
    expect(boc.stage).toBe("CAREER PIVOT");
    expect(boc.narrativeBody).not.toMatch(/Chinese|Technology Risk|AI Governance/i);
    expect(boc.connectedEvidence.map((link) => link.entityId)).toEqual([
      "experience-boc",
      "capability-audit-control",
      "capability-banking-risk",
      "radar-control-audit-risk",
      "radar-credit-risk",
    ]);

    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={bocIndex}
        onSelect={onSelect}
      />
    );
    expect(screen.getByRole("button", { name: /Bank of China/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Prelios Credit Servicing/i })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Started Postgraduate Master's in Auditing, Accounting & Sustainability Reporting/i,
      })
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Started Postgraduate Master's/i,
      })
    );
    expect(onSelect).toHaveBeenCalledWith(postgradIndex);
  });

  it("renders the 2025 PROFESSIONAL PIVOT / APPLIED EXPERIENCE / CAREER PIVOT panels", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Older year" }));

    const boc = journeyMilestones.find((m) => m.id === "journey-boc");
    const prelios = journeyMilestones.find((m) => m.id === "journey-prelios");
    const postgrad = journeyMilestones.find((m) => m.id === "journey-postgrad-start");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bank of China/i })).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /Prelios Credit Servicing/i })
      ).toBeTruthy();
      expect(
        screen.getByRole("button", {
          name: /Started Postgraduate Master's/i,
        })
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { level: 3, name: boc.narrativeHeading })
      ).toBeTruthy();
    });
    expect(screen.queryByText("CAREER PIVOT")).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Prelios Credit Servicing/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: prelios.narrativeHeading })
      ).toBeTruthy();
    });
    expect(screen.queryByText("APPLIED EXPERIENCE")).toBeNull();
    expect(screen.getByText(prelios.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Started Postgraduate Master's/i,
      })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: postgrad.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("PROFESSIONAL PIVOT")).toBeNull();
    expect(screen.getByText(postgrad.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2012 hybrid narrative panel without Connected Evidence", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "End" });

    const highSchool = journeyMilestones.find((m) => m.id === "journey-high-school");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: highSchool.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("FOUNDATION")).toBeNull();
    expect(screen.getByText(highSchool.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
    expect(screen.queryByText("Related portfolio sections:")).toBeNull();
  });

  it("keeps both 2021 education milestones with independent narrative panels", async () => {
    const onSelect = vi.fn();
    const mastersIndex = journeyMilestones.findIndex((m) => m.id === "journey-icd-masters");
    const bachelorsIndex = journeyMilestones.findIndex((m) => m.id === "journey-bachelors");
    expect(mastersIndex).toBeLessThan(bachelorsIndex);
    expect(journeyMilestones[mastersIndex].month).toBe(9);
    expect(journeyMilestones[bachelorsIndex].month).toBe(7);
    expect(journeyMilestones[bachelorsIndex].subtitle).toContain("100/110");
    expect(journeyMilestones[mastersIndex].title).toMatch(/^Started Master's in /);
    expect(journeyMilestones[bachelorsIndex].title).toMatch(/^Bachelor's Degree in /);
    expect(journeyMilestones[mastersIndex].connectedEvidence[0].entityId).toBe(
      "education-international-cooperation"
    );
    expect(journeyMilestones[bachelorsIndex].connectedEvidence[0].entityId).toBe(
      "education-languages"
    );

    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={mastersIndex}
        onSelect={onSelect}
      />
    );
    expect(
      screen.getByRole("button", {
        name: /Started Master's in International Cooperation for Development/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Bachelor's Degree in Languages for International Relations/i,
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Bachelor's Degree in Languages for International Relations/i,
      })
    );
    expect(onSelect).toHaveBeenCalledWith(bachelorsIndex);
  });

  it("distinguishes academic programme starts from degree completions in timeline copy", () => {
    const languagesStart = journeyMilestones.find((m) => m.id === "journey-languages-degree");
    const bachelors = journeyMilestones.find((m) => m.id === "journey-bachelors");
    const mastersStart = journeyMilestones.find((m) => m.id === "journey-icd-masters");
    const mastersComplete = journeyMilestones.find((m) => m.id === "journey-masters-complete");

    expect(languagesStart.month).toBe(9);
    expect(languagesStart.year).toBe(2017);
    expect(languagesStart.title).toBe(
      "Started Bachelor's Degree in Languages for International Relations"
    );
    expect(languagesStart.subtitle).toBe(
      "English & Chinese · Università Cattolica del Sacro Cuore — Milan"
    );
    expect(languagesStart.subtitle).not.toMatch(/\d+\/\d+/);
    expect(languagesStart.narrativeHeading).toBe(
      "Starting the Bachelor's Degree"
    );
    expect(languagesStart.narrativeBody).toBe(
      "An interdisciplinary programme spanning Political Science and Language Studies, with English and Chinese as specialization languages."
    );
    expect(languagesStart.explanation).toBeNull();

    expect(bachelors.month).toBe(7);
    expect(bachelors.title).toBe(
      "Bachelor's Degree in Languages for International Relations"
    );
    expect(bachelors.subtitle).toContain("100/110");

    expect(mastersStart.month).toBe(9);
    expect(mastersStart.title).toBe(
      "Started Master's in International Cooperation for Development"
    );
    expect(mastersStart.subtitle).not.toMatch(/\d+\/\d+/);
    expect(mastersStart.title).not.toMatch(/\bMSc\b|\bBSc\b/);

    expect(mastersComplete.month).toBe(12);
    expect(mastersComplete.year).toBe(2023);
    expect(mastersComplete.title).toBe(
      "Master's Degree in International Cooperation for Development"
    );
    expect(mastersComplete.subtitle).toBe(
      "Università Cattolica del Sacro Cuore — Milan · 105/110"
    );
    expect(mastersComplete.title).not.toMatch(/\bMSc\b|\bBSc\b/);

    // Intra-year order follows global newest → oldest (Sep before Jul in 2021).
    expect(
      journeyMilestones.findIndex((m) => m.id === "journey-icd-masters")
    ).toBeLessThan(journeyMilestones.findIndex((m) => m.id === "journey-bachelors"));
  });

  it("keeps both 2023 milestones as preparation vs degree completion with narratives", async () => {
    const onSelect = vi.fn();
    const mastersIndex = journeyMilestones.findIndex(
      (m) => m.id === "journey-masters-complete"
    );
    const hskIndex = journeyMilestones.findIndex((m) => m.id === "journey-hsk3");
    // Newest → oldest: Dec Master's above Oct HSK preparation.
    expect(mastersIndex).toBeLessThan(hskIndex);
    expect(journeyMilestones[mastersIndex].month).toBe(12);
    expect(journeyMilestones[hskIndex].month).toBe(10);

    const masters = journeyMilestones[mastersIndex];
    const hsk = journeyMilestones[hskIndex];

    expect(masters.title).toBe(
      "Master's Degree in International Cooperation for Development"
    );
    expect(masters.subtitle).toBe(
      "Università Cattolica del Sacro Cuore — Milan · 105/110"
    );
    expect(masters.stage).toBe("ACADEMIC MILESTONE");
    expect(masters.narrativeHeading).toBe("Economics, Policy & Impact");
    expect(masters.narrativeBody).toContain("105/110");
    expect(masters.connectedEvidence[0].entityId).toBe(
      "education-international-cooperation"
    );
    expect(masters.explanation).toBeNull();

    expect(hsk.title).toBe("Chinese HSK3 Preparation Programme");
    expect(hsk.subtitle).toBe(
      "Confucius Institute · Università Cattolica del Sacro Cuore — Milan"
    );
    expect(hsk.type).toBe("Training");
    expect(hsk.stage).toBe("LANGUAGE DEVELOPMENT");
    expect(hsk.narrativeHeading).toBe("Strengthening Chinese Proficiency");
    expect(hsk.narrativeBody).toMatch(/preparation programme/i);
    expect(hsk.narrativeBody).not.toMatch(/certif/i);
    expect(hsk.title).not.toMatch(/certif/i);
    expect(hsk.connectedEvidence[0].entityId).toBe(
      "additional-training-chinese-language"
    );
    expect(hsk.connectedEvidence[0].section).toBe("Credentials");

    render(
      <JourneyTimeline
        milestones={journeyMilestones}
        activeIndex={mastersIndex}
        onSelect={onSelect}
      />
    );
    expect(
      screen.getByRole("button", {
        name: /Master's Degree in International Cooperation for Development/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Chinese HSK3 Preparation Programme/i,
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Chinese HSK3 Preparation Programme/i,
      })
    );
    expect(onSelect).toHaveBeenCalledWith(hskIndex);
  });

  it("renders the 2023 Master's ACADEMIC MILESTONE narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const years = getJourneyYears(journeyMilestones);
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "Home" });
    const targetYearIndex = years.indexOf("2023");
    for (let i = 0; i < targetYearIndex; i += 1) {
      fireEvent.keyDown(group, { key: "ArrowDown" });
    }

    const masters = journeyMilestones.find((m) => m.id === "journey-masters-complete");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: masters.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("ACADEMIC MILESTONE")).toBeNull();
    expect(screen.getByText(masters.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Completion of master's degree studies.")).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2023 HSK preparation LANGUAGE DEVELOPMENT narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const years = getJourneyYears(journeyMilestones);
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "Home" });
    const targetYearIndex = years.indexOf("2023");
    for (let i = 0; i < targetYearIndex; i += 1) {
      fireEvent.keyDown(group, { key: "ArrowDown" });
    }

    const hsk = journeyMilestones.find((m) => m.id === "journey-hsk3");
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /Chinese HSK3 Preparation Programme/i,
        })
      ).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Chinese HSK3 Preparation Programme/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: hsk.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("LANGUAGE DEVELOPMENT")).toBeNull();
    expect(screen.getByText(hsk.narrativeBody)).toBeTruthy();
    expect(screen.queryByText(/HSK3 certification/i)).toBeNull();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2021 Bachelor's ACADEMIC MILESTONE narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const years = getJourneyYears(journeyMilestones);
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "Home" });
    const targetYearIndex = years.indexOf("2021");
    for (let i = 0; i < targetYearIndex; i += 1) {
      fireEvent.keyDown(group, { key: "ArrowDown" });
    }

    const bachelors = journeyMilestones.find((m) => m.id === "journey-bachelors");
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /Bachelor's Degree in Languages for International Relations/i,
        })
      ).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Bachelor's Degree in Languages for International Relations/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: bachelors.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("ACADEMIC MILESTONE")).toBeNull();
    expect(screen.getByText(bachelors.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2021 Master's NEW DIRECTION narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const years = getJourneyYears(journeyMilestones);
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "Home" });
    const targetYearIndex = years.indexOf("2021");
    for (let i = 0; i < targetYearIndex; i += 1) {
      fireEvent.keyDown(group, { key: "ArrowDown" });
    }

    const masters = journeyMilestones.find((m) => m.id === "journey-icd-masters");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: masters.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("NEW DIRECTION")).toBeNull();
    expect(screen.getByText(masters.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2020 WORK & STUDY narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const toplifeIndex = journeyMilestones.findIndex((m) => m.id === "journey-toplife");
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    // From End (2012): Australia, Green Cross, Banking, Round Table/Languages, TopLife
    // Safer: select via year navigation by finding the period — click Older until 2020.
    // Direct: set through keyboard Home then step to 2020 is many clicks; use End then many ups.
    // Count periods from getJourneyYears: 2026..2020.
    fireEvent.keyDown(group, { key: "Home" });
    const years = getJourneyYears(journeyMilestones);
    const targetYearIndex = years.indexOf("2020");
    for (let i = 0; i < targetYearIndex; i += 1) {
      fireEvent.keyDown(group, { key: "ArrowDown" });
    }

    const toplife = journeyMilestones[toplifeIndex];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: toplife.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("WORK & STUDY")).toBeNull();
    expect(screen.getByText(toplife.narrativeBody)).toBeTruthy();
    expect(toplife.narrativeContext).toBeNull();
    expect(screen.queryByText(/2020–2025/)).toBeNull();
    expect(toplife.connectedEvidence[0].entityId).toBe("experience-toplife");
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2016 ACADEMIC EXPLORATION narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const bankingIndex = journeyMilestones.findIndex(
      (m) => m.id === "journey-banking-sciences"
    );
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    // 2016 is three steps newer than 2012 (End).
    fireEvent.keyDown(group, { key: "End" });
    fireEvent.keyDown(group, { key: "ArrowUp" });
    fireEvent.keyDown(group, { key: "ArrowUp" });
    fireEvent.keyDown(group, { key: "ArrowUp" });

    const banking = journeyMilestones[bankingIndex];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: banking.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("ACADEMIC EXPLORATION")).toBeNull();
    expect(screen.getByText(banking.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
  });

  it("renders the 2015 SERVICE narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const greenCrossIndex = journeyMilestones.findIndex(
      (m) => m.id === "journey-green-cross"
    );
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    // 2015 is two steps newer than 2012 (End).
    fireEvent.keyDown(group, { key: "End" });
    fireEvent.keyDown(group, { key: "ArrowUp" });
    fireEvent.keyDown(group, { key: "ArrowUp" });

    const greenCross = journeyMilestones[greenCrossIndex];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: greenCross.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("SERVICE")).toBeNull();
    expect(screen.getByText(greenCross.narrativeBody)).toBeTruthy();
    expect(screen.queryByText("Connected evidence")).toBeNull();
    expect(screen.queryByText("Emergency Responder")).toBeNull();
  });

  it("renders the Australia hybrid narrative panel", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Career Timeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });

    const australiaIndex = getFirstMilestoneIndexForYear(journeyMilestones, "2013–2014");
    const group = screen.getByRole("group", {
      name: "Career timeline",
    });
    fireEvent.keyDown(group, { key: "End" });
    fireEvent.keyDown(group, { key: "ArrowUp" });

    const australia = journeyMilestones[australiaIndex];
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: australia.narrativeHeading,
        })
      ).toBeTruthy();
    });
    expect(screen.queryByText("EXPLORATION")).toBeNull();
    expect(screen.getByText(australia.narrativeBody)).toBeTruthy();
    expect(australia.narrativeContext).toBeNull();
    expect(australia.narrativeDetail).toBeNull();
    expect(screen.queryByText(/Byron Bay/)).toBeNull();
    expect(screen.queryByText(/Hospitality · Trades/)).toBeNull();
    expect(screen.queryByText("Australia Experience Completed")).toBeNull();
  });
});
