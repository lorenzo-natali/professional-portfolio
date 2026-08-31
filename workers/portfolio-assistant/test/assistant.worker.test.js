/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { MAX_QUESTION_LENGTH } from "../src/constants.js";

const PROD_ORIGIN = "https://lorenzo-natali.github.io";
const LOCAL_ORIGIN = "http://127.0.0.1:5173";
const DISALLOWED_ORIGIN = "https://evil.example";

function env(extra = {}) {
  return {
    ASSISTANT_ALLOWED_ORIGINS: `${PROD_ORIGIN},${LOCAL_ORIGIN},http://localhost:5173`,
    ...extra,
  };
}

/**
 * @param {string} path
 * @param {RequestInit & { origin?: string | null }} [init]
 */
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

describe("portfolio assistant Worker — Phase A", () => {
  it("GET /health returns static alive JSON without OpenAI", async () => {
    const res = await worker.fetch(makeRequest("/health", { method: "GET" }), env());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      service: "portfolio-assistant",
      phase: "A",
      openai: false,
    });
  });

  it("POST /ask returns a Phase-A stub echo for a valid question", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        origin: PROD_ORIGIN,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "  What is CodeIAK?  " }),
      }),
      env(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(PROD_ORIGIN);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.phase).toBe("A");
    expect(body.stub).toBe(true);
    expect(body.openai).toBe(false);
    expect(body.echo).toEqual({ question: "What is CodeIAK?" });
    expect(typeof body.answer).toBe("string");
    expect(body.answer).toMatch(/Phase A/i);
    expect(body.answer).toMatch(/OpenAI is not connected/i);
    expect(body).not.toHaveProperty("origin");
    expect(body).not.toHaveProperty("headers");
    expect(JSON.stringify(body)).not.toMatch(/api[_-]?key|Authorization|sk-/i);
  });

  it("rejects malformed JSON", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      }),
      env(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "malformed_json" });
  });

  it("rejects missing question", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      env(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing_question" });
  });

  it("rejects empty / whitespace-only question", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "   " }),
      }),
      env(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "empty_question" });
  });

  it("rejects oversized question", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "x".repeat(MAX_QUESTION_LENGTH + 1) }),
      }),
      env(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "question_too_long" });
  });

  it("rejects wrong method on /ask", async () => {
    const res = await worker.fetch(makeRequest("/ask", { method: "GET" }), env());
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ ok: false, error: "method_not_allowed" });
    expect(res.headers.get("Allow")).toMatch(/POST/);
  });

  it("rejects unsupported content type", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ question: "Hello" }),
      }),
      env(),
    );
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({
      ok: false,
      error: "unsupported_media_type",
    });
  });

  it("echoes Access-Control-Allow-Origin for an allowed CORS origin", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        origin: LOCAL_ORIGIN,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "Hello" }),
      }),
      env(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(LOCAL_ORIGIN);
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("does not use wildcard CORS and omits ACAO for disallowed origins", async () => {
    const res = await worker.fetch(
      makeRequest("/ask", {
        method: "POST",
        origin: DISALLOWED_ORIGIN,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "Hello" }),
      }),
      env(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("handles OPTIONS preflight for allowed and disallowed origins", async () => {
    const allowed = await worker.fetch(
      makeRequest("/ask", {
        method: "OPTIONS",
        origin: PROD_ORIGIN,
        headers: { "Access-Control-Request-Method": "POST" },
      }),
      env(),
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(PROD_ORIGIN);
    expect(allowed.headers.get("Access-Control-Allow-Methods")).toMatch(/POST/);
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toMatch(/content-type/i);

    const denied = await worker.fetch(
      makeRequest("/ask", {
        method: "OPTIONS",
        origin: DISALLOWED_ORIGIN,
      }),
      env(),
    );
    expect(denied.status).toBe(204);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
