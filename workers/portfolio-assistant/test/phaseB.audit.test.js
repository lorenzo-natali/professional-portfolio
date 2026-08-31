/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  consumeAskQuota,
  KV_MIN_EXPIRATION_TTL_SECONDS,
  utcDayKey,
} from "../src/quota.js";
import { createMemoryKv } from "./memoryKv.js";
import { knowledgeItems } from "../src/knowledge/pack.js";

describe("quota day-scoping and burst TTL", () => {
  it("rotates the IP-derived key across UTC days and never stores raw IP", async () => {
    const kv = createMemoryKv();
    const request = new Request("https://assistant.example/ask", {
      method: "POST",
      headers: { "cf-connecting-ip": "203.0.113.50" },
    });
    const env = {
      QUOTA_KV: kv,
      ASSISTANT_QUOTA_PEPPER: "audit-pepper",
      ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
      ASSISTANT_IP_DAILY_LIMIT: "12",
      ASSISTANT_BURST_SECONDS: "4",
    };

    const dayA = Date.parse("2026-08-31T12:00:00.000Z");
    const dayB = Date.parse("2026-09-01T12:00:00.000Z");
    expect(utcDayKey(new Date(dayA))).toBe("2026-08-31");
    expect(utcDayKey(new Date(dayB))).toBe("2026-09-01");

    expect(await consumeAskQuota({ request, env, nowMs: dayA })).toEqual({ ok: true });
    expect(await consumeAskQuota({ request, env, nowMs: dayB })).toEqual({ ok: true });

    const dump = kv.dump();
    const keys = Object.keys(dump);
    expect(keys.some((k) => k.includes("quota:global:2026-08-31"))).toBe(true);
    expect(keys.some((k) => k.includes("quota:global:2026-09-01"))).toBe(true);
    expect(JSON.stringify(dump)).not.toMatch(/203\.0\.113\.50/);
    expect(keys.every((k) => !k.includes("203.0.113.50"))).toBe(true);
  });

  it("enforces sub-minute burst via timestamp while using KV TTL ≥ 60s", async () => {
    const puts = [];
    const store = new Map();
    const kv = {
      async get(key) {
        return store.has(key) ? store.get(key) : null;
      },
      async put(key, value, options = {}) {
        puts.push({ key, value: String(value), expirationTtl: options.expirationTtl });
        store.set(key, String(value));
      },
    };
    const request = new Request("https://assistant.example/ask", {
      headers: { "cf-connecting-ip": "198.51.100.9" },
    });
    const env = {
      QUOTA_KV: kv,
      ASSISTANT_BURST_SECONDS: "4",
      ASSISTANT_GLOBAL_DAILY_LIMIT: "80",
      ASSISTANT_IP_DAILY_LIMIT: "12",
    };

    const t0 = Date.parse("2026-08-31T10:00:00.000Z");
    expect(await consumeAskQuota({ request, env, nowMs: t0 })).toEqual({ ok: true });
    expect(
      await consumeAskQuota({ request, env, nowMs: t0 + 1000 }),
    ).toEqual({ ok: false, error: "quota_exceeded", httpStatus: 429 });
    expect(
      await consumeAskQuota({ request, env, nowMs: t0 + 5000 }),
    ).toEqual({ ok: true });

    const burstPuts = puts.filter((p) => p.key.startsWith("quota:burst:"));
    expect(burstPuts.length).toBeGreaterThan(0);
    expect(
      burstPuts.every((p) => p.expirationTtl >= KV_MIN_EXPIRATION_TTL_SECONDS),
    ).toBe(true);
  });
});

describe("knowledge pack grounding snapshot", () => {
  it("contains only public-derived topics and no assistant/draft ids", () => {
    expect(knowledgeItems).toHaveLength(70);
    const ids = knowledgeItems.map((i) => i.id);
    expect(ids.some((id) => id.includes("assistant-"))).toBe(false);
    expect(ids.some((id) => id.includes("draft"))).toBe(false);
    const cisa = knowledgeItems.find((i) => i.id === "credential-cisa");
    expect(cisa?.claimType).toBe("credential_in_progress");
    expect(cisa?.text).toMatch(/In Progress/i);
    expect(cisa?.text).not.toMatch(/Certified Information Systems Auditor certification holder|I am CISA certified/i);
  });
});
