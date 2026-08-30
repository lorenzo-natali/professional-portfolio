/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActiveDurationTracker } from "./activeDuration.js";
import {
  STORAGE_EXCLUDE,
  STORAGE_SESSION_ID,
  STORAGE_VISIT_SENT,
  STORAGE_VISITOR_ID,
  resolveAnalyticsEnv,
} from "./analyticsConfig.js";
import { installPortfolioAnalytics, trackPortfolioEvent } from "./createPortfolioAnalytics.js";
import {
  getOrCreateSessionId,
  getOrCreateVisitorId,
} from "./identity.js";
import {
  consumeAnalyticsQueryFlag,
  isLocalAnalyticsHost,
  isOwnerExcluded,
  setOwnerExcluded,
} from "./ownerExclusion.js";
import { classifyReferrer, normalizeLandingPath } from "./referrer.js";
import { ALIVE_CONTENT_TYPE, sendAnalyticsBatch } from "./transport.js";

function memoryStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(String(k), String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    get _map() {
      return map;
    },
  };
}

describe("portfolio analytics client — Phase B", () => {
  /** @type {ReturnType<typeof memoryStorage>} */
  let local;
  /** @type {ReturnType<typeof memoryStorage>} */
  let session;
  /** @type {Array<{ url: string, init: RequestInit }>} */
  let fetches;
  /** @type {Array<{ url: string, body: Blob }>} */
  let beacons;
  /** @type {Array<[string, EventListener]>} */
  let docListeners;
  /** @type {Array<[string, EventListener]>} */
  let winListeners;
  let hidden;
  let nowMs;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
    fetches = [];
    beacons = [];
    docListeners = [];
    winListeners = [];
    hidden = false;
    nowMs = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Drop any active Phase C context left by a prior install.
    installPortfolioAnalytics({
      enabled: false,
      endpoint: "",
      dev: true,
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    });
  });

  function install(extra = {}) {
    return installPortfolioAnalytics({
      enabled: true,
      endpoint: "https://analytics.test",
      dev: false,
      hostname: "lorenzo-natali.github.io",
      pathname: "/professional-portfolio/",
      search: "",
      hash: "",
      referrer: "https://www.linkedin.com/in/someone",
      localStorage: local,
      sessionStorage: session,
      isHidden: () => hidden,
      now: () => nowMs,
      fetchImpl: (url, init) => {
        fetches.push({ url: String(url), init });
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      sendBeaconImpl: (url, body) => {
        beacons.push({ url: String(url), body });
        return true;
      },
      addEventListener: (type, fn) => {
        docListeners.push([type, fn]);
      },
      removeEventListener: (type, fn) => {
        docListeners = docListeners.filter(
          ([t, f]) => !(t === type && f === fn)
        );
      },
      windowAddEventListener: (type, fn) => {
        winListeners.push([type, fn]);
      },
      windowRemoveEventListener: (type, fn) => {
        winListeners = winListeners.filter(
          ([t, f]) => !(t === type && f === fn)
        );
      },
      replaceState: () => {},
      ...extra,
    });
  }

  it("disabled analytics creates no IDs/listeners/network activity", () => {
    const handle = installPortfolioAnalytics({
      enabled: false,
      endpoint: "https://analytics.test",
      dev: false,
      hostname: "example.com",
      localStorage: local,
      sessionStorage: session,
      fetchImpl: () => {
        throw new Error("should not fetch");
      },
      addEventListener: () => {
        throw new Error("should not listen");
      },
    });
    expect(handle.active).toBe(false);
    expect(local.getItem(STORAGE_VISITOR_ID)).toBeNull();
    expect(session.getItem(STORAGE_SESSION_ID)).toBeNull();
    expect(fetches).toHaveLength(0);
  });

  it("missing endpoint creates no analytics activity", () => {
    const handle = install({ endpoint: "" });
    expect(handle.active).toBe(false);
    expect(local.getItem(STORAGE_VISITOR_ID)).toBeNull();
    expect(fetches).toHaveLength(0);
    expect(docListeners).toHaveLength(0);
  });

  it("localhost/dev is automatically excluded", () => {
    expect(isLocalAnalyticsHost("localhost")).toBe(true);
    expect(isLocalAnalyticsHost("127.0.0.1")).toBe(true);
    const handle = install({ hostname: "localhost" });
    expect(handle.active).toBe(false);
    expect(fetches).toHaveLength(0);

    const handleDev = install({ hostname: "lorenzo-natali.github.io", dev: true });
    expect(handleDev.active).toBe(false);
  });

  it("?analytics=off persists owner exclusion", () => {
    const replaced = [];
    const result = consumeAnalyticsQueryFlag({
      search: "?analytics=off&keep=1",
      pathname: "/professional-portfolio/",
      hash: "",
      localStorage: local,
      replaceState: (_d, _u, url) => replaced.push(url),
    });
    expect(result).toBe("excluded");
    expect(isOwnerExcluded(local)).toBe(true);
    expect(replaced[0]).toBe("/professional-portfolio/?keep=1");
  });

  it("owner exclusion causes zero network activity", () => {
    setOwnerExcluded(local, true);
    const handle = install();
    expect(handle.active).toBe(false);
    expect(fetches).toHaveLength(0);
    expect(docListeners).toHaveLength(0);
  });

  it("?analytics=on clears exclusion in intended test flow", () => {
    setOwnerExcluded(local, true);
    const result = consumeAnalyticsQueryFlag({
      search: "?analytics=on",
      pathname: "/",
      localStorage: local,
      replaceState: () => {},
    });
    expect(result).toBe("included");
    expect(local.getItem(STORAGE_EXCLUDE)).toBeNull();
  });

  it("visitor ID persists across sessions", () => {
    const first = getOrCreateVisitorId(local, () => "vid-1");
    const second = getOrCreateVisitorId(local, () => "vid-2");
    expect(first.visitorId).toBe("vid-1");
    expect(second.visitorId).toBe("vid-1");
  });

  it("session ID is fresh per session storage lifecycle", () => {
    const a = getOrCreateSessionId(session, () => "sid-a");
    const b = getOrCreateSessionId(session, () => "sid-b");
    expect(a).toBe("sid-a");
    expect(b).toBe("sid-a");
    session.clear();
    const c = getOrCreateSessionId(session, () => "sid-c");
    expect(c).toBe("sid-c");
  });

  it("portfolio_visit is sent once per session", () => {
    const handle = install();
    expect(handle.active).toBe(true);
    expect(fetches).toHaveLength(1);
    const body = JSON.parse(String(fetches[0].init.body));
    expect(body.v).toBe(1);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe("portfolio_visit");
    expect(session.getItem(STORAGE_VISIT_SENT)).toBe(handle.sessionId);

    install();
    expect(fetches).toHaveLength(1);
  });

  it("classifies LinkedIn/GitHub/Google/direct/other referrers", () => {
    expect(classifyReferrer("https://www.linkedin.com/feed/")).toBe("linkedin");
    expect(classifyReferrer("https://github.com/lorenzo-natali")).toBe("github");
    expect(classifyReferrer("https://www.google.com/search?q=x")).toBe("google");
    expect(classifyReferrer("")).toBe("direct");
    expect(classifyReferrer("https://news.ycombinator.com")).toBe("other");
  });

  it("landing_path excludes arbitrary query strings", () => {
    expect(normalizeLandingPath("/professional-portfolio/?utm=1#x")).toBe(
      "/professional-portfolio/"
    );
    expect(normalizeLandingPath("/")).toBe("/");
  });

  it("does not count hidden time in active_ms and counts visible time", () => {
    const tracker = createActiveDurationTracker({
      now: () => nowMs,
      isHidden: () => hidden,
    });
    hidden = false;
    tracker.resume();
    nowMs += 5000;
    hidden = true;
    tracker.pause();
    nowMs += 20000;
    hidden = false;
    tracker.resume();
    nowMs += 3000;
    expect(tracker.finalize()).toBe(8000);
  });

  it("pagehide sends session_end via sendBeacon with text/plain Blob", async () => {
    const handle = install();
    nowMs = 1000;
    const pagehide = winListeners.find(([t]) => t === "pagehide")?.[1];
    expect(pagehide).toBeTruthy();
    nowMs = 4000;
    pagehide();
    expect(beacons).toHaveLength(1);
    expect(fetches).toHaveLength(1); // portfolio_visit only
    expect(beacons[0].url).toBe("https://analytics.test/analytics");
    expect(beacons[0].body).toBeInstanceOf(Blob);
    expect(beacons[0].body.type).toBe("text/plain;charset=utf-8");
    handle.stop();
  });

  it("visibilitychange + pagehide do not double-count", () => {
    install();
    const onVis = docListeners.find(([t]) => t === "visibilitychange")?.[1];
    const onHide = winListeners.find(([t]) => t === "pagehide")?.[1];
    nowMs = 0;
    // resume already called at install with now=0
    nowMs = 10000;
    hidden = true;
    onVis();
    nowMs = 15000;
    onHide();
    // Second pagehide must not send again
    onHide();
    expect(beacons).toHaveLength(1);
  });

  it("sendBeacon true does not fall through to fetch", () => {
    const visitFetchesBefore = fetches.length;
    install();
    expect(fetches.length).toBe(visitFetchesBefore + 1);
    winListeners.find(([t]) => t === "pagehide")?.[1]();
    expect(beacons).toHaveLength(1);
    // Only the alive-page portfolio_visit fetch — no unload duplicate.
    expect(fetches).toHaveLength(visitFetchesBefore + 1);
  });

  it("sendBeacon false falls back to keepalive fetch with text/plain", () => {
    sendAnalyticsBatch({
      endpoint: "https://analytics.test",
      visitorId: "v",
      sessionId: "s",
      events: [
        {
          name: "session_end",
          ts: "2026-08-30T10:00:00.000Z",
          props: { active_ms: 1 },
        },
      ],
      preferBeacon: true,
      sendBeaconImpl: () => false,
      fetchImpl: (url, init) => {
        fetches.push({ url: String(url), init });
        return Promise.resolve(new Response(null, { status: 204 }));
      },
    });
    expect(fetches).toHaveLength(1);
    expect(fetches[0].init.keepalive).toBe(true);
    expect(fetches[0].init.headers).toMatchObject({
      "content-type": "text/plain;charset=utf-8",
    });
  });

  it("alive-page POST (preferBeacon false) keeps application/json", () => {
    sendAnalyticsBatch({
      endpoint: "https://analytics.test",
      visitorId: "v",
      sessionId: "s",
      events: [
        {
          name: "portfolio_visit",
          ts: "2026-08-30T10:00:00.000Z",
          props: { referrer_class: "direct", landing_path: "/" },
        },
      ],
      preferBeacon: false,
      sendBeaconImpl: () => {
        throw new Error("beacon must not be used for alive-page path");
      },
      fetchImpl: (url, init) => {
        fetches.push({ url: String(url), init });
        return Promise.resolve(new Response(null, { status: 204 }));
      },
    });
    expect(fetches).toHaveLength(1);
    expect(fetches[0].init.headers).toMatchObject({
      "content-type": "application/json",
    });
    expect(beacons).toHaveLength(0);
  });

  it("storage failure does not break install", () => {
    const badLocal = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() =>
      install({
        localStorage: badLocal,
        sessionStorage: badLocal,
      })
    ).not.toThrow();
  });

  it("network failure does not throw", () => {
    expect(() =>
      install({
        fetchImpl: () => {
          throw new Error("offline");
        },
      })
    ).not.toThrow();
  });

  it("introduces no interval/rAF/polling analytics lifecycle", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    if (typeof globalThis.requestAnimationFrame !== "function") {
      globalThis.requestAnimationFrame = () => 1;
    }
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");

    install();

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(
      setTimeoutSpy.mock.calls.filter((call) => typeof call[1] === "number" && call[1] > 0)
    ).toHaveLength(0);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(docListeners.map(([t]) => t)).toEqual(["visibilitychange"]);
    expect(winListeners.map(([t]) => t)).toEqual(["pagehide"]);
  });

  it("resolveAnalyticsEnv requires explicit true + endpoint", () => {
    expect(
      resolveAnalyticsEnv({ enabled: "true", endpoint: "https://x", dev: false })
    ).toMatchObject({ enabled: true, endpoint: "https://x" });
    expect(
      resolveAnalyticsEnv({ enabled: "yes", endpoint: "https://x", dev: false }).enabled
    ).toBe(false);
  });

  it("decodes session_end active_ms from beacon payload", async () => {
    install();
    nowMs = 2500;
    hidden = true;
    docListeners.find(([t]) => t === "visibilitychange")?.[1]();
    winListeners.find(([t]) => t === "pagehide")?.[1]();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].body.type).toBe("text/plain;charset=utf-8");
    const text = await beacons[0].body.text();
    const payload = JSON.parse(text);
    expect(payload.events[0].name).toBe("session_end");
    expect(payload.events[0].props.active_ms).toBe(2500);
  });
});

