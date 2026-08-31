/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { handleAskPost } from "../src/handleAsk.js";
import { MAX_QUESTION_LENGTH, OPENAI_MODEL, PHASE } from "../src/constants.js";
import { createMemoryKv } from "./memoryKv.js";

const PROD_ORIGIN = "https://lorenzo-natali.github.io";
const LOCAL_ORIGIN = "http://127.0.0.1:5173";
const DISALLOWED_ORIGIN = "https://evil.example";

function env(extra = {}) {
  return {
    ASSISTANT_ALLOWED_ORIGINS: `${PROD_ORIGIN},${LOCAL_ORIGIN},http://localhost:5173`,
    ASSISTANT_AI_ENABLED: "true",
    OPENAI_API_KEY: "test-openai-key",
    QUOTA_KV: createMemoryKv(),
    ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
    ASSISTANT_IP_DAILY_LIMIT: "12",
    ASSISTANT_BURST_SECONDS: "1",
    ...extra,
  };
}

function makeRequest(path, init = {}) {
  const { origin, headers: initHeaders, ...rest } = init;
  /** @type {Record<string, string>} */
  const headers = { ...(initHeaders || {}) };
  if (origin !== null && origin !== undefined) {
    headers.Origin = origin;
  }
  return new Request(`https://assistant.example${path}`, {
    ...rest,
    headers,
  });
}

function askRequest(question, init = {}) {
  const { headers: initHeaders, ...rest } = init;
  return makeRequest("/ask", {
    method: "POST",
    origin: PROD_ORIGIN,
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      ...(initHeaders || {}),
    },
    body: typeof question === "string" ? JSON.stringify({ question }) : question,
    ...rest,
  });
}

