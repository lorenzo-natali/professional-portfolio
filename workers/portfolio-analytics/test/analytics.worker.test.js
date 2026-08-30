/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { MAX_BODY_BYTES } from "../src/constants.js";
import { handleAnalyticsPost, isAnalyticsEnabled, isAllowedAnalyticsContentType } from "../src/handleAnalytics.js";
import {
  normalizeBrowserFamily,
  normalizeCountry,
  normalizeDeviceClass,
} from "../src/metadata.js";
import { createMemoryD1 } from "./memoryD1.js";

const VISITOR = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const TS = "2026-08-30T10:00:00.000Z";

function envWithDb(db, extra = {}) {
  return {
    DB: db,
    ANALYTICS_ENABLED: "true",
    ANALYTICS_MAX_REQUESTS_PER_DAY: "5000",
    ANALYTICS_MAX_EVENT_WRITES_PER_DAY: "20000",
    ANALYTICS_ALLOWED_ORIGINS:
      "https://lorenzo-natali.github.io,http://127.0.0.1:5173",
    ...extra,
  };
}

function postRequest(body, init = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("https://analytics.example/analytics", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "cf-ipcountry": "IT",
      ...(init.headers || {}),
    },
    body: payload,
  });
}

function visitBody(overrides = {}) {
  return {
    v: 1,
    visitor_id: VISITOR,
    session_id: SESSION,
    sent_at: TS,
    events: [
      {
        name: "portfolio_visit",
        ts: TS,
        props: {
          referrer_class: "linkedin",
          landing_path: "/",
        },
      },
    ],
    ...overrides,
  };
}

