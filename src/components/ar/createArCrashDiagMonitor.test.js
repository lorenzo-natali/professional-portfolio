import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createArCrashDiagMonitor } from "./createArCrashDiagMonitor";

describe("createArCrashDiagMonitor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    if (window.__arCrashDiag) {
      try {
        window.__arCrashDiag.dispose();
      } catch {
        // ignore
      }
    }
    delete window.__arCrashDiag;
  });

  it("keeps notes bounded and counters only", () => {
    const monitor = createArCrashDiagMonitor("camera");
    for (let i = 0; i < 40; i += 1) monitor.note(`n${i}`);
    const summary = monitor.buildSummary();
    expect(summary.notes.length).toBeLessThanOrEqual(24);
    monitor.bump("renderFrames", 3);
    monitor.bump("loadInput");
    expect(monitor.getCounters().renderFrames).toBe(3);
    expect(monitor.getCounters().loadInput).toBe(1);
    monitor.dispose();
  });

  it("instruments controller hot paths without nesting duplicate loops", () => {
    const monitor = createArCrashDiagMonitor("mindar");
    const controller = {
      inputLoader: {
        loadInput: vi.fn(() => ({ dispose: vi.fn() })),
      },
      _detectAndMatch: vi.fn(async () => ({ targetIndex: -1 })),
      _trackAndUpdate: vi.fn(async () => null),
      worker: {
        postMessage: vi.fn(),
        onmessage: null,
      },
    };

    monitor.instrumentController(controller);
    monitor.instrumentController(controller); // idempotent

    controller.inputLoader.loadInput({});
    void controller._detectAndMatch();
    void controller._trackAndUpdate();
    controller.worker.postMessage({ type: "match" });
    controller.worker.onmessage?.({ data: { type: "matchDone" } });

    const c = monitor.getCounters();
    expect(c.loadInput).toBe(1);
    expect(c.detect).toBe(1);
    expect(c.track).toBe(1);
    expect(c.workerRequests).toBe(1);
    expect(c.workerPending).toBe(0);
    monitor.dispose();
  });

  it("markFrozen is sticky once", () => {
    const monitor = createArCrashDiagMonitor("frozen");
    expect(monitor.isFrozen()).toBe(false);
    monitor.markFrozen();
    monitor.markFrozen();
    expect(monitor.isFrozen()).toBe(true);
    const frozenNotes = monitor
      .buildSummary()
      .notes.filter((n) => n.kind === "frozenTracking");
    expect(frozenNotes).toHaveLength(1);
    monitor.dispose();
  });

  it("dispose removes hud and clears global handle", () => {
    const shell = document.createElement("div");
    document.body.appendChild(shell);
    const monitor = createArCrashDiagMonitor("render");
    monitor.mountHud(shell);
    expect(shell.querySelector("[data-ar-crash-diag]")).toBeTruthy();
    monitor.dispose();
    expect(shell.querySelector("[data-ar-crash-diag]")).toBeNull();
    expect(window.__arCrashDiag).toBeUndefined();
  });
});
