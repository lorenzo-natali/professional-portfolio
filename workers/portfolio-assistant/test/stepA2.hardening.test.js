/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handleAskPost } from "../src/handleAsk.js";
import { MAX_ASK_BODY_BYTES, PRODUCTION_ALLOWED_ORIGIN } from "../src/constants.js";
import {
  consumeAskQuota,
  parseAbuseControlInt,
  resolveAbuseControlConfig,
  resolveTrustedClientIp,
} from "../src/quota.js";
import { readAskJsonBody } from "../src/readAskJsonBody.js";
import {
  assertProductionAssistantOrigins,
  verifyProductionAssistantConfigFile,
} from "../src/productionConfig.js";
import { createMemoryKv } from "./memoryKv.js";

const PROD_ORIGIN = PRODUCTION_ALLOWED_ORIGIN;

function env(extra = {}) {
  return {
    ASSISTANT_AI_ENABLED: "true",
    OPENAI_API_KEY: "test-openai-key",
    QUOTA_KV: createMemoryKv(),
    ASSISTANT_CLIENT_IP_MODE: "cloudflare",
    ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
    ASSISTANT_IP_DAILY_LIMIT: "12",
    ASSISTANT_BURST_SECONDS: "4",
    ...extra,
  };
}

function askReq(body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("https://assistant.example/ask", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      ...headers,
    },
    body: payload,
  });
}

describe("STEP A.2 body size ceiling", () => {
  it("accepts bodies under 6 KB", async () => {
    const createAnswer = vi.fn(async () => ({ ok: true, answer: "ok" }));
    const res = await handleAskPost(
      askReq({ question: "What is CodeIAK?" }),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(res.status).toBe(200);
    expect(createAnswer).toHaveBeenCalledTimes(1);
  });

  it("rejects bodies over 6 KB with 413 and zero OpenAI", async () => {
    const createAnswer = vi.fn();
    const oversized = JSON.stringify({
      question: "What is CodeIAK?",
      pad: "x".repeat(MAX_ASK_BODY_BYTES),
    });
    expect(Buffer.byteLength(oversized)).toBeGreaterThan(MAX_ASK_BODY_BYTES);
    const res = await handleAskPost(
      askReq(oversized),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ ok: false, error: "payload_too_large" });
    expect(createAnswer).not.toHaveBeenCalled();
  });

  it("rejects when Content-Length claims oversize before reading", async () => {
    const result = await readAskJsonBody(
      new Request("https://assistant.example/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(MAX_ASK_BODY_BYTES + 1),
        },
        body: JSON.stringify({ question: "hi" }),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "payload_too_large",
      httpStatus: 413,
    });
  });

  it("does not allow absent or undersized Content-Length to bypass the actual ceiling", async () => {
    const createAnswer = vi.fn();
    const oversized = JSON.stringify({
      question: "hi",
      pad: "y".repeat(MAX_ASK_BODY_BYTES),
    });
    const res = await handleAskPost(
      askReq(oversized, { "content-length": "12" }),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(res.status).toBe(413);
    expect(createAnswer).not.toHaveBeenCalled();

    const noLen = await handleAskPost(
      new Request("https://assistant.example/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.10",
        },
        body: oversized,
      }),
      PROD_ORIGIN,
      env(),
      { createAnswer },
    );
    expect(noLen.status).toBe(413);
    expect(createAnswer).not.toHaveBeenCalled();
  });
});

