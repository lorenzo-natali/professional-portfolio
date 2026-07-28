import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS,
  PORTFOLIO_LIFECYCLE_TRACE_STORAGE_KEY,
  classifyPreviousSessionEnd,
  installPortfolioLifecycleTrace,
} from "./createPortfolioLifecycleTrace.js";

describe("createPortfolioLifecycleTrace", () => {
  beforeEach(() => {
    sessionStorage.clear();
    if (window.__portfolioLifecycleTrace) {
      try {
        window.__portfolioLifecycleTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__portfolioLifecycleTrace;
    }
  });

  afterEach(() => {
    if (window.__portfolioLifecycleTrace) {
      try {
        window.__portfolioLifecycleTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__portfolioLifecycleTrace;
    }
    sessionStorage.clear();
  });

  it("persists bounded events and exposes buildSummary/copy", async () => {
    const trace = installPortfolioLifecycleTrace({ enabled: true, force: true });
    expect(window.__portfolioLifecycleTrace).toBe(trace);
    expect(trace.documentBootId).toMatch(/^doc-/);

    for (let i = 0; i < PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS + 30; i += 1) {
      trace.record(`evt${i}`, `d${i}`, { asReason: false });
    }
    const snap = trace.getSnapshot();
    expect(snap.current.events.length).toBeLessThanOrEqual(
      PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS,
    );

    const summary = trace.buildSummary();
    expect(summary.documentBootId).toBe(trace.documentBootId);
    expect(summary.previousSessionEnd).toBe("none");
    expect(typeof summary.elapsedMs).toBe("number");

    const text = await trace.copy();
    expect(text).toContain(trace.documentBootId);

    const stored = JSON.parse(
      sessionStorage.getItem(PORTFOLIO_LIFECYCLE_TRACE_STORAGE_KEY),
    );
    expect(stored.current.documentBootId).toBe(trace.documentBootId);
  });

  it("preserves previous boot and classifies abrupt vs pagehide ends", () => {
    const first = installPortfolioLifecycleTrace({ enabled: true, force: true });
    first.record("pagehide", "persisted=false", { asReason: true });
    const firstBoot = first.documentBootId;
    first.dispose();
    delete window.__portfolioLifecycleTrace;

    const second = installPortfolioLifecycleTrace({ enabled: true, force: true });
    expect(second.documentBootId).not.toBe(firstBoot);
    expect(second.previousDocumentBootId).toBe(firstBoot);
    expect(second.previousSessionEnd).toBe("pagehide");

    expect(
      classifyPreviousSessionEnd({
        lastReason: null,
        events: [{ kind: "documentBoot" }],
      }),
    ).toBe("abrupt");
    expect(
      classifyPreviousSessionEnd({
        lastReason: "windowError:boom",
        events: [{ kind: "windowError" }],
      }),
    ).toBe("error");
    expect(
      classifyPreviousSessionEnd({
        lastReason: "appUnmount",
        events: [{ kind: "appUnmount" }],
      }),
    ).toBe("cleanup");
  });

  it("records react root / app mount counters", () => {
    const trace = installPortfolioLifecycleTrace({ enabled: true, force: true });
    trace.recordReactRootMount();
    trace.recordAppMount();
    trace.recordAppUnmount();
    const summary = trace.buildSummary();
    expect(summary.reactRootMountCount).toBe(1);
    expect(summary.appMountCount).toBe(1);
    expect(summary.appUnmountCount).toBe(1);
  });

  it("records history.go when wrappable", () => {
    const go = vi.fn();
    const original = window.history.go;
    window.history.go = go;
    const trace = installPortfolioLifecycleTrace({ enabled: true, force: true });
    window.history.go(-1);
    expect(go).toHaveBeenCalledWith(-1);
    const kinds = trace.getSnapshot().current.events.map((e) => e.kind);
    expect(kinds).toContain("historyGo");
    window.history.go = original;
  });
});
