/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { handleAskPost } from "../src/handleAsk.js";
import { handleAvailabilityGet } from "../src/handleAvailability.js";
import { consumeAskQuota, nextUtcMidnightIso, utcDayKey } from "../src/quota.js";
import { createMemoryKv } from "./memoryKv.js";

const PROD_ORIGIN = "https://lorenzo-natali.github.io";
const DISALLOWED_ORIGIN = "https://evil.example";
const VISITOR = "203.0.113.77";
const DAY = Date.parse("2026-10-18T12:00:00.000Z");

function quotaEnv(kv, extra = {}) {
  return {
    QUOTA_KV: kv,
    ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
    ASSISTANT_IP_DAILY_LIMIT: "12",
    ASSISTANT_BURST_SECONDS: "4",
    ASSISTANT_CLIENT_IP_MODE: "cloudflare",
    ...extra,
  };
}

function visitorRequest(ip = VISITOR) {
  return new Request("https://assistant.example/availability", {
    method: "GET",
    headers: {
      Origin: PROD_ORIGIN,
      "cf-connecting-ip": ip,
    },
  });
}

async function accept(kv, ip, count, startMs) {
  let now = startMs;
  for (let i = 0; i < count; i += 1) {
    const result = await consumeAskQuota({
      request: new Request("https://assistant.example/ask", {
        headers: { "cf-connecting-ip": ip },
      }),
      env: quotaEnv(kv),
      nowMs: now,
    });
    expect(result).toEqual({ ok: true });
    now += 5000;
  }
}

async function fillGlobalExceptVisitor(kv, visitorCount) {
  await accept(kv, VISITOR, visitorCount, DAY);
  let remaining = 80 - visitorCount;
  let octet = 1;
  while (remaining > 0) {
    const batch = Math.min(12, remaining);
    await accept(kv, `198.51.100.${octet}`, batch, DAY);
    remaining -= batch;
    octet += 1;
  }
}

async function readAvailability(kv, nowMs, ip = VISITOR) {
  const before = JSON.stringify(kv.dump());
  const response = await handleAvailabilityGet(visitorRequest(ip), PROD_ORIGIN, quotaEnv(kv), nowMs);
  expect(JSON.stringify(kv.dump())).toBe(before);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return { status: response.status, body: await response.json() };
}