describe("STEP A.2 trusted IP", () => {
  it("uses CF-Connecting-IP and ignores spoofed X-Forwarded-For", async () => {
    const kv = createMemoryKv();
    const e = env({ QUOTA_KV: kv });
    const reqA = new Request("https://assistant.example/ask", {
      headers: {
        "cf-connecting-ip": "198.51.100.1",
        "x-forwarded-for": "203.0.113.99",
      },
    });
    const reqB = new Request("https://assistant.example/ask", {
      headers: {
        "cf-connecting-ip": "198.51.100.1",
        "x-forwarded-for": "198.51.100.2",
      },
    });
    expect(resolveTrustedClientIp(reqA, e)).toEqual({
      ok: true,
      ip: "198.51.100.1",
    });
    expect(await consumeAskQuota({ request: reqA, env: e, nowMs: 1_000 })).toEqual({
      ok: true,
    });
    // Same CF IP → burst blocks regardless of different XFF
    expect(await consumeAskQuota({ request: reqB, env: e, nowMs: 1_500 })).toEqual({
      ok: false,
      error: "quota_exceeded",
      httpStatus: 429,
    });
  });

  it("fails closed before OpenAI when trusted IP is missing", async () => {
    const createAnswer = vi.fn();
    const res = await handleAskPost(
      new Request("https://assistant.example/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.50",
        },
        body: JSON.stringify({ question: "What is CodeIAK?" }),
      }),
      PROD_ORIGIN,
      env({ ASSISTANT_CLIENT_IP_MODE: "cloudflare" }),
      { createAnswer },
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
    expect(createAnswer).not.toHaveBeenCalled();
  });

  it("dev mode uses synthetic identity and still ignores XFF", () => {
    const req = new Request("https://assistant.example/ask", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(resolveTrustedClientIp(req, { ASSISTANT_CLIENT_IP_MODE: "dev" })).toEqual({
      ok: true,
      ip: "dev-local",
    });
  });
});

describe("STEP A.2 quota config fail-closed", () => {
  it("rejects zero / negative / non-numeric / NaN-like values", () => {
    expect(parseAbuseControlInt("0", 80, { min: 1, max: 500 }).ok).toBe(false);
    expect(parseAbuseControlInt("-1", 80, { min: 1, max: 500 }).ok).toBe(false);
    expect(parseAbuseControlInt("nope", 80, { min: 1, max: 500 }).ok).toBe(false);
    expect(parseAbuseControlInt("12.5", 80, { min: 1, max: 500 }).ok).toBe(false);
    expect(parseAbuseControlInt("", 80, { min: 1, max: 500 })).toEqual({
      ok: true,
      value: 80,
    });
  });

  it("fails closed with zero OpenAI when global/ip/burst config is invalid", async () => {
    const cases = [
      { ASSISTANT_GLOBAL_DAILY_LIMIT: "0" },
      { ASSISTANT_GLOBAL_DAILY_LIMIT: "-3" },
      { ASSISTANT_GLOBAL_DAILY_LIMIT: "abc" },
      { ASSISTANT_IP_DAILY_LIMIT: "0" },
      { ASSISTANT_IP_DAILY_LIMIT: "NaN" },
      { ASSISTANT_BURST_SECONDS: "0" },
      { ASSISTANT_BURST_SECONDS: "-1" },
    ];
    for (const bad of cases) {
      const createAnswer = vi.fn();
      const res = await handleAskPost(
        askReq({ question: "What is CodeIAK?" }),
        PROD_ORIGIN,
        env(bad),
        { createAnswer },
      );
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        ok: false,
        error: "server_configuration_error",
      });
      expect(createAnswer).not.toHaveBeenCalled();
      expect(resolveAbuseControlConfig(env(bad)).ok).toBe(false);
    }
  });
});

describe("STEP A.2 production config invariant", () => {
  it("requires exactly the GitHub Pages origin and rejects localhost", () => {
    expect(
      assertProductionAssistantOrigins(
        'ASSISTANT_ALLOWED_ORIGINS = "https://lorenzo-natali.github.io"',
      ),
    ).toEqual({ ok: true });
    expect(
      assertProductionAssistantOrigins(
        'ASSISTANT_ALLOWED_ORIGINS = "https://lorenzo-natali.github.io,http://localhost:5173"',
      ).ok,
    ).toBe(false);
    expect(
      assertProductionAssistantOrigins(
        'ASSISTANT_ALLOWED_ORIGINS = "http://127.0.0.1:5173"',
      ).ok,
    ).toBe(false);
  });

  it("verifies wrangler.production.toml.example", () => {
    expect(verifyProductionAssistantConfigFile()).toEqual({ ok: true });
    const text = readFileSync(
      join(
        process.cwd(),
        "workers/portfolio-assistant/wrangler.production.toml.example",
      ),
      "utf8",
    );
    const origins = text.match(/ASSISTANT_ALLOWED_ORIGINS\s*=\s*"([^"]*)"/)?.[1];
    expect(origins).toBe(PRODUCTION_ALLOWED_ORIGIN);
    expect(origins).not.toMatch(/localhost|127\.0\.0\.1/);
  });
});
