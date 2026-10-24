/**
 * @vitest-environment node
 * Lexical precision for leadership, team fit, reliability, and emotional wording.
 */
import { describe, expect, it, vi } from "vitest";
import { handleAskPost } from "../src/handleAsk.js";
import {
  evaluatePrivateOrUnsupportedGate,
  LEADERSHIP_LIMIT_ANSWER,
  PORTFOLIO_GAP_ANSWER,
  PRIVATE_INFO_ANSWER,
  TEAM_FIT_LIMIT_ANSWER,
} from "../src/knowledge/gates.js";
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
      "cf-connecting-ip": "203.0.113.77",
    },
    body: JSON.stringify({ question }),
  });
}

async function ask(question) {
  const createAnswer = vi.fn(async () => ({ ok: true, answer: "Grounded test answer." }));
  const response = await handleAskPost(askRequest(question), PROD_ORIGIN, env(), { createAnswer });
  const body = await response.json();
  return { body, createAnswer };
}

describe("professional wording passes the personal and psychological gates", () => {
  it.each([
    "What is leadership's role in IT governance?",
    "What leadership responsibilities are involved in technology risk management?",
    "Quali controlli rendono affidabile un sistema AI?",
    "What controls make an AI system trustworthy?",
    "Come si adatterebbe un processo ai requisiti DORA?",
    "What is emotional intelligence as a general concept?",
    "Cos'è l'intelligenza emotiva?",
    "What motivated his academic choices?",
    "Cosa ha motivato le sue scelte accademiche?",
    "What is his experience with digital operational resilience?",
    "Qual è la sua esperienza nella resilienza operativa digitale?",
  ])("%s is not a personal or psychological block", async (question) => {
    const gate = evaluatePrivateOrUnsupportedGate(question);
    expect(gate.blocked, question).toBe(false);
    const result = await ask(question);
    expect(result.body.answer).not.toBe(LEADERSHIP_LIMIT_ANSWER);
    expect(result.body.answer).not.toBe(TEAM_FIT_LIMIT_ANSWER);
    expect(result.body.answer).not.toMatch(/stile di leadership|adeguatezza a un team/i);
  });

  it.each([
    "What motivated his academic choices?",
    "Cosa ha motivato le sue scelte accademiche?",
    "What is his experience with digital operational resilience?",
    "Qual è la sua esperienza nella resilienza operativa digitale?",
  ])("%s still continues to retrieval and OpenAI", async (question) => {
    const result = await ask(question);
    expect(result.createAnswer, question).toHaveBeenCalledOnce();
  });
});

describe("unsupported personal evaluations stay limited", () => {
  it.each([
    ["Is Lorenzo a leader?", LEADERSHIP_LIMIT_ANSWER],
    ["Is Lorenzo a good leader?", LEADERSHIP_LIMIT_ANSWER],
    ["Are you a natural leader?", LEADERSHIP_LIMIT_ANSWER],
    ["Lorenzo è un leader?", LEADERSHIP_LIMIT_ANSWER],
    ["Would he be a good fit?", TEAM_FIT_LIMIT_ANSWER],
    ["Would Lorenzo be a good fit?", TEAM_FIT_LIMIT_ANSWER],
    ["Would Lorenzo fit well in our team?", TEAM_FIT_LIMIT_ANSWER],
    ["Lorenzo si adatterebbe bene al nostro team?", TEAM_FIT_LIMIT_ANSWER],
  ])("%s returns the existing limited answer", async (question, canonical) => {
    const gate = evaluatePrivateOrUnsupportedGate(question);
    expect(gate).toMatchObject({
      blocked: true,
      answer: canonical,
      reason: "personal_evaluation_limited",
    });
    const result = await ask(question);
    expect(result.createAnswer).not.toHaveBeenCalled();
    expect(result.body.evidence).toEqual([]);
    expect(result.body.answer).toMatch(/does not establish|cannot make that judgment|non stabilisce|non può formulare/i);
    expect(result.body.answer).not.toMatch(/he is a (?:good )?leader|he would fit well|è un buon leader/i);
  });
});

describe("sensitive and private questions stay blocked", () => {
  it.each([
    ["What is Lorenzo's personality type?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["How emotionally stable is Lorenzo?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["How does Lorenzo handle stress?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["What is his emotional intelligence?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["Qual è la sua intelligenza emotiva?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["Is Lorenzo trustworthy?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["Lorenzo è affidabile con informazioni riservate?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["How psychologically resilient is Lorenzo?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["Quanto è psicologicamente resiliente Lorenzo?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["What motivates you personally?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["Cosa ti motiva personalmente?", "psychological_inference_blocked", PORTFOLIO_GAP_ANSWER],
    ["What salary does he want?", "private_information", PRIVATE_INFO_ANSWER],
    ["Qual è il suo stipendio?", "private_information", PRIVATE_INFO_ANSWER],
  ])("%s does not continue to retrieval", async (question, reason, canonical) => {
    const gate = evaluatePrivateOrUnsupportedGate(question);
    expect(gate).toMatchObject({ blocked: true, answer: canonical, reason });
    const result = await ask(question);
    expect(result.createAnswer).not.toHaveBeenCalled();
    expect(result.body.evidence).toEqual([]);
    expect(result.body.answer).not.toMatch(/trustworthy|emotionally stable|psicologicamente resiliente/i);
  });
});