describe("portfolio assistant Worker — Phase B API", () => {
  it("GET /health reports Phase B readiness accurately", async () => {
    const ready = await worker.fetch(makeRequest("/health", { method: "GET" }), env());
    expect(ready.status).toBe(200);
    expect(await ready.json()).toMatchObject({
      ok: true,
      service: "portfolio-assistant",
      phase: PHASE,
      openai: true,
      ai_enabled: true,
      openai_configured: true,
      quota_configured: true,
    });

    const noKey = await worker.fetch(
      makeRequest("/health", { method: "GET" }),
      env({ OPENAI_API_KEY: "" }),
    );
    expect(await noKey.json()).toMatchObject({
      phase: "B",
      openai: false,
      openai_configured: false,
    });
  });

  it("POST /ask returns grounded success for a valid request with mocked OpenAI", async () => {
    const createAnswer = vi.fn(async () => ({
      ok: true,
      answer: "CodeIAK is a local-first AI coding agent project.",
    }));
    const res = await handleAskPost(
      askRequest("What is CodeIAK?"),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(PROD_ORIGIN);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.answer).toMatch(/CodeIAK/);
    expect(Array.isArray(body.evidence)).toBe(true);
    expect(body.evidence.some((e) => e.id === "project-codeiak")).toBe(true);
    expect(body).not.toHaveProperty("output");
    expect(body).not.toHaveProperty("choices");
    expect(JSON.stringify(body)).not.toMatch(/test-openai-key|Authorization|sk-/i);
    expect(createAnswer).toHaveBeenCalledTimes(1);
    expect(createAnswer.mock.calls[0][0].question).toBe("What is CodeIAK?");
  });

  it("rejects malformed JSON / missing / empty / oversized questions", async () => {
    const e = env();
    const malformed = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      }),
      e,
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ ok: false, error: "malformed_json" });

    const missing = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      e,
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ ok: false, error: "missing_question" });

    const empty = await worker.fetch(askRequest("   "), e);
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ ok: false, error: "empty_question" });

    const oversized = await worker.fetch(
      askRequest("x".repeat(MAX_QUESTION_LENGTH + 1)),
      e,
    );
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({ ok: false, error: "question_too_long" });
  });

  it("rejects wrong method and unsupported content type", async () => {
    const e = env();
    const method = await worker.fetch(makeRequest("/ask", { method: "GET" }), e);
    expect(method.status).toBe(405);
    expect(await method.json()).toEqual({ ok: false, error: "method_not_allowed" });

    const ctype = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ question: "Hello" }),
      }),
      e,
    );
    expect(ctype.status).toBe(415);
    expect(await ctype.json()).toEqual({ ok: false, error: "unsupported_media_type" });
  });

  it("returns configuration error when OPENAI_API_KEY is missing", async () => {
    const res = await worker.fetch(
      askRequest("What is CodeIAK?"),
      env({ OPENAI_API_KEY: undefined }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
  });

  it("returns a bounded fallback without calling OpenAI when evidence is empty", async () => {
    const createAnswer = vi.fn();
    const res = await handleAskPost(
      askRequest("What is the weather in Antarctica tomorrow?"),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      answer:
        "The public portfolio does not provide enough information to answer that question.",
      evidence: [],
    });
    expect(createAnswer).not.toHaveBeenCalled();
  });

  it("maps mocked OpenAI timeout / provider errors without leakage", async () => {
    const timeout = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, env(), {
      createAnswer: async () => ({
        ok: false,
        error: "openai_timeout",
        httpStatus: 504,
      }),
    });
    expect(timeout.status).toBe(504);
    expect(await timeout.json()).toEqual({ ok: false, error: "openai_timeout" });

    const unavailable = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, env(), {
      createAnswer: async () => ({
        ok: false,
        error: "openai_unavailable",
        httpStatus: 503,
      }),
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ ok: false, error: "openai_unavailable" });

    const invalid = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, env(), {
      createAnswer: async () => ({
        ok: false,
        error: "invalid_provider_response",
        httpStatus: 502,
      }),
    });
    expect(invalid.status).toBe(502);
    const invalidBody = await invalid.json();
    expect(invalidBody).toEqual({ ok: false, error: "invalid_provider_response" });
    expect(JSON.stringify(invalidBody)).not.toMatch(/output|choices|usage/i);
  });

  it("enforces quota when burst/limit exceeded", async () => {
    const kv = createMemoryKv();
    const e = env({
      QUOTA_KV: kv,
      ASSISTANT_BURST_SECONDS: "60",
      ASSISTANT_IP_DAILY_LIMIT: "1",
    });
    const createAnswer = vi.fn(async () => ({ ok: true, answer: "ok" }));

    const first = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, e, {
      createAnswer,
    });
    expect(first.status).toBe(200);

    const second = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, e, {
      createAnswer,
    });
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({ ok: false, error: "quota_exceeded" });
    expect(createAnswer).toHaveBeenCalledTimes(1);
  });

  it("preserves CORS allowlist behavior without wildcard", async () => {
    const e = env();
    const allowed = await worker.fetch(
      makeRequest("/ask", {
        method: "OPTIONS",
        origin: PROD_ORIGIN,
        headers: { "Access-Control-Request-Method": "POST" },
      }),
      e,
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(PROD_ORIGIN);

    const denied = await worker.fetch(
      makeRequest("/ask", {
        method: "OPTIONS",
        origin: DISALLOWED_ORIGIN,
      }),
      e,
    );
    expect(denied.status).toBe(204);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(denied.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("keeps the OpenAI model fixed server-side", () => {
    expect(OPENAI_MODEL).toBe("gpt-5.6-luna");
  });

  it("disables OpenAI via ASSISTANT_AI_ENABLED without calling the model", async () => {
    const createAnswer = vi.fn();
    const res = await handleAskPost(
      askRequest("What is CodeIAK?"),
      PROD_ORIGIN,
      env({ ASSISTANT_AI_ENABLED: "false" }),
      { createAnswer },
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
    expect(createAnswer).not.toHaveBeenCalled();

    const health = await worker.fetch(
      makeRequest("/health", { method: "GET" }),
      env({ ASSISTANT_AI_ENABLED: "false", OPENAI_API_KEY: "test-openai-key" }),
    );
    const body = await health.json();
    expect(body).toMatchObject({
      openai: false,
      ai_enabled: false,
      openai_configured: true,
    });
    expect(JSON.stringify(body)).not.toMatch(/test-openai-key|sk-/);
  });

  it("fails closed when KV throws during quota checks", async () => {
    const createAnswer = vi.fn();
    const res = await handleAskPost(askRequest("What is CodeIAK?"), PROD_ORIGIN, env({
      QUOTA_KV: {
        async get() {
          throw new Error("kv down");
        },
        async put() {
          throw new Error("kv down");
        },
      },
    }), { createAnswer });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
    expect(createAnswer).not.toHaveBeenCalled();
  });
});
