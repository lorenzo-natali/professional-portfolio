/**
 * @vitest-environment node
 * Retrieval outcomes for professional-experience and complete radar-list questions.
 */
import { describe, expect, it } from "vitest";
import { knowledgeItems } from "../src/knowledge/pack.js";
import { retrieveKnowledge } from "../src/knowledge/retrieve.js";

const CURRENT = "experience-banca-profilo";
const PAST = "experience-boc";
const CATALOG = "radar-domain-index";

function hits(question) {
  return retrieveKnowledge(question);
}

function rankOf(question, id) {
  return hits(question).findIndex((hit) => hit.id === id);
}

const domainTitles = knowledgeItems
  .filter((entry) => entry.topic === "radar_domain")
  .map((entry) => entry.domain);

describe("professional AI governance retrieval", () => {
  const questions = [
    "Has Lorenzo worked professionally in AI governance?",
    "Does Lorenzo have professional AI governance experience?",
    "Has he contributed to an AI policy at work?",
    "What professional AI governance activities has he performed?",
  ];

  for (const question of questions) {
    it(`ranks Banca Profilo highly for: ${question}`, () => {
      const rank = rankOf(question, CURRENT);
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThan(3);
      expect(hits(question).find((hit) => hit.id === CURRENT)?.claimType).toBe("employment_current");
    });
  }

  it("keeps complementary AI records when asking whether experience is only personal", () => {
    const retrieved = hits("Is his AI governance experience only from personal projects?");
    expect(retrieved.some((hit) => hit.id === CURRENT)).toBe(true);
    expect(retrieved.some((hit) => hit.claimType === "project_personal" || hit.id === "capability-ai-governance")).toBe(
      true,
    );
  });
});

describe("DORA experience retrieval", () => {
  const bothEmployers = [
    "What experience is there with DORA?",
    "What experience does Lorenzo have with DORA?",
    "How does his current DORA experience differ from his previous experience?",
    "What operational resilience audits has he performed?",
  ];

  for (const question of bothEmployers) {
    it(`includes current and previous employment for: ${question}`, () => {
      const ids = hits(question).map((hit) => hit.id);
      expect(ids).toContain(CURRENT);
      expect(ids).toContain(PAST);
      expect(rankOf(question, CURRENT)).toBeLessThan(3);
    });
  }

  it("includes current DORA audit work for a current-work question", () => {
    expect(hits("What DORA-related work is he doing currently?").some((hit) => hit.id === CURRENT)).toBe(true);
    expect(hits("Has he audited DORA requirements?").some((hit) => hit.id === CURRENT)).toBe(true);
  });
});

describe("complete Risk Exposure list retrieval", () => {
  const questions = [
    "What are the seven Risk Exposure domains?",
    "List all the radar domains.",
    "Which risk areas are shown in the Risk Exposure chart?",
    "Can you name every domain in the radar?",
  ];

  for (const question of questions) {
    it(`returns the generated seven-domain catalog for: ${question}`, () => {
      const retrieved = hits(question);
      expect(retrieved[0]?.id).toBe(CATALOG);
      for (const title of domainTitles) {
        expect(retrieved[0].text).toContain(title);
      }
      expect(domainTitles).toHaveLength(7);
    });
  }

  it("does not let the catalog replace a single-domain description", () => {
    const retrieved = hits("What does the AI Governance radar domain describe?");
    expect(retrieved[0]?.id).toBe("radar-ai-model-governance");
    expect(retrieved.some((hit) => hit.id === CATALOG)).toBe(false);
  });
});

describe("retrieval regressions", () => {
  it("keeps current role, Bank of China, projects, certifications, and definitions distinct", () => {
    expect(hits("What is his current position?")[0]?.id).toBe(CURRENT);
    expect(hits("What did he do at Bank of China?").some((hit) => hit.id === PAST)).toBe(true);
    expect(hits("Which AI projects has he built?")[0]?.claimType).toBe("project_personal");
    expect(hits("Which AI projects has he built?").some((hit) => hit.claimType === "employment_current")).toBe(false);

    const planned = hits("Which certifications are planned?");
    expect(planned.some((hit) => hit.id === "credential-crisc" && hit.claimType === "credential_planned")).toBe(true);
    expect(planned.some((hit) => hit.id === "credential-aair" && hit.claimType === "credential_planned")).toBe(true);
    expect(planned.some((hit) => hit.claimType === "credential_completed")).toBe(false);

    const standard = hits("What does ISO/IEC 42006 cover?");
    expect(standard.some((hit) => hit.id === CURRENT)).toBe(true);
    expect(standard.some((hit) => hit.claimType === "credential_completed")).toBe(false);
    expect(standard.map((hit) => hit.text).join(" ")).toMatch(/Certification Requirements/i);

    const doraDefinition = hits("What is DORA?");
    expect(doraDefinition[0]?.claimType).not.toBe("employment_current");
    expect(doraDefinition.some((hit) => /dora/i.test(hit.text))).toBe(true);

    expect(hits("What does the Technology Risk lens highlight?")[0]?.id).toBe("role-lens-technology-risk");
  });
});
