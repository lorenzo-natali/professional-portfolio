/**
 * @vitest-environment node
 * Supplementary narratives, operational-resilience gating, and limited personal evaluations.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { SYSTEM_INSTRUCTIONS } from "../src/constants.js";
import { handleAskPost } from "../src/handleAsk.js";
import {
  evaluatePrivateOrUnsupportedGate,
  LEADERSHIP_LIMIT_ANSWER,
  PERSON_KIND_LIMIT_ANSWER,
  TEAM_FIT_LIMIT_ANSWER,
} from "../src/knowledge/gates.js";
import { knowledgeItems } from "../src/knowledge/pack.js";
import { retrieveKnowledge } from "../src/knowledge/retrieve.js";
import { createMemoryKv } from "./memoryKv.js";

const PROD_ORIGIN = "https://lorenzo-natali.github.io";

function env() {
  return {
    ASSISTANT_ALLOWED_ORIGINS: PROD_ORIGIN,
    ASSISTANT_AI_ENABLED: "true",
    OPENAI_API_KEY: "test-openai-key",
    QUOTA_KV: createMemoryKv(),
    ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
    ASSISTANT_IP_DAILY_LIMIT: "12",
    ASSISTANT_BURST_SECONDS: "1",
  };
}

function askRequest(question) {
  return new Request("https://assistant.example/ask", {
    method: "POST",
    headers: {
      Origin: PROD_ORIGIN,
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.56",
    },
    body: JSON.stringify({ question }),
  });
}

async function ask(question) {
  const createAnswer = vi.fn(async () => ({ ok: true, answer: "Grounded test answer." }));
  const response = await handleAskPost(askRequest(question), PROD_ORIGIN, env(), { createAnswer });
  const body = await response.json();
  const evidence = createAnswer.mock.calls[0]?.[0]?.evidence ?? [];
  return { response, body, createAnswer, evidence };
}

function ids(question) {
  return retrieveKnowledge(question).map((hit) => hit.id);
}

describe("supplementary knowledge pack", () => {
  it("keeps the visible portfolio free of assistant-only additions", () => {
    const portfolio = readFileSync("src/portfolio/portfolioData.js", "utf8");
    expect(portfolio).not.toContain("dedicated Internal Audit engagement");
    expect(portfolio).not.toContain("Cursor");
    expect(portfolio).not.toContain("Cline");
    expect(portfolio).not.toContain("philanthropy");
  });

  it("generates the four new narratives and three enrichments", () => {
    const byId = Object.fromEntries(knowledgeItems.map((item) => [item.id, item]));
    expect(byId["narrative-academic-path"].narrativeType).toBe("academic_path");
    expect(byId["narrative-academic-path"].text).toMatch(/philanthropy/i);
    expect(byId["narrative-academic-path"].text).toMatch(/not an account of why the bank hired him/i);
    expect(byId["narrative-audit-choice"].text).toMatch(/do not make the Bank of China role an IT Audit Specialist/i);
    expect(byId["narrative-audit-choice"].text).toMatch(/do not add audit duties to the Prelios internship/i);
    expect(byId["narrative-technical-practice"].text).toMatch(/independent learning/i);
    expect(byId["narrative-technical-practice"].text).not.toMatch(/^Lorenzo has no formal degree/);
    expect(byId["narrative-technical-practice"].text).toMatch(/does not attribute Cursor, Cline, Python or RAG/i);
    expect(byId["narrative-learning-approach"].text).toMatch(/three parts/i);
    expect(byId["narrative-learning-approach"].text).toMatch(/not as a personality trait/i);
    expect(byId["narrative-ai-governance-rationale"].text).toMatch(/dedicated Internal Audit engagement/i);
    expect(byId["narrative-ai-governance-rationale"].text).toMatch(/not sole authorship/i);
    expect(byId["narrative-ai-governance-rationale"].text).toMatch(/not leadership of the engagement/i);
    expect(byId["narrative-ai-governance-rationale"].text).toMatch(/not ownership/i);
    expect(byId["narrative-cross-sector-openness"].text).toMatch(/consulting/i);
    expect(byId["narrative-cross-sector-openness"].text).toMatch(/not past professional experience/i);
    expect(byId["narrative-long-term-direction"].text).toMatch(/data and model governance/i);
    expect(byId["narrative-long-term-direction"].text).toMatch(/not a role already held/i);
    expect(byId["experience-banca-profilo"].text).not.toMatch(/dedicated Internal Audit engagement/i);
    expect(byId["experience-prelios"].text).not.toMatch(/internal audit/i);
    expect(byId["project-codeiak"].text).toMatch(/local-first/i);
    expect(byId["project-codeiak"].text).not.toMatch(/Cursor|Cline|RAG/i);
  });
});

describe("professional questions reach OpenAI with the expected evidence", () => {
  it.each([
    ["What is Lorenzo's current role?", "experience-banca-profilo", ["narrative-academic-path", "narrative-learning-approach"]],
    ["Qual è il ruolo attuale di Lorenzo?", "experience-banca-profilo", ["narrative-academic-path"]],
    ["What is his experience with digital operational resilience?", "experience-banca-profilo", ["narrative-academic-path"]],
    ["Qual è la sua esperienza nella resilienza operativa digitale?", "experience-banca-profilo", ["narrative-academic-path"]],
    ["Why did Lorenzo choose Internal Audit?", "narrative-audit-choice", ["narrative-learning-approach"]],
    ["Perché Lorenzo ha scelto l'Internal Audit?", "narrative-audit-choice", []],
    ["What motivated his academic choices?", "narrative-academic-path", []],
    ["Cosa ha motivato le sue scelte accademiche?", "narrative-academic-path", []],
    ["How does Lorenzo learn a new technology?", "narrative-learning-approach", []],
    ["Come affronta Lorenzo l'apprendimento di una nuova tecnologia?", "narrative-learning-approach", []],
    ["Did Lorenzo audit Banca Profilo's AI Policy?", "narrative-ai-governance-rationale", []],
    ["Lorenzo ha partecipato a un audit sulla Policy AI di Banca Profilo?", "narrative-ai-governance-rationale", []],
    ["Does Lorenzo use Cursor, Cline and RAG?", "narrative-technical-practice", ["experience-banca-profilo"]],
    ["Qual è la sua esperienza pratica con LLM e agenti AI?", "narrative-technical-practice", ["experience-banca-profilo"]],
    ["What are Lorenzo's long-term career goals?", "narrative-long-term-direction", []],
    ["Quali sono i suoi obiettivi professionali futuri?", "narrative-long-term-direction", []],
  ])("%s retrieves %s and calls OpenAI", async (question, requiredId, absent) => {
    const gate = evaluatePrivateOrUnsupportedGate(question);
    expect(gate.blocked, question).toBe(false);
    const hitIds = ids(question);
    expect(hitIds, question).toContain(requiredId);
    for (const id of absent) expect(hitIds, question).not.toContain(id);
    const result = await ask(question);
    expect(result.createAnswer, question).toHaveBeenCalledOnce();
    expect(result.evidence.map((item) => item.id), question).toContain(requiredId);
  });

  it("keeps the AI Policy audit inside the audit role and not as ownership or leadership", () => {
    const record = knowledgeItems.find((item) => item.id === "narrative-ai-governance-rationale");
    expect(record.text).toMatch(/within Internal Audit/i);
    expect(record.text).toMatch(/not sole authorship/i);
    expect(record.text).toMatch(/not leadership of the engagement/i);
    expect(record.text).toMatch(/formal second-line/i);
    expect(record.text).not.toMatch(/enterprise-wide decision authority is implied/i);
  });
});

describe("personal evaluations stay limited", () => {
  it.each([
    ["Does Lorenzo seem interested in technology?", true, "narrative-technical-practice"],
    ["What are his professional strengths?", true, "capability_"],
  ])("%s can use professional evidence", async (question, openai, requiredId) => {
    expect(evaluatePrivateOrUnsupportedGate(question).blocked).toBe(false);
    const hits = retrieveKnowledge(question);
    if (requiredId.endsWith("_")) {
      expect(hits.some((hit) => String(hit.claimType).startsWith(requiredId))).toBe(true);
    } else {
      expect(hits.map((hit) => hit.id)).toContain(requiredId);
    }
    const result = await ask(question);
    expect(result.createAnswer.mock.calls.length > 0).toBe(openai);
  });

  it.each([
    ["Is Lorenzo a good leader?", LEADERSHIP_LIMIT_ANSWER],
    ["Lorenzo è un buon leader?", LEADERSHIP_LIMIT_ANSWER],
    ["What kind of person is Lorenzo?", PERSON_KIND_LIMIT_ANSWER],
    ["Che tipo di persona è Lorenzo?", PERSON_KIND_LIMIT_ANSWER],
    ["Would Lorenzo fit well in our team?", TEAM_FIT_LIMIT_ANSWER],
    ["Lorenzo si adatterebbe bene al nostro team?", TEAM_FIT_LIMIT_ANSWER],
  ])("%s stays local and does not judge the person", async (question, canonical) => {
    const result = await ask(question);
    expect(result.createAnswer).not.toHaveBeenCalled();
    expect(result.body.answer.length).toBeGreaterThan(40);
    expect(result.body.answer).not.toMatch(/he is a good leader|he would fit well|è un buon leader|si adatterebbe bene al/i);
    expect(result.body.answer).toMatch(/cannot make that judgment|does not establish|non può formulare|non stabilisce/i);
    expect(result.body.answer).toMatch(/portfolio|confronto|conversation|diretto/i);
    expect(result.body.answer).not.toMatch(/@|phone|email/i);
    if (question.match(/[àèéìòù]|\b(buon|persona|nostro|adatterebbe)\b/i)) {
      expect(result.body.answer).not.toBe(canonical);
    }
  });

  it.each([
    "How psychologically resilient is Lorenzo?",
    "Quanto è psicologicamente resiliente Lorenzo?",
    "What is Lorenzo's personality type?",
    "Qual è il tipo di personalità di Lorenzo?",
    "How does Lorenzo handle stress?",
    "Come gestisce Lorenzo lo stress?",
    "What is his emotional intelligence?",
    "Qual è la sua intelligenza emotiva?",
    "Can Lorenzo be trusted with confidential information?",
    "Lorenzo è affidabile con informazioni riservate?",
    "What salary does he want?",
  ])("%s does not call OpenAI", async (question) => {
    const result = await ask(question);
    expect(result.createAnswer).not.toHaveBeenCalled();
    expect(result.body.evidence).toEqual([]);
    expect(result.body.answer).not.toMatch(/psychologically resilient|good leader|trustworthy/i);
  });
});

describe("negative retrieval regressions", () => {
  it("does not treat operational resilience as psychology or as philanthropy", () => {
    const question = "What is Lorenzo's experience with digital operational resilience?";
    expect(evaluatePrivateOrUnsupportedGate(question).blocked).toBe(false);
    const hits = retrieveKnowledge(question);
    expect(hits.some((hit) => hit.id === "experience-banca-profilo")).toBe(true);
    expect(hits.some((hit) => hit.id === "narrative-academic-path")).toBe(false);
    expect(hits.some((hit) => /philanthropy/i.test(hit.text))).toBe(false);
  });

  it("does not let academic motivation replace the current role", () => {
    const hits = retrieveKnowledge("What is Lorenzo's current role?");
    expect(hits[0]?.id).toBe("experience-banca-profilo");
    expect(hits.some((hit) => hit.id === "narrative-academic-path")).toBe(false);
  });

  it("does not describe aspirations as the current duty record", () => {
    const hits = retrieveKnowledge("What are Lorenzo's long-term career goals?");
    const direction = hits.find((hit) => hit.id === "narrative-long-term-direction");
    expect(direction?.text).toMatch(/not a role already held/i);
    expect(hits[0]?.id).not.toBe("experience-banca-profilo");
  });
});

describe("grounding instructions", () => {
  it("distinguishes operational resilience from personal judgment", () => {
    expect(SYSTEM_INSTRUCTIONS).toMatch(/Digital operational resilience/);
    expect(SYSTEM_INSTRUCTIONS).toMatch(/not psychological resilience/);
    expect(SYSTEM_INSTRUCTIONS).toMatch(/learning method/);
    expect(SYSTEM_INSTRUCTIONS).toMatch(/does not establish that personal judgment/);
    expect(SYSTEM_INSTRUCTIONS).toMatch(/Do not invent contact details/);
  });
});
