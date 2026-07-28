import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AR_EXIT_TRACE_MAX_EVENTS,
  AR_EXIT_TRACE_STORAGE_KEY,
  classifyExitHypothesis,
  getDisplayedArExitReason,
  installArExitTrace,
  recordArExitTrace,
} from "./createArExitTrace";

describe("createArExitTrace", () => {
  beforeEach(() => {
    sessionStorage.clear();
    if (window.__arExitTrace) {
      try {
        window.__arExitTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__arExitTrace;
    }
  });

  afterEach(() => {
    if (window.__arExitTrace) {
      try {
        window.__arExitTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__arExitTrace;
    }
    sessionStorage.clear();
  });

  it("persists a bounded event list and exposes copy()", async () => {
    const trace = installArExitTrace({ enabled: true, force: true });
    expect(window.__arExitTrace).toBe(trace);

    for (let i = 0; i < AR_EXIT_TRACE_MAX_EVENTS + 20; i += 1) {
      trace.record(`evt${i}`, `d${i}`, { asReason: false });
    }
    const snap = trace.getSnapshot();
    expect(snap.current.events.length).toBeLessThanOrEqual(AR_EXIT_TRACE_MAX_EVENTS);

    const stored = JSON.parse(sessionStorage.getItem(AR_EXIT_TRACE_STORAGE_KEY));
    expect(stored.current.bootId).toBe(snap.bootId);
    expect(stored.current.events.length).toBe(snap.current.events.length);

    const text = await trace.copy();
    expect(text).toContain(snap.bootId);
  });

  it("preserves previous session across a new boot id", () => {
    const first = installArExitTrace({ enabled: true, force: true });
    first.record("arCleanup", { reason: "test-cleanup" }, { asReason: true });
    const firstBoot = first.bootId;
    first.dispose();
    delete window.__arExitTrace;

    const second = installArExitTrace({ enabled: true, force: true });
    expect(second.bootId).not.toBe(firstBoot);
    const snap = second.getSnapshot();
    expect(snap.bootIdChanged).toBe(true);
    expect(snap.previousBootId).toBe(firstBoot);
    expect(snap.previousLastReason).toContain("arCleanup");
    expect(getDisplayedArExitReason()).toContain("arCleanup");
  });

  it("bindMedia records video and track end events", () => {
    const trace = installArExitTrace({ enabled: true, force: true });
    const video = document.createElement("video");
    const stop = vi.fn();
    const track = {
      kind: "video",
      readyState: "live",
      stop,
      addEventListener: vi.fn((type, cb) => {
        track[`_on${type}`] = cb;
      }),
      removeEventListener: vi.fn(),
    };
    const stream = { getTracks: () => [track] };

    const unbind = trace.bindMedia(video, stream);
    video.dispatchEvent(new Event("playing"));
    track._onended?.();
    track.stop();

    const kinds = trace.getSnapshot().current.events.map((e) => e.kind);
    expect(kinds).toContain("video_playing");
    expect(kinds).toContain("trackEnded");
    expect(kinds).toContain("streamStop");
    expect(stop).toHaveBeenCalled();
    unbind();
  });

  it("classifies webkit reconstruction vs app-driven exits", () => {
    expect(
      classifyExitHypothesis(
        {
          bootId: "old",
          lastReason: "pagehide:persisted=false",
          events: [{ kind: "pagehide" }],
        },
        { bootIdChanged: true, navigationType: "navigate" },
      ),
    ).toBe("webkit-page-reconstruction");

    expect(
      classifyExitHypothesis(
        {
          bootId: "old",
          lastReason: "arCleanup:cleanupSession",
          events: [{ kind: "arCleanup" }, { kind: "streamStop" }],
        },
        { bootIdChanged: false, navigationType: "navigate" },
      ),
    ).toBe("app-driven");

    expect(
      classifyExitHypothesis(
        {
          bootId: "old",
          lastReason: "trackEnded:video:ended",
          events: [{ kind: "trackEnded" }],
        },
        { bootIdChanged: false, navigationType: "navigate" },
      ),
    ).toBe("media-track-or-video");
  });

  it("recordArExitTrace no-ops when not installed", () => {
    expect(() => recordArExitTrace("noop")).not.toThrow();
  });
});
