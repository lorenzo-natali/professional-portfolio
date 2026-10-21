import { describe, expect, it } from "vitest";
import { assistantPrompts, credentials, experiences, radarDomains, signalMap } from "./portfolioData.js";

const prompt = (id) => {
  const found = assistantPrompts.find((entry) => entry.id === id);
  expect(found).toBeTruthy();
  return found;
};

const experienceText = (id) => {
  const found = experiences.find((entry) => entry.id === id);
  return [found?.intro, ...(found?.points || []), ...(found?.details || [])].filter(Boolean).join(" ");
};

describe("suggested question answers", () => {
  it("gives every suggested question a displayable answer and known signals", () => {
    expect(assistantPrompts.length).toBeGreaterThan(0);
    for (const entry of assistantPrompts) {
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(0);
      expect(entry.categories.length).toBeGreaterThan(0);
      for (const signalId of entry.signalIds) {
        expect(signalMap[signalId], signalId).toBeTruthy();
      }
    }
  });

  it("keeps static answers consistent with current professional experience", () => {
    const answers = assistantPrompts.map((entry) => entry.answer).join("\n");
    const banca = experienceText("experience-banca-profilo");
    expect(banca).toMatch(/DORA Pillar I/);
    expect(banca).toMatch(/AI Policy/);
    expect(answers).not.toMatch(/rather than direct professional/i);
    expect(answers).not.toMatch(/AI-assisted development tools/i);
    expect(answers).not.toMatch(/I (am|hold) (CISA|CRISC|AAIR|FRM) certified/i);
    expect(answers).not.toMatch(/completed (CISA|CRISC|AAIR|FRM)/i);
  });

  it("recognizes the Banca Profilo AI Policy contribution without overstating authority", () => {
    const answer = prompt("assistant-ai-governance-exposure").answer;
    expect(answer).toMatch(/IT Audit Specialist/);
    expect(answer).toContain("Banca Profilo");
    expect(answer).toMatch(/policy development/i);
    expect(answer).toMatch(/EU AI Act/);
    expect(answer).toMatch(/NIST AI RMF/);
    expect(answer).toMatch(/do not own the Bank's AI Policy/i);
    expect(answer).toMatch(/AAIR remains planned/i);
    expect(answer).toMatch(/complement/i);
    expect(experienceText("experience-banca-profilo")).toMatch(/AI Policy/);
  });

  it("distinguishes current DORA audit work from earlier Bank of China resilience review", () => {
    const answer = prompt("assistant-operational-resilience-dora").answer;
    const banca = experienceText("experience-banca-profilo");
    const boc = experienceText("experience-boc");
    expect(banca).toMatch(/DORA Pillar I/);
    expect(boc).toMatch(/Business Impact Analysis/);
    expect(answer).toContain("Banca Profilo");
    expect(answer).toMatch(/DORA Pillar I/);
    expect(answer).toMatch(/ICT change and incident management/);
    expect(answer).toContain("Bank of China");
    expect(answer).toMatch(/business impact analysis/i);
    expect(answer).toMatch(/business continuity/i);
    expect(answer).toMatch(/disaster recovery/i);
    expect(answer).toMatch(/not ownership of a DORA compliance programme/i);
  });

  it("does not present planned certifications as completed", () => {
    const planned = credentials.filter((entry) => /^planned/i.test(entry.subtitle));
    expect(planned.map((entry) => entry.id)).toEqual([
      "credential-crisc",
      "credential-aair",
      "credential-frm",
    ]);
    const roadmap = prompt("assistant-certification-roadmap").answer;
    expect(roadmap).toMatch(/CISA → CRISC → AAIR → FRM/);
    expect(prompt("assistant-cisa-preparation").answer).toMatch(/preparing for CISA/i);
    expect(prompt("assistant-cisa-preparation").answer).toMatch(/do not yet hold CISA/i);
    expect(prompt("assistant-crisc-rationale").question).toMatch(/planning CRISC/i);
    expect(prompt("assistant-aair-rationale").answer).toMatch(/not one I hold/i);
    expect(prompt("assistant-aair-rationale").answer).toMatch(/remain planned/i);
    expect(prompt("assistant-frm-planning").answer).toMatch(/longer-term/i);
  });

  it("keeps the seven radar domain titles available as the canonical list", () => {
    expect(radarDomains).toHaveLength(7);
    expect(radarDomains.map((domain) => domain.title)).toEqual([
      "Internal Audit & Assurance",
      "Banking & Credit Risk",
      "Regulatory & Supervisory Risk",
      "Technology & ICT Risk",
      "Information Security Governance",
      "Operational & Digital Resilience",
      "AI Governance",
    ]);
  });
});
