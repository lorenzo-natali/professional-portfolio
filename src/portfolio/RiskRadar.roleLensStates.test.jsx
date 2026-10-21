import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RiskRadar from "./RiskRadar.jsx";
import { radarDomains, sectionAnchors } from "./portfolioData.js";

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

describe("Risk Exposure approved domain content", () => {
  afterEach(cleanup);

  const byId = (id) => radarDomains.find((domain) => domain.id === id);

  it("keeps seven domains, their order, ids, and coordinates", () => {
    expect(radarDomains.map((domain) => domain.id)).toEqual([
      "radar-control-audit-risk",
      "radar-credit-risk",
      "radar-regulatory-compliance-risk",
      "radar-technology-ict-risk",
      "radar-information-security-governance",
      "radar-operational-resilience",
      "radar-ai-model-governance",
    ]);
    expect(radarDomains.map((domain) => [domain.id, domain.x, domain.y])).toEqual([
      ["radar-control-audit-risk", 50, 14],
      ["radar-credit-risk", 78.15, 27.55],
      ["radar-regulatory-compliance-risk", 85.1, 58.01],
      ["radar-technology-ict-risk", 65.62, 82.44],
      ["radar-information-security-governance", 34.38, 82.44],
      ["radar-operational-resilience", 14.9, 58.01],
      ["radar-ai-model-governance", 21.85, 27.55],
    ]);
  });

  it("keeps the three approved domains unchanged", () => {
    expect(byId("radar-control-audit-risk")).toMatchObject({
      title: "Internal Audit & Assurance",
      maturity: "Primary domain",
      category: "Assurance / Internal Audit",
      explanation:
        "Risk-based internal audit and assurance across internal controls, control design, audit documentation, working papers and governance structures — the connecting backbone of the profile.",
      signals: [
        "Risk-based internal audit",
        "Control testing & effectiveness",
        "Audit documentation & working papers",
        "Internal controls & governance review",
      ],
      sections: ["Experience", "Expertise"],
    });
    expect(byId("radar-regulatory-compliance-risk")).toMatchObject({
      title: "Regulatory & Supervisory Risk",
      maturity: "Primary domain",
      category: "Regulatory / Supervisory",
      explanation:
        "Direct assessment of prudential and supervisory frameworks (RAF, ICAAP, ILAAP, Pillar III), AML/KYC processes and FITD deposit-protection controls within a regulated banking environment, supported by framework knowledge of Basel III/IV and the CRD VI third-country branch regime.",
      signals: [
        "RAF, ICAAP, ILAAP, Pillar III",
        "AML / KYC processes",
        "FITD deposit-protection analysis",
        "Basel III/IV & CRD VI",
      ],
      sections: ["Experience", "Expertise"],
    });
    expect(byId("radar-information-security-governance")).toMatchObject({
      title: "Information Security Governance",
      maturity: "Developing domain",
      category: "Security / Governance",
      explanation:
        "Information security governance connecting security controls with audit and technology risk: professional exposure to information security controls, supported by framework knowledge of ISO/IEC 27001, NIST CSF and COBIT.",
      signals: ["Information security controls", "ISO/IEC 27001", "NIST CSF", "COBIT"],
      sections: ["Expertise", "Experience"],
    });
  });

  it("locks the four updated domain descriptions, focus areas, and links", () => {
    expect(byId("radar-credit-risk")).toMatchObject({
      title: "Banking & Credit Risk",
      maturity: "Primary domain",
      category: "Banking / Credit",
      explanation:
        "Internal audit review of credit risk drivers, corporate and syndicated loan portfolios, IFRS 9 / ECL methodologies and PD/LGD parameters, and their effect on provisioning in a regulated bank.",
      signals: [
        "Corporate credit & syndicated loans",
        "IFRS 9 / ECL",
        "PD & LGD risk parameters",
        "Financial covenants & credit-risk drivers",
      ],
      sections: ["Experience", "Expertise"],
    });
    expect(byId("radar-technology-ict-risk")).toMatchObject({
      title: "Technology & ICT Risk",
      maturity: "Developing domain",
      category: "Technology / ICT",
      explanation:
        "Risk-based IT auditing of ICT governance, technology-related controls and third-party technology risk in a regulated bank. Current engagements include DORA Pillar I, ICT change and incident management, and ICT outsourcing within the fiduciary business.",
      signals: [
        "Risk-based IT auditing",
        "DORA Pillar I",
        "ICT change and incident management",
        "ICT outsourcing and third-party risk",
      ],
      sections: ["Experience", "Expertise", "Credentials"],
    });
    expect(byId("radar-technology-ict-risk").explanation).not.toMatch(/developing focus on ITGC|access control/i);
    expect(byId("radar-operational-resilience")).toMatchObject({
      title: "Operational & Digital Resilience",
      maturity: "Developing domain",
      category: "Resilience / Continuity",
      explanation:
        "Audit experience in digital operational resilience, covering ICT change and incident management under DORA, alongside the assessment of business impact analysis, business continuity and disaster recovery arrangements, related controls and third-party dependencies.",
      signals: [
        "DORA and operational resilience",
        "ICT change and incident management",
        "BIA / BCP / DRP review",
        "Third-party and outsourcing dependencies",
      ],
      sections: ["Experience", "Expertise"],
    });
    expect(byId("radar-ai-model-governance")).toMatchObject({
      title: "AI Governance",
      maturity: "Emerging focus",
      category: "AI / Governance",
      explanation:
        "Professional experience contributing to AI governance and policy development within a regulated banking environment, with a focus on AI risk management, accountability, transparency and regulatory alignment. Familiarity with the EU AI Act, NIST AI RMF and ISO/IEC 23894, 42001 and 42005, complemented by practical AI projects focused on local models and auditability.",
      signals: [
        "AI Policy development contribution",
        "EU AI Act & NIST AI RMF",
        "ISO/IEC 23894, 42001 & 42005",
        "AI transparency & assurance frameworks",
      ],
      sections: ["Experience", "Expertise", "Project Deck"],
    });
    expect(byId("radar-ai-model-governance").sections).not.toContain("Credentials");
    expect(byId("radar-ai-model-governance").explanation).not.toMatch(
      /rather than direct professional/i,
    );
  });

  it("shows each domain's copy and valid section anchors when its node is selected", async () => {
    render(<RiskRadar selectedLens="Overview" />);
    await openRiskExposure();
    await expectPanelTitle("Internal Audit & Assurance");

    for (const domain of radarDomains) {
      fireEvent.click(domainButton(domain.title));
      await expectPanelTitle(domain.title);
      expect(screen.getByText(domain.category)).toBeTruthy();
      expect(screen.getByText(domain.explanation)).toBeTruthy();
      for (const signal of domain.signals) {
        expect(screen.getByText(signal)).toBeTruthy();
      }
      const links = screen.getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual(domain.sections);
      for (const link of links) {
        expect(sectionAnchors[link.textContent]).toBeTruthy();
        expect(link).toHaveAttribute("href", sectionAnchors[link.textContent]);
      }
    }
  });
});
