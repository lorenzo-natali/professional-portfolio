import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RiskRadar from "./RiskRadar.jsx";
import { radarDomains } from "./portfolioData.js";

function domainButton(title) {
  return screen.getByRole("button", { name: title });
}

function nodeDot(button) {
  return button.querySelector(":scope > span.relative");
}

function hasRelevanceHalo(button) {
  return Boolean(button.querySelector(".role-lens-radar-node"));
}

function hasSelectionPulses(button) {
  const abs = [...button.querySelectorAll(":scope > span.relative > span.absolute")];
  // Selection uses dual expanding rings; relevance halo is a single inset-0 span.
  return abs.filter((el) => !el.classList.contains("role-lens-radar-node")).length >= 2;
}

async function expectPanelTitle(title) {
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 3, name: title })).toBeTruthy();
  });
}

describe("Risk Exposure Role Lens visual states (Option B)", () => {
  afterEach(cleanup);

  it("keeps Role Lens relevance and radar selection independent", async () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);

    const internalAudit = domainButton("Internal Audit & Assurance");
    const infoSec = domainButton("Information Security Governance");

    expect(internalAudit).toHaveAttribute("aria-pressed", "true");
    expect(infoSec).toHaveAttribute("aria-pressed", "false");
    expect(hasRelevanceHalo(infoSec)).toBe(true);
    expect(hasRelevanceHalo(internalAudit)).toBe(false);
    expect(hasSelectionPulses(internalAudit)).toBe(true);
    expect(hasSelectionPulses(infoSec)).toBe(false);
    await expectPanelTitle("Internal Audit & Assurance");
  });

  it("gives relevant-only nodes a halo without cyan fill or selection pulses", () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);
    const infoSec = domainButton("Information Security Governance");
    const dot = nodeDot(infoSec);

    expect(hasRelevanceHalo(infoSec)).toBe(true);
    expect(hasSelectionPulses(infoSec)).toBe(false);
    expect(dot.className).toContain("bg-slate-800");
    expect(dot.className).not.toContain("bg-cyan-300");
    expect(infoSec).toHaveAttribute("aria-pressed", "false");
  });

  it("composes selected + Role-Lens-relevant treatments", async () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);
    const infoSec = domainButton("Information Security Governance");

    fireEvent.click(infoSec);

    expect(infoSec).toHaveAttribute("aria-pressed", "true");
    expect(hasSelectionPulses(infoSec)).toBe(true);
    expect(hasRelevanceHalo(infoSec)).toBe(true);
    await expectPanelTitle("Information Security Governance");
  });

  it("keeps selected unrelated domains fully selected and not dimmed or disabled", async () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);
    const tech = domainButton("Technology & ICT Risk");
    const infoSec = domainButton("Information Security Governance");

    fireEvent.click(tech);

    expect(tech).toHaveAttribute("aria-pressed", "true");
    expect(tech).not.toHaveAttribute("disabled");
    expect(tech).not.toHaveAttribute("aria-disabled");
    expect(tech.className).not.toContain("opacity-60");
    expect(hasSelectionPulses(tech)).toBe(true);
    expect(hasRelevanceHalo(tech)).toBe(false);
    expect(hasRelevanceHalo(infoSec)).toBe(true);
    await expectPanelTitle("Technology & ICT Risk");
  });

  it("updates the right panel without changing Role Lens when clicking an unrelated domain", async () => {
    const { rerender } = render(
      <RiskRadar selectedLens="Information Security Governance" />
    );
    fireEvent.click(domainButton("Technology & ICT Risk"));
    await expectPanelTitle("Technology & ICT Risk");

    // Role Lens is owned by the parent; same lens after click proves radar did not clear it.
    rerender(<RiskRadar selectedLens="Information Security Governance" />);
    expect(domainButton("Technology & ICT Risk")).toHaveAttribute("aria-pressed", "true");
    expect(hasRelevanceHalo(domainButton("Information Security Governance"))).toBe(true);
  });

  it("reflects only activeDomain in aria-pressed across all radar domains", () => {
    render(<RiskRadar selectedLens="Technology Risk" />);

    for (const domain of radarDomains) {
      const pressed = domain.title === "Internal Audit & Assurance" ? "true" : "false";
      expect(domainButton(domain.title)).toHaveAttribute("aria-pressed", pressed);
    }

    fireEvent.click(domainButton("Operational & Digital Resilience"));

    for (const domain of radarDomains) {
      const pressed = domain.title === "Operational & Digital Resilience" ? "true" : "false";
      expect(domainButton(domain.title)).toHaveAttribute("aria-pressed", pressed);
    }
  });

  it("does not auto-change activeDomain when Role Lens changes", async () => {
    const { rerender } = render(<RiskRadar selectedLens="Overview" />);
    fireEvent.click(domainButton("AI Governance"));
    expect(domainButton("AI Governance")).toHaveAttribute("aria-pressed", "true");
    await expectPanelTitle("AI Governance");

    rerender(<RiskRadar selectedLens="Banking Risk" />);
    expect(domainButton("AI Governance")).toHaveAttribute("aria-pressed", "true");
    await expectPanelTitle("AI Governance");
  });

  it("does not apply Role Lens relevance halos under Overview", () => {
    render(<RiskRadar selectedLens="Overview" />);

    for (const domain of radarDomains) {
      const button = domainButton(domain.title);
      expect(hasRelevanceHalo(button)).toBe(false);
      expect(button).not.toBeDisabled();
    }

    const selected = domainButton("Internal Audit & Assurance");
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(hasSelectionPulses(selected)).toBe(true);
  });

  it("marks both Technology Risk radar associations as relevant and keeps all domains clickable", async () => {
    render(<RiskRadar selectedLens="Technology Risk" />);

    const tech = domainButton("Technology & ICT Risk");
    const resilience = domainButton("Operational & Digital Resilience");
    expect(hasRelevanceHalo(tech)).toBe(true);
    expect(hasRelevanceHalo(resilience)).toBe(true);

    for (const domain of radarDomains) {
      const button = domainButton(domain.title);
      expect(button).not.toHaveAttribute("disabled");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      await expectPanelTitle(domain.title);
    }
  });
});
