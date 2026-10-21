import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CapabilitiesSection from "./CapabilitiesSection.jsx";
import { expertise, lensRelevance } from "../portfolioData.js";

function card(container, id) {
  return container.querySelector(`[data-role-lens-id="${id}"]`);
}

function surface(container, id) {
  return card(container, id)?.querySelector(":scope > *");
}

function expectHighlighted(el) {
  expect(el.className).toMatch(/role-lens-highlight/);
  expect(el.className).not.toMatch(/\bopacity-55\b/);
}

function expectDimmed(el) {
  expect(el.className).toMatch(/\bopacity-55\b/);
  expect(el.className).not.toMatch(/role-lens-highlight/);
}

function expectNeutralOverview(el) {
  expect(el.className).not.toMatch(/role-lens-highlight/);
  expect(el.className).not.toMatch(/\bopacity-55\b/);
}

describe("CapabilitiesSection Expertise cards", () => {
  afterEach(cleanup);

  it("keeps exactly six Expertise cards with AI Strategy & Adoption after AI Governance", () => {
    expect(expertise).toHaveLength(6);
    expect(expertise.filter((item) => item.title === "AI Strategy & Adoption")).toHaveLength(1);
    expect(expertise.some((item) => item.title === "International & Cross-Cultural Work")).toBe(
      false
    );

    const aiGovIndex = expertise.findIndex((item) => item.id === "capability-ai-governance");
    const strategyIndex = expertise.findIndex(
      (item) => item.id === "capability-ai-strategy-adoption"
    );
    expect(strategyIndex).toBe(aiGovIndex + 1);
    expect(expertise[strategyIndex].text).toBe(
      "Exploring AI-driven opportunities to improve workflows and operational efficiency, with a focus on evaluating secure, auditable and regulatory-aligned solutions, including local and on-premises AI deployments."
    );

    render(<CapabilitiesSection selectedLens="Overview" />);
    expect(screen.getByRole("heading", { name: "AI Strategy & Adoption" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "International & Cross-Cultural Work" })).toBeNull();
    expect(screen.queryByText("Transversal capability")).toBeNull();

    expect(screen.getByText(expertise.find((item) => item.id === "capability-technology-risk").text)).toBeTruthy();
    expect(screen.getByText(expertise.find((item) => item.id === "capability-ai-governance").text)).toBeTruthy();
    expect(expertise.find((item) => item.id === "capability-technology-risk").text).toBe(
      "Hands-on experience in risk-based IT auditing, assessing ICT governance, technology-related controls and digital operational resilience. Direct execution of audit engagements covering DORA Pillar I, ICT change and incident management, and ICT outsourcing, with a focus on regulatory compliance and third-party technology risk."
    );
    expect(expertise.find((item) => item.id === "capability-ai-governance").text).toBe(
      "Hands-on experience in AI governance and policy development within a regulated banking environment, focusing on AI risk management, accountability, transparency and regulatory alignment. Familiarity with the EU AI Act, NIST AI RMF and ISO/IEC 23894, 42001 and 42005, alongside AI assurance and transparency frameworks."
    );
    expect(expertise.find((item) => item.id === "capability-audit-control").text).toBe(
      "Risk-based internal audit, control testing, working papers and analytical reporting to assess control design, effectiveness, risk exposure and governance structures."
    );
    expect(expertise.find((item) => item.id === "capability-banking-risk").text).toBe(
      "Audit and analysis across corporate credit, credit risk and IFRS 9/ECL within a regulated banking environment, alongside supervisory frameworks including RAF, ICAAP/ILAAP, Pillar III, Basel III/IV and CRD VI third-country branch requirements."
    );
    expect(expertise.find((item) => item.id === "capability-information-security").text).toBe(
      "Developing focus on information security governance and control frameworks — ISO/IEC 27001, NIST CSF and COBIT — connecting security controls with audit, assurance and technology risk."
    );
  });

  it("maps AI Strategy & Adoption to AI Governance only", () => {
    expect(lensRelevance["AI Governance"].capabilities).toContain(
      "capability-ai-strategy-adoption"
    );
    expect(lensRelevance["AI Governance"].capabilities).toContain("capability-ai-governance");

    for (const lens of [
      "IT Audit",
      "Technology Risk",
      "Information Security Governance",
      "Banking Risk",
    ]) {
      expect(lensRelevance[lens].capabilities).not.toContain("capability-ai-strategy-adoption");
    }
  });

  it("preserves existing Expertise Role Lens mappings", () => {
    expect(lensRelevance["IT Audit"].capabilities).toEqual([
      "capability-audit-control",
      "capability-technology-risk",
    ]);
    expect(lensRelevance["Technology Risk"].capabilities).toEqual(["capability-technology-risk"]);
    expect(lensRelevance["Information Security Governance"].capabilities).toEqual([
      "capability-information-security",
    ]);
    expect(lensRelevance["Banking Risk"].capabilities).toEqual([
      "capability-banking-risk",
      "capability-audit-control",
    ]);
  });

  it("highlights AI Strategy & Adoption under AI Governance and dims under unrelated lenses", () => {
    const { container, rerender } = render(
      <CapabilitiesSection selectedLens="AI Governance" />
    );
    expectHighlighted(surface(container, "capability-ai-strategy-adoption"));
    expectHighlighted(surface(container, "capability-ai-governance"));
    expectDimmed(surface(container, "capability-technology-risk"));

    rerender(<CapabilitiesSection selectedLens="IT Audit" />);
    expectDimmed(surface(container, "capability-ai-strategy-adoption"));
    expectHighlighted(surface(container, "capability-audit-control"));

    rerender(<CapabilitiesSection selectedLens="Banking Risk" />);
    expectDimmed(surface(container, "capability-ai-strategy-adoption"));

    rerender(<CapabilitiesSection selectedLens="Information Security Governance" />);
    expectDimmed(surface(container, "capability-ai-strategy-adoption"));

    rerender(<CapabilitiesSection selectedLens="Overview" />);
    expectNeutralOverview(surface(container, "capability-ai-strategy-adoption"));
  });

  it("exposes data-role-lens-id for navigation contracts", () => {
    const { container } = render(<CapabilitiesSection selectedLens="Overview" />);
    for (const item of expertise) {
      expect(card(container, item.id)).toBeTruthy();
    }
  });
});
