import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RiskRadar from "./RiskRadar.jsx";
import { radarDomains } from "./portfolioData.js";

function domainButton(title) {
  return screen.getByRole("button", { name: title });
}

async function openRiskExposure() {
  fireEvent.click(screen.getByRole("button", { name: "Risk Exposure" }));
  await waitFor(() => {
    expect(document.querySelector(".radar-sweep")).toBeTruthy();
  });
}

function hasSelectionPulses(button) {
  const abs = [...button.querySelectorAll(":scope > span.relative > span.absolute")];
  return abs.length >= 2;
}

async function expectPanelTitle(title) {
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 3, name: title })).toBeTruthy();
  });
}

describe("Risk Exposure domain selection (Role Lens–neutral)", () => {
  afterEach(cleanup);

  it("keeps domain selection and detail panel independent of selectedLens", async () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);
    await openRiskExposure();

    const internalAudit = domainButton("Internal Audit & Assurance");
    const infoSec = domainButton("Information Security Governance");

    expect(internalAudit).toHaveAttribute("aria-pressed", "true");
    expect(infoSec).toHaveAttribute("aria-pressed", "false");
    expect(hasSelectionPulses(internalAudit)).toBe(true);
    expect(hasSelectionPulses(infoSec)).toBe(false);
    expect(document.querySelector(".role-lens-radar-node")).toBeNull();
    await expectPanelTitle("Internal Audit & Assurance");
  });

  it("does not apply Role Lens halo or dimming under any lens", async () => {
    render(<RiskRadar selectedLens="Technology Risk" />);
    await openRiskExposure();

    for (const domain of radarDomains) {
      const button = domainButton(domain.title);
      expect(button.querySelector(".role-lens-radar-node")).toBeNull();
      expect(button.className).not.toContain("opacity-60");
      expect(button).not.toHaveAttribute("disabled");
    }
  });

  it("updates the right panel when selecting a domain", async () => {
    render(<RiskRadar selectedLens="Information Security Governance" />);
    await openRiskExposure();
    fireEvent.click(domainButton("Technology & ICT Risk"));

    expect(domainButton("Technology & ICT Risk")).toHaveAttribute("aria-pressed", "true");
    expect(hasSelectionPulses(domainButton("Technology & ICT Risk"))).toBe(true);
    await expectPanelTitle("Technology & ICT Risk");
  });

  it("reflects only activeDomain in aria-pressed across all radar domains", async () => {
    render(<RiskRadar selectedLens="Technology Risk" />);
    await openRiskExposure();

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

  it("does not auto-change activeDomain when selectedLens changes", async () => {
    const { rerender } = render(<RiskRadar selectedLens="Overview" />);
    await openRiskExposure();
    fireEvent.click(domainButton("AI Governance"));
    expect(domainButton("AI Governance")).toHaveAttribute("aria-pressed", "true");
    await expectPanelTitle("AI Governance");

    rerender(<RiskRadar selectedLens="Banking Risk" />);
    expect(domainButton("AI Governance")).toHaveAttribute("aria-pressed", "true");
    await expectPanelTitle("AI Governance");
  });

  it("preserves data-role-lens-id on every radar domain for Assistant contracts", async () => {
    render(<RiskRadar />);
    await openRiskExposure();

    for (const domain of radarDomains) {
      expect(domainButton(domain.title)).toHaveAttribute("data-role-lens-id", domain.id);
    }
  });

  it("keeps all domains clickable and shows maturity pill for the active domain", async () => {
    render(<RiskRadar selectedLens="Overview" />);
    await openRiskExposure();

    for (const domain of radarDomains) {
      const button = domainButton(domain.title);
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      await expectPanelTitle(domain.title);
      expect(screen.getByText(domain.maturity)).toBeTruthy();
    }
  });
});
