/**
 * @vitest-environment node
 * Locks the generated pack to the current frontend facts.
 */
import { describe, expect, it } from "vitest";
import { knowledgeItems } from "../src/knowledge/pack.js";
import { retrieveKnowledge } from "../src/knowledge/retrieve.js";

function item(id) {
  const found = knowledgeItems.find((entry) => entry.id === id);
  expect(found).toBeTruthy();
  return found;
}

describe("synchronized assistant knowledge", () => {
  it("keeps the current Banca Profilo record complete and current", () => {
    const role = item("experience-banca-profilo");
    expect(role.claimType).toBe("employment_current");
    expect(role.text).toContain("IT Audit Specialist at Banca Profilo · Milan (September 2026 – Present)");
    expect(role.text).toContain("DORA Pillar I");
    expect(role.text).toContain("ICT change management and incident management");
    expect(role.text).toContain("fiduciary business");
    expect(role.text).toContain("Bank's internal AI Policy");
    expect(role.text).toContain("ISO/IEC 42006:2025 (AI Management System Audit and Certification Requirements)");
    expect(role.text).toContain("Code of Practice on Transparency of AI-generated Content");
    expect(role.text).not.toMatch(/joining Banca Profilo/i);
  });

  it("does not deny professional AI governance experience", () => {
    const blob = knowledgeItems.map((entry) => entry.text).join("\n");
    expect(blob).not.toMatch(/rather than direct professional AI-governance experience/i);
    expect(item("radar-ai-model-governance").text).toContain(
      "Professional experience contributing to AI governance and policy development",
    );
    expect(item("capability-ai-governance").text).toContain(
      "Hands-on experience in AI governance and policy development",
    );
  });

  it("synchronizes both slider lists and the seven radar domains", () => {
    expect(item("stack-risk-regulatory").text).toContain(
      "Topics: Internal Audit, Internal Controls, Risk Assessment, Credit Risk, IFRS 9 / ECL, ECB Supervision, Basel III / IV, CRD VI / Third-Country Branches, RAF, ICAAP / ILAAP, Pillar III, AML / KYC.",
    );
    expect(item("stack-technology-security-ai").text).toContain("ISO/IEC 42006, AI Transparency / Article 50");
    expect(item("stack-technology-security-ai").text).not.toContain("Cline Desktop");
    expect(item("stack-technology-security-ai").text).not.toContain("Operational Resilience");
    expect(item("radar-technology-ict-risk").text).toContain("ICT outsourcing within the fiduciary business");
    expect(item("radar-operational-resilience").text).toContain("BIA / BCP / DRP review");
    expect(item("radar-ai-model-governance").text).toContain(
      "Related portfolio sections: Experience, Expertise, Project Deck.",
    );
    expect(item("radar-ai-model-governance").status).toBe("Emerging focus");
    expect(knowledgeItems.filter((entry) => entry.topic === "radar_domain")).toHaveLength(7);
    const catalog = item("radar-domain-index");
    expect(catalog.topic).toBe("radar_catalog");
    expect(catalog.text).toContain("exactly seven domains");
    for (const domain of knowledgeItems.filter((entry) => entry.topic === "radar_domain")) {
      expect(catalog.text).toContain(domain.domain);
    }
  });

  it("synchronizes the corrected Role Lens mappings", () => {
    const ai = item("role-lens-ai-governance").text;
    expect(ai).toContain("experiences: experience-banca-profilo");
    expect(ai).toContain("capability-ai-governance, capability-ai-strategy-adoption");
    expect(ai).not.toContain("capability-technology-risk");
    expect(item("role-lens-it-audit").text).toContain("Risk Assessment, DORA");
    expect(item("role-lens-technology-risk").text).toContain("EBA ICT & Security Risk, EBA Outsourcing Guidelines");
    expect(item("role-lens-banking-risk").text).toContain("RAF, AML / KYC, ECB Supervision");
    expect(item("role-lens-overview").text).toContain("Overview applies no selective highlighting");
    expect(item("role-lens-overview").text).toContain("does not alter radar content");
  });

  it("keeps certification claim strength", () => {
    expect(item("credential-cisa").claimType).toBe("credential_in_progress");
    expect(item("credential-crisc").claimType).toBe("credential_planned");
    expect(item("credential-aair").claimType).toBe("credential_planned");
    expect(item("credential-frm").claimType).toBe("credential_planned");
  });

  it("retrieves the current role, the AI Policy contribution, and the AI radar description", () => {
    expect(retrieveKnowledge("What is Lorenzo's current role?")[0]?.id).toBe("experience-banca-profilo");
    expect(
      retrieveKnowledge("What was the contribution to the Bank's AI Policy?").some(
        (hit) => hit.id === "experience-banca-profilo",
      ),
    ).toBe(true);
    expect(
      retrieveKnowledge("What does ISO/IEC 42006 represent in this profile?").some(
        (hit) => hit.id === "experience-banca-profilo",
      ),
    ).toBe(true);
    expect(retrieveKnowledge("What does the AI Governance radar domain describe?")[0]?.id).toBe(
      "radar-ai-model-governance",
    );
    expect(retrieveKnowledge("What is highlighted by the Technology Risk Role Lens?")[0]?.id).toBe(
      "role-lens-technology-risk",
    );
  });
});