describe("portfolio analytics client — Phase C trackPortfolioEvent", () => {
  /** @type {ReturnType<typeof memoryStorage>} */
  let local;
  /** @type {ReturnType<typeof memoryStorage>} */
  let session;
  /** @type {Array<{ url: string, init: RequestInit }>} */
  let fetches;
  /** @type {Array<[string, EventListener]>} */
  let docListeners;
  /** @type {Array<[string, EventListener]>} */
  let winListeners;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
    fetches = [];
    docListeners = [];
    winListeners = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    installPortfolioAnalytics({
      enabled: false,
      endpoint: "",
      dev: true,
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    });
  });

  function installActive(extra = {}) {
    return installPortfolioAnalytics({
      enabled: true,
      endpoint: "https://analytics.test",
      dev: false,
      hostname: "lorenzo-natali.github.io",
      pathname: "/professional-portfolio/",
      search: "",
      hash: "",
      referrer: "",
      localStorage: local,
      sessionStorage: session,
      isHidden: () => false,
      now: () => 0,
      fetchImpl: (url, init) => {
        fetches.push({ url: String(url), init });
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      sendBeaconImpl: () => true,
      addEventListener: (type, fn) => {
        docListeners.push([type, fn]);
      },
      removeEventListener: () => {},
      windowAddEventListener: (type, fn) => {
        winListeners.push([type, fn]);
      },
      windowRemoveEventListener: () => {},
      replaceState: () => {},
      ...extra,
    });
  }

  async function interactionPayloads() {
    const out = [];
    for (const entry of fetches) {
      const body = entry.init?.body;
      if (typeof body !== "string") continue;
      const parsed = JSON.parse(body);
      for (const event of parsed.events || []) {
        if (event.name !== "portfolio_visit" && event.name !== "session_end") {
          out.push({
            event,
            contentType: entry.init?.headers?.["content-type"],
            keepalive: entry.init?.keepalive,
          });
        }
      }
    }
    return out;
  }

  it("inactive analytics makes trackPortfolioEvent a no-op", async () => {
    expect(() =>
      trackPortfolioEvent("assistant_open")
    ).not.toThrow();
    expect(fetches).toHaveLength(0);
  });

  it("owner-excluded install keeps trackPortfolioEvent as no-op", async () => {
    setOwnerExcluded(local, true);
    const handle = installActive();
    expect(handle.active).toBe(false);
    trackPortfolioEvent("assistant_open");
    expect(fetches).toHaveLength(0);
  });

  it("valid track uses alive application/json transport", async () => {
    installActive();
    const visitCount = fetches.length;
    trackPortfolioEvent("experience_open", {
      experience_id: "experience-boc",
    });
    expect(fetches.length).toBe(visitCount + 1);
    const last = fetches[fetches.length - 1];
    expect(last.init.headers["content-type"]).toBe(ALIVE_CONTENT_TYPE);
    expect(last.init.keepalive).toBe(true);
    const body = JSON.parse(String(last.init.body));
    expect(body.events).toEqual([
      expect.objectContaining({
        name: "experience_open",
        props: { experience_id: "experience-boc" },
      }),
    ]);
  });

  it("transport rejection does not throw to callers", () => {
    installActive({
      fetchImpl: () => Promise.reject(new Error("network down")),
    });
    expect(() =>
      trackPortfolioEvent("assistant_open")
    ).not.toThrow();
  });

  it("stop() disables subsequent trackPortfolioEvent calls", async () => {
    const handle = installActive();
    handle.stop();
    const before = fetches.length;
    trackPortfolioEvent("assistant_open");
    expect(fetches.length).toBe(before);
  });

  it("assistant_curated_question payload contains only prompt_id and category", async () => {
    installActive();
    trackPortfolioEvent("assistant_curated_question", {
      prompt_id: "assistant-role-orientation",
      category: "Profile & Career Direction",
    });
    const interactions = await interactionPayloads();
    expect(interactions).toHaveLength(1);
    expect(Object.keys(interactions[0].event.props).sort()).toEqual([
      "category",
      "prompt_id",
    ]);
    expect(JSON.stringify(interactions[0].event)).not.toMatch(/What is|answer|question text/i);
  });

  it("Phase B visit still fires once on install and session_end still uses unload path", async () => {
    const first = installActive();
    expect(fetches).toHaveLength(1);
    const visit = JSON.parse(String(fetches[0].init.body));
    expect(visit.events[0].name).toBe("portfolio_visit");
    expect(fetches[0].init.headers["content-type"]).toBe(ALIVE_CONTENT_TYPE);
    first.stop();

    docListeners = [];
    winListeners = [];
    const beacons = [];
    installActive({
      sendBeaconImpl: (url, body) => {
        beacons.push({ url, body });
        return true;
      },
      sessionStorage: memoryStorage(),
      localStorage: local,
    });
    winListeners.find(([t]) => t === "pagehide")?.[1]();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].body.type).toBe("text/plain;charset=utf-8");
  });
});