describe("portfolio analytics Worker — Phase A", () => {
  it("accepts a valid portfolio_visit and stores coarse server metadata only", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody()),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    const dump = db.dump();
    expect(dump.sessions).toHaveLength(1);
    expect(dump.sessions[0].country).toBe("IT");
    expect(dump.sessions[0].browser_family).toBe("safari");
    expect(dump.sessions[0].device_class).toBe("mobile");
    expect(dump.events[0].name).toBe("portfolio_visit");
    expect(JSON.stringify(dump)).not.toMatch(/ip|cf-connecting|1\.2\.3\.4/i);
    expect(dump.sessions[0]).not.toHaveProperty("ip");
    expect(dump.sessions[0]).not.toHaveProperty("user_agent");
  });

  it("accepts a valid interaction event", async () => {
    const db = createMemoryD1();
    await handleAnalyticsPost(postRequest(visitBody()), envWithDb(db));
    const res = await handleAnalyticsPost(
      postRequest({
        v: 1,
        visitor_id: VISITOR,
        session_id: SESSION,
        sent_at: TS,
        events: [
          {
            name: "experience_open",
            ts: "2026-08-30T10:01:00.000Z",
            props: { experience_id: "experience-boc" },
          },
        ],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    expect(db.dump().events.map((e) => e.name)).toEqual([
      "portfolio_visit",
      "experience_open",
    ]);
  });

  it("updates an existing session on session_end", async () => {
    const db = createMemoryD1();
    await handleAnalyticsPost(postRequest(visitBody()), envWithDb(db));
    const res = await handleAnalyticsPost(
      postRequest({
        v: 1,
        visitor_id: VISITOR,
        session_id: SESSION,
        sent_at: "2026-08-30T10:05:00.000Z",
        events: [
          {
            name: "session_end",
            ts: "2026-08-30T10:05:00.000Z",
            props: { active_ms: 45000 },
          },
        ],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    const session = db.dump().sessions[0];
    expect(session.ended_at).toBe("2026-08-30T10:05:00.000Z");
    expect(session.active_ms).toBe(45000);
  });

  it("does not create an orphan session for session_end alone", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({
        v: 1,
        visitor_id: VISITOR,
        session_id: SESSION,
        sent_at: TS,
        events: [
          {
            name: "session_end",
            ts: TS,
            props: { active_ms: 1000 },
          },
        ],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    expect(db.dump().sessions).toHaveLength(0);
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects unknown event names", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({
        ...visitBody(),
        events: [{ name: "lens_select", ts: TS, props: {} }],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(db.dump().events).toHaveLength(0);
    expect(db.dump().sessions).toHaveLength(0);
  });

  it("rejects unknown props", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({
        ...visitBody(),
        events: [
          {
            name: "assistant_open",
            ts: TS,
            props: { sneaky: "nope" },
          },
        ],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects unknown top-level fields", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({ ...visitBody(), debug: true }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects oversized payloads", async () => {
    const db = createMemoryD1();
    const huge = "x".repeat(MAX_BODY_BYTES + 10);
    const res = await handleAnalyticsPost(
      postRequest(`{"pad":"${huge}"}`),
      envWithDb(db)
    );
    expect(res.status).toBe(413);
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects too many events", async () => {
    const db = createMemoryD1();
    const events = Array.from({ length: 11 }, (_, i) => ({
      name: "assistant_open",
      ts: TS,
      props: {},
      // ensure unique-ish — same ok
      _i: i,
    }));
    // remove illegal field by rebuilding
    const clean = events.map(({ name, ts, props }) => ({ name, ts, props }));
    const res = await handleAnalyticsPost(
      postRequest({
        v: 1,
        visitor_id: VISITOR,
        session_id: SESSION,
        sent_at: TS,
        events: clean,
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too_many_events" });
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects invalid UUIDs", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({ ...visitBody(), visitor_id: "not-a-uuid" }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_uuid" });
  });

  it("rejects invalid timestamps", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({ ...visitBody(), sent_at: "yesterday" }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_timestamp" });
  });

  it("rejects malformed JSON", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest("{not-json"),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "malformed_json" });
  });

  it("accepts application/json Content-Type", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(postRequest(visitBody()), envWithDb(db));
    expect(res.status).toBe(204);
    expect(db.dump().events).toHaveLength(1);
  });

  it("accepts application/json with charset parameter", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody(), {
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    expect(db.dump().events).toHaveLength(1);
  });

  it("accepts text/plain Content-Type with JSON body", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody(), {
        headers: { "content-type": "text/plain" },
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    expect(db.dump().events).toHaveLength(1);
  });

  it("accepts text/plain;charset=UTF-8 Content-Type with JSON body", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody(), {
        headers: { "content-type": "text/plain;charset=UTF-8" },
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
    expect(db.dump().sessions[0].landing_path).toBe("/");
  });

  it("accepts text/plain;charset=utf-8 Content-Type with JSON body", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody(), {
        headers: { "content-type": "text/plain;charset=utf-8" },
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
  });

  it("accepts text/plain with spaced charset parameter", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody(), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(204);
  });

  it("rejects unsupported Content-Type", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      new Request("https://analytics.example/analytics", {
        method: "POST",
        headers: { "content-type": "multipart/form-data" },
        body: JSON.stringify(visitBody()),
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(415);
    expect(db.dump().events).toHaveLength(0);
  });

  it("rejects malformed JSON even when Content-Type is text/plain", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      new Request("https://analytics.example/analytics", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: "{not-json",
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "malformed_json" });
    expect(db.dump().events).toHaveLength(0);
  });

  it("isAllowedAnalyticsContentType allows only json and text/plain media types", () => {
    expect(isAllowedAnalyticsContentType("application/json")).toBe(true);
    expect(isAllowedAnalyticsContentType("application/json; charset=utf-8")).toBe(
      true
    );
    expect(isAllowedAnalyticsContentType("text/plain")).toBe(true);
    expect(isAllowedAnalyticsContentType("text/plain;charset=UTF-8")).toBe(true);
    expect(isAllowedAnalyticsContentType("TEXT/PLAIN; Charset=UTF-8")).toBe(true);
    expect(isAllowedAnalyticsContentType("multipart/form-data")).toBe(false);
    expect(isAllowedAnalyticsContentType("application/x-www-form-urlencoded")).toBe(
      false
    );
    expect(isAllowedAnalyticsContentType("")).toBe(false);
  });

  it("handles CORS preflight and allows configured Origin", async () => {
    const db = createMemoryD1();
    const env = envWithDb(db);
    const preflight = await worker.fetch(
      new Request("https://analytics.example/analytics", {
        method: "OPTIONS",
        headers: {
          Origin: "https://lorenzo-natali.github.io",
          "Access-Control-Request-Method": "POST",
        },
      }),
      env
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://lorenzo-natali.github.io"
    );

    const denied = await worker.fetch(
      new Request("https://analytics.example/analytics", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
      env
    );
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("honours ANALYTICS_ENABLED kill switch without D1 writes", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest(visitBody()),
      envWithDb(db, { ANALYTICS_ENABLED: "false" })
    );
    expect(res.status).toBe(204);
    expect(db.dump().sessions).toHaveLength(0);
    expect(db.dump().events).toHaveLength(0);
    expect(isAnalyticsEnabled("false")).toBe(false);
  });

  it("enforces the global protective request quota", async () => {
    const db = createMemoryD1();
    const env = envWithDb(db, { ANALYTICS_MAX_REQUESTS_PER_DAY: "1" });
    const first = await handleAnalyticsPost(postRequest(visitBody()), env);
    expect(first.status).toBe(204);
    const second = await handleAnalyticsPost(
      postRequest({
        ...visitBody(),
        session_id: "33333333-3333-4333-8333-333333333333",
      }),
      env
    );
    expect(second.status).toBe(429);
    expect(db.dump().sessions).toHaveLength(1);
  });

  it("never persists raw IP and keeps metadata coarse", () => {
    expect(normalizeCountry("IT")).toBe("IT");
    expect(normalizeCountry("XX")).toBeNull();
    expect(normalizeBrowserFamily("Mozilla/5.0 Firefox/128.0")).toBe("firefox");
    expect(normalizeDeviceClass("iPad; CPU OS 17_0")).toBe("tablet");
  });

  it("does not write to D1 for invalid requests", async () => {
    const db = createMemoryD1();
    await handleAnalyticsPost(
      postRequest({ ...visitBody(), events: [] }),
      envWithDb(db)
    );
    expect(db.dump().ingest_counters).toHaveLength(0);
    expect(db.dump().events).toHaveLength(0);
  });

  it("returns generic errors when D1 fails without leaking internals", async () => {
    const db = createMemoryD1();
    db._failNext();
    const res = await handleAnalyticsPost(
      postRequest(visitBody()),
      envWithDb(db)
    );
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('{"error":"internal_error"}');
    expect(text).not.toMatch(/SELECT|sessions|stack|boom/i);
  });

  it("rejects nested/non-primitive prop values", async () => {
    const db = createMemoryD1();
    const res = await handleAnalyticsPost(
      postRequest({
        v: 1,
        visitor_id: VISITOR,
        session_id: SESSION,
        sent_at: TS,
        events: [
          {
            name: "experience_open",
            ts: TS,
            props: { experience_id: { nested: true } },
          },
        ],
      }),
      envWithDb(db)
    );
    expect(res.status).toBe(400);
    expect(db.dump().events).toHaveLength(0);
  });
});