describe("GET /availability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns available when both daily counters are below their limits", async () => {
    const kv = createMemoryKv();
    await accept(kv, VISITOR, 3, DAY);
    const { status, body } = await readAvailability(kv, DAY);
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "available",
      resets_at: "2026-10-19T00:00:00.000Z",
    });
  });

  it("returns visitor_limit_reached at 12 when the global counter is below 80", async () => {
    const kv = createMemoryKv();
    await accept(kv, VISITOR, 12, DAY);
    const { status, body } = await readAvailability(kv, DAY);
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "visitor_limit_reached",
      resets_at: "2026-10-19T00:00:00.000Z",
    });
  });

  it("returns global_limit_reached at 80 when the visitor is below 12", async () => {
    const kv = createMemoryKv();
    await fillGlobalExceptVisitor(kv, 11);
    const { status, body } = await readAvailability(kv, DAY);
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "global_limit_reached",
      resets_at: "2026-10-19T00:00:00.000Z",
    });
  });

  it("lets global exhaustion take precedence when both counters are exhausted", async () => {
    const kv = createMemoryKv();
    await fillGlobalExceptVisitor(kv, 12);
    const { status, body } = await readAvailability(kv, DAY);
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "global_limit_reached",
      resets_at: "2026-10-19T00:00:00.000Z",
    });
  });

  it("ignores a stored burst timestamp", async () => {
    const kv = createMemoryKv();
    const t0 = Date.parse("2026-10-18T10:00:00.000Z");
    await accept(kv, VISITOR, 1, t0);
    const { status, body } = await readAvailability(kv, t0 + 1000);
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "available",
      resets_at: "2026-10-19T00:00:00.000Z",
    });
    expect(
      await consumeAskQuota({
        request: visitorRequest(),
        env: quotaEnv(kv),
        nowMs: t0 + 1000,
      }),
    ).toEqual({ ok: false, error: "quota_exceeded", httpStatus: 429 });
  });

  it("uses the next UTC day key and the following midnight after reset", async () => {
    const kv = createMemoryKv();
    await accept(kv, VISITOR, 12, DAY);
    const beforeMidnight = Date.parse("2026-10-18T23:59:59.000Z");
    const midnight = Date.parse("2026-10-19T00:00:00.000Z");

    const evening = await readAvailability(kv, beforeMidnight);
    expect(evening.body).toEqual({
      ok: true,
      state: "visitor_limit_reached",
      resets_at: "2026-10-19T00:00:00.000Z",
    });

    const nextDay = await readAvailability(kv, midnight);
    expect(nextDay.body).toEqual({
      ok: true,
      state: "available",
      resets_at: "2026-10-20T00:00:00.000Z",
    });
    expect(utcDayKey(new Date(beforeMidnight))).toBe("2026-10-18");
    expect(utcDayKey(new Date(midnight))).toBe("2026-10-19");
    expect(Object.keys(kv.dump()).some((key) => key.includes("2026-10-19"))).toBe(false);
  });

  it("returns the existing configuration error when KV is missing", async () => {
    const response = await handleAvailabilityGet(visitorRequest(), PROD_ORIGIN, {
      ASSISTANT_CLIENT_IP_MODE: "cloudflare",
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
  });

  it("returns the existing configuration error when Cloudflare identity is missing", async () => {
    const kv = createMemoryKv();
    const response = await handleAvailabilityGet(
      new Request("https://assistant.example/availability", {
        method: "GET",
        headers: { Origin: PROD_ORIGIN },
      }),
      PROD_ORIGIN,
      quotaEnv(kv),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "server_configuration_error",
    });
    expect(kv.dump()).toEqual({});
  });

  it("performs no KV writes and no OpenAI calls", async () => {
    const kv = createMemoryKv();
    await accept(kv, VISITOR, 1, DAY);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const puts = [];
    const originalPut = kv.put.bind(kv);
    kv.put = async (...args) => {
      puts.push(String(args[0]));
      return originalPut(...args);
    };

    const beforeMs = Date.now();
    const response = await worker.fetch(visitorRequest(), {
      ...quotaEnv(kv),
      ASSISTANT_ALLOWED_ORIGINS: PROD_ORIGIN,
      OPENAI_API_KEY: "sk-availability-should-not-leak",
    });
    const afterMs = Date.now();
    const body = await response.json();
    const day = utcDayKey(new Date(beforeMs));
    const pepper = "portfolio-assistant-quota-v1";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${pepper}|${day}|${VISITOR}`),
    );
    const ipHash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);

    const serialized = JSON.stringify(body);
    expect(response.status).toBe(200);
    expect(puts).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.state).toBe("available");
    expect([nextUtcMidnightIso(beforeMs), nextUtcMidnightIso(afterMs)]).toContain(body.resets_at);
    expect(serialized).not.toContain("sk-availability-should-not-leak");
    expect(serialized).not.toContain(VISITOR);
    expect(serialized).not.toContain(ipHash);
    expect(serialized).not.toContain("quota:");
    expect(Object.keys(body).sort()).toEqual(["ok", "resets_at", "state"]);
  });

  it("keeps existing CORS restrictions", async () => {
    const kv = createMemoryKv();
    const env = {
      ...quotaEnv(kv),
      ASSISTANT_ALLOWED_ORIGINS: PROD_ORIGIN,
    };
    const allowed = await worker.fetch(
      new Request("https://assistant.example/availability", {
        method: "OPTIONS",
        headers: {
          Origin: PROD_ORIGIN,
          "Access-Control-Request-Method": "GET",
        },
      }),
      env,
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(PROD_ORIGIN);
    expect(allowed.headers.get("Cache-Control")).toBe("no-store");

    const denied = await worker.fetch(
      new Request("https://assistant.example/availability", {
        method: "GET",
        headers: {
          Origin: DISALLOWED_ORIGIN,
          "cf-connecting-ip": VISITOR,
        },
      }),
      env,
    );
    expect(denied.status).toBe(200);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(denied.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
    expect(denied.headers.get("Cache-Control")).toBe("no-store");
  });

  it("leaves POST /ask quota consumption and its 429 contract unchanged", async () => {
    const kv = createMemoryKv();
    const env = {
      ...quotaEnv(kv),
      ASSISTANT_AI_ENABLED: "true",
      OPENAI_API_KEY: "test-openai-key",
      ASSISTANT_ALLOWED_ORIGINS: PROD_ORIGIN,
      ASSISTANT_BURST_SECONDS: "60",
      ASSISTANT_IP_DAILY_LIMIT: "1",
    };
    const createAnswer = vi.fn(async () => ({ ok: true, answer: "ok" }));
    const ask = () =>
      new Request("https://assistant.example/ask", {
        method: "POST",
        headers: {
          Origin: PROD_ORIGIN,
          "content-type": "application/json",
          "cf-connecting-ip": VISITOR,
        },
        body: JSON.stringify({ question: "What is CodeIAK?" }),
      });

    const first = await handleAskPost(ask(), PROD_ORIGIN, env, { createAnswer });
    expect(first.status).toBe(200);

    const looked = await handleAvailabilityGet(visitorRequest(), PROD_ORIGIN, env);
    expect(looked.headers.get("Cache-Control")).toBe("no-store");
    expect(await looked.json()).toMatchObject({
      ok: true,
      state: "visitor_limit_reached",
    });

    const second = await handleAskPost(ask(), PROD_ORIGIN, env, { createAnswer });
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({ ok: false, error: "quota_exceeded" });
    expect(createAnswer).toHaveBeenCalledTimes(1);
  });
});
