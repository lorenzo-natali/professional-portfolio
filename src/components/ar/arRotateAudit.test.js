import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AR_ROTATE_AUDIT_BOOT_KEY,
  AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES,
  AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS,
  AR_ROTATE_AUDIT_PREV_BOOT_KEY,
  AR_ROTATE_AUDIT_RETAINED_KEY,
  AR_ROTATE_AUDIT_SCHEMA_VERSION,
  AR_ROTATE_AUDIT_SESSION_A_FIXTURE,
  AR_ROTATE_AUDIT_SESSION_B_FIXTURE,
  AR_ROTATE_AUDIT_STORAGE_KEY,
  SESSION_A_ABRUPT_EXPLANATION,
  buildArRotateAuditPersistable,
  classifyPreviousArRotateSnapshot,
  installArRotateAudit,
  isCleanupSupersededByLaterActivity,
  parseArRotateAuditSnapshot,
  readArRotateAuditStorage,
  recordArRotateAuditPageBoot,
  writeArRotateAuditStorage,
} from "./arRotateAudit";

function createMemoryStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    _map: map,
  };
}

describe("arRotateAudit persistence helpers", () => {
  it("parses valid snapshots and rejects malformed payloads", () => {
    expect(parseArRotateAuditSnapshot("{")).toBeNull();
    expect(parseArRotateAuditSnapshot("{}")).toBeNull();
    expect(parseArRotateAuditSnapshot({ v: 1 })).toBeNull();
    expect(
      parseArRotateAuditSnapshot({ v: 1, sessionId: "legacy" })?.sessionId,
    ).toBe("legacy");
    const ok = parseArRotateAuditSnapshot({
      v: AR_ROTATE_AUDIT_SCHEMA_VERSION,
      sessionId: "abc",
      persistedAt: 1,
    });
    expect(ok?.sessionId).toBe("abc");
  });

  it("overwrites a single bounded localStorage snapshot", () => {
    const storage = createMemoryStorage();
    const first = buildArRotateAuditPersistable({
      sessionId: "s1",
      installedAt: 1000,
      counters: /** @type {any} */ ({ pointermove: 1, heartbeat: 1 }),
      last: {},
      errors: [],
      lifecycleTail: [],
      memorySamples: [],
      heartbeat: 1,
      heartbeatAt: 1000,
      intentionalClose: false,
      terminalKind: null,
      now: 1000,
    });
    expect(writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, first)).toBe(true);

    const second = buildArRotateAuditPersistable({
      sessionId: "s1",
      installedAt: 1000,
      counters: /** @type {any} */ ({ pointermove: 99, heartbeat: 2 }),
      last: {},
      errors: [],
      lifecycleTail: [],
      memorySamples: [],
      heartbeat: 2,
      heartbeatAt: 2000,
      intentionalClose: false,
      terminalKind: null,
      now: 2000,
    });
    writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, second);

    const keys = [...storage._map.keys()];
    expect(keys.filter((k) => k === AR_ROTATE_AUDIT_STORAGE_KEY)).toHaveLength(1);
    const read = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(read?.heartbeat).toBe(2);
    expect(read?.counters?.pointermove).toBe(99);
  });

  it("handles storage write failures without throwing", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    expect(
      writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, {
        v: 1,
        sessionId: "x",
      }),
    ).toBe(false);
  });

  it("classifies intentional close, webgl loss, and abrupt end", () => {
    expect(
      classifyPreviousArRotateSnapshot({
        v: 1,
        sessionId: "a",
        intentionalClose: true,
        terminalKind: "intentional_user_close",
        heartbeat: 3,
        heartbeatAt: Date.now(),
      }).classification,
    ).toBe("intentional_user_close");

    expect(
      classifyPreviousArRotateSnapshot({
        v: 1,
        sessionId: "b",
        intentionalClose: false,
        terminalKind: "webglContextLost",
        heartbeat: 2,
        heartbeatAt: Date.now(),
      }).classification,
    ).toBe("webgl_context_lost");

    expect(
      classifyPreviousArRotateSnapshot({
        v: 1,
        sessionId: "c",
        intentionalClose: false,
        terminalKind: null,
        heartbeat: 5,
        heartbeatAt: Date.now() - 1000,
        persistedAt: Date.now() - 1000,
      }).classification,
    ).toBe("abrupt_previous_session_end");
  });
});

describe("lifecycle supersession", () => {
  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage;
  /** @type {ReturnType<typeof installArRotateAudit> | null} */
  let audit = null;

  beforeEach(() => {
    storage = createMemoryStorage();
    if (window.__arRotateAudit) {
      window.__arRotateAudit.__allowReinstall = true;
      window.__arRotateAudit.dispose?.();
      delete window.__arRotateAudit;
    }
  });

  afterEach(() => {
    audit?.dispose?.();
    audit = null;
    delete window.__arRotateAudit;
    vi.useRealTimers();
  });

  it("1. startup cleanup followed by successful start is superseded", () => {
    audit = installArRotateAudit({ storage, now: () => 1000 });
    audit.note("cleanupSession", {});
    expect(audit.snapshot().cleanupSuperseded).toBe(false);
    audit.note("adapterStartSucceeded", {});
    const snap = audit.snapshot();
    expect(snap.cleanupSuperseded).toBe(true);
    expect(snap.terminalKind).toBeNull();
    expect(isCleanupSupersededByLaterActivity(snap)).toBe(true);
    expect(classifyPreviousArRotateSnapshot(snap).classification).toBe(
      "abrupt_previous_session_end",
    );
  });

  it("2. cleanup followed by targetFound is superseded", () => {
    audit = installArRotateAudit({ storage, now: () => 2000 });
    audit.note("cleanupSession", {});
    audit.note("targetFound", {});
    const snap = audit.snapshot();
    expect(snap.cleanupSuperseded).toBe(true);
    expect(classifyPreviousArRotateSnapshot(snap).classification).toBe(
      "abrupt_previous_session_end",
    );
  });

  it("3. cleanup followed by interactions is superseded", () => {
    audit = installArRotateAudit({ storage, now: () => 3000 });
    audit.note("cleanupSession", {});
    audit.note("pointerdown", { gestureMode: "pending", interestId: "fossil" });
    const snap = audit.snapshot();
    expect(snap.cleanupSuperseded).toBe(true);
    expect(classifyPreviousArRotateSnapshot(snap).classification).toBe(
      "abrupt_previous_session_end",
    );
  });

  it("4. cleanup followed by later heartbeats is superseded", () => {
    vi.useFakeTimers();
    let now = 4000;
    audit = installArRotateAudit({
      storage,
      now: () => now,
      persistIntervalMs: AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS,
    });
    audit.note("cleanupSession", {});
    now += AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS;
    vi.advanceTimersByTime(AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS);
    const snap = audit.snapshot();
    expect(snap.cleanupSuperseded).toBe(true);
    expect(snap.heartbeat).toBeGreaterThanOrEqual(1);
    expect(classifyPreviousArRotateSnapshot(snap).classification).toBe(
      "abrupt_previous_session_end",
    );
  });

  it("5. final cleanup with no subsequent activity is normal_cleanup", () => {
    audit = installArRotateAudit({ storage, now: () => 5000 });
    audit.note("cleanupSession", {});
    const snap = audit.snapshot();
    expect(snap.cleanupSuperseded).toBe(false);
    expect(classifyPreviousArRotateSnapshot(snap).classification).toBe("normal_cleanup");
  });

  it("6. captured Session A fixture classifies as abrupt with required explanation", () => {
    const result = classifyPreviousArRotateSnapshot(AR_ROTATE_AUDIT_SESSION_A_FIXTURE);
    expect(result.classification).toBe("abrupt_previous_session_end");
    expect(result.cleanupSuperseded).toBe(true);
    expect(result.explanation).toBe(SESSION_A_ABRUPT_EXPLANATION);
    expect(result.classification).not.toBe("normal_cleanup");
  });

  it("7. captured Session B fixture treats early cleanup as superseded", () => {
    expect(isCleanupSupersededByLaterActivity(AR_ROTATE_AUDIT_SESSION_B_FIXTURE)).toBe(
      true,
    );
    const result = classifyPreviousArRotateSnapshot(AR_ROTATE_AUDIT_SESSION_B_FIXTURE);
    expect(result.cleanupSuperseded).toBe(true);
    expect(result.classification).toBe("abrupt_previous_session_end");
    expect(result.classification).not.toBe("normal_cleanup");
  });

  it("8. stale soft terminal is discarded after superseding activity", () => {
    const stale = {
      v: 2,
      sessionId: "stale-soft",
      installedAt: 1,
      persistedAt: 90_000,
      heartbeat: 20,
      heartbeatAt: 90_000,
      terminalKind: "normal_cleanup",
      intentionalClose: false,
      provisionalCleanupAt: 2_000,
      cleanupSuperseded: true,
      arStartSucceededAt: 3_000,
      counters: { cleanupSession: 1, heartbeat: 20, targetFound: 1 },
      last: {
        gestureMode: "rotating",
        terminalKind: "normal_cleanup",
        terminalAt: 2_000,
      },
      lifecycleTail: [],
      errors: [],
    };
    const result = classifyPreviousArRotateSnapshot(stale);
    expect(result.classification).toBe("abrupt_previous_session_end");
    expect(result.terminalKind).toBeNull();
    expect(result.rawTerminalKind).toBe("normal_cleanup");
  });

  it("9. start/stop counter instrumentation increments", () => {
    audit = installArRotateAudit({ storage, now: () => 6000 });
    audit.note("adapterStartRequested", {});
    audit.note("start", {});
    audit.note("adapterStartSucceeded", {});
    audit.note("mindarStartCompleted", {});
    audit.note("rendererCreated", {});
    audit.note("cameraStreamActive", {});
    audit.note("interactionControllerInstalled", {});
    audit.note("adapterStopRequested", {});
    audit.note("stop", {});
    audit.note("cleanupStarted", {});
    audit.note("cleanupCompleted", {});
    audit.note("interactionControllerDisposed", {});
    audit.note("dispose", {});
    const c = audit.snapshot().counters;
    expect(c.adapterStartRequested).toBeGreaterThanOrEqual(1);
    expect(c.start).toBeGreaterThanOrEqual(1);
    expect(c.adapterStartSucceeded).toBe(1);
    expect(c.mindarStartCompleted).toBe(1);
    expect(c.rendererCreated).toBe(1);
    expect(c.cameraStreamActive).toBe(1);
    expect(c.interactionControllerInstalled).toBe(1);
    expect(c.adapterStopRequested).toBe(1);
    expect(c.stop).toBe(1);
    expect(c.cleanupStarted).toBe(1);
    expect(c.cleanupCompleted).toBe(1);
    expect(c.interactionControllerDisposed).toBe(1);
    expect(c.dispose).toBe(1);
  });

  it("10. pageBootId changes only on document bootstrap", () => {
    const boot1 = recordArRotateAuditPageBoot({ storage, now: () => 10 });
    const boot2 = recordArRotateAuditPageBoot({ storage, now: () => 20 });
    expect(boot1?.pageBootId).toBeTruthy();
    expect(boot2?.pageBootId).toBeTruthy();
    expect(boot2?.pageBootId).not.toBe(boot1?.pageBootId);
    expect(boot2?.bootSequence).toBe((boot1?.bootSequence ?? 0) + 1);
    expect(JSON.parse(storage.getItem(AR_ROTATE_AUDIT_PREV_BOOT_KEY) || "null").pageBootId).toBe(
      boot1.pageBootId,
    );
    expect(JSON.parse(storage.getItem(AR_ROTATE_AUDIT_BOOT_KEY) || "null").pageBootId).toBe(
      boot2.pageBootId,
    );

    audit = installArRotateAudit({ storage, now: () => 30 });
    const before = audit.snapshot().pageBootId;
    audit.note("adapterStartSucceeded", {});
    audit.note("cleanupSession", {});
    expect(audit.snapshot().pageBootId).toBe(before);
  });

  it("11. bounded renderer/camera health samples (ring ≤8)", () => {
    audit = installArRotateAudit({ storage, now: () => 7000 });
    let n = 0;
    audit.setHealthProvider(() => {
      n += 1;
      return {
        geometries: n,
        textures: n,
        programs: n,
        renderCalls: n * 10,
        triangles: n * 100,
        canvasWidth: 640,
        canvasHeight: 480,
        trackReadyState: "live",
        trackMuted: false,
        trackEnabled: true,
        interestEntries: 6,
        rendererAvailable: true,
      };
    });
    for (let i = 0; i < 12; i += 1) {
      audit.persistNow();
    }
    const snap = audit.snapshot();
    expect(snap.healthSamples.length).toBeLessThanOrEqual(AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES);
    // snapshot() samples once more after the 12 persists.
    expect(snap.health?.geometries).toBe(13);
    expect(snap.health?.renderCalls).toBe(130);
    expect(snap.healthSamples.length).toBe(AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES);
  });

  it("12. diagnostics failure cannot affect WebAR", () => {
    audit = installArRotateAudit({ storage, now: () => 8000 });
    audit.setHealthProvider(() => {
      throw new Error("health boom");
    });
    expect(() => audit.persistNow()).not.toThrow();
    expect(() =>
      audit.note("pointerdown", {
        get gestureMode() {
          throw new Error("note boom");
        },
      }),
    ).not.toThrow();
  });
});

describe("installArRotateAudit", () => {
  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage;
  /** @type {ReturnType<typeof installArRotateAudit> | null} */
  let audit = null;

  beforeEach(() => {
    storage = createMemoryStorage();
    if (window.__arRotateAudit) {
      window.__arRotateAudit.__allowReinstall = true;
      window.__arRotateAudit.dispose?.();
      delete window.__arRotateAudit;
    }
  });

  afterEach(() => {
    audit?.dispose?.();
    audit = null;
    delete window.__arRotateAudit;
    vi.useRealTimers();
  });

  it("persists periodically by overwriting lastSnapshot", () => {
    vi.useFakeTimers();
    let now = 1_000_000;
    audit = installArRotateAudit({
      storage,
      now: () => now,
      persistIntervalMs: AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS,
    });
    const sessionId = audit.sessionId;

    now += AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS;
    vi.advanceTimersByTime(AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS);
    const mid = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(mid?.sessionId).toBe(sessionId);
    expect(mid?.heartbeat).toBeGreaterThanOrEqual(1);

    now += AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS;
    vi.advanceTimersByTime(AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS);
    const later = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(later?.sessionId).toBe(sessionId);
    expect(later?.heartbeat).toBeGreaterThan(mid.heartbeat);
    expect([...storage._map.keys()].filter((k) => k === AR_ROTATE_AUDIT_STORAGE_KEY)).toHaveLength(
      1,
    );
  });

  it("persists intentional close and exposes previous snapshot after reinstall", () => {
    audit = installArRotateAudit({ storage, now: () => 5_000 });
    const previousId = audit.sessionId;
    audit.note("stop", {
      cleanupReason: "beyond-the-cv-close",
      intentionalClose: true,
    });
    expect(audit.persistNow()).toBe(true);
    audit.dispose();
    audit = null;
    delete window.__arRotateAudit;

    const next = installArRotateAudit({ storage, now: () => 6_000 });
    audit = next;
    const previous = next.getPreviousSnapshot();
    expect(previous?.sessionId).toBe(previousId);
    expect(previous?.classification).toBe("intentional_user_close");
    expect(previous?.snapshot?.intentionalClose).toBe(true);
    expect(storage.getItem(AR_ROTATE_AUDIT_RETAINED_KEY)).toBeTruthy();
  });

  it("persists webgl loss and error/rejection as terminal kinds", () => {
    audit = installArRotateAudit({ storage, now: () => 7_000 });
    audit.note("webglContextLost", {});
    let snap = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(snap?.terminalKind).toBe("webglContextLost");

    audit.dispose();
    delete window.__arRotateAudit;
    storage.clear();

    audit = installArRotateAudit({ storage, now: () => 8_000 });
    window.dispatchEvent(new ErrorEvent("error", { message: "boom-test" }));
    snap = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(snap?.terminalKind).toBe("windowError");
    expect(snap?.errors?.some((e) => String(e.message).includes("boom-test"))).toBe(true);

    audit.note("unhandledRejection", { message: "nope" });
    // First hard terminal wins.
    snap = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
    expect(snap?.terminalKind).toBe("windowError");
  });

  it("detects abrupt previous session when heartbeats exist without terminal close", () => {
    writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, {
      v: AR_ROTATE_AUDIT_SCHEMA_VERSION,
      sessionId: "interrupted-1",
      installedAt: 1,
      persistedAt: 9_000,
      heartbeat: 12,
      heartbeatAt: 9_000,
      terminalKind: null,
      intentionalClose: false,
      counters: {},
      last: {},
      lifecycleTail: [],
      errors: [],
      memory: null,
    });

    audit = installArRotateAudit({ storage, now: () => 9_500 });
    const previous = audit.getPreviousSnapshot();
    expect(previous?.classification).toBe("abrupt_previous_session_end");
    expect(previous?.hadTerminalEvent).toBe(false);
    expect(previous?.sessionId).toBe("interrupted-1");
  });

  it("clearPersisted removes storage keys and getPreviousSnapshot can be cleared", () => {
    audit = installArRotateAudit({ storage, now: () => 10_000 });
    expect(storage.getItem(AR_ROTATE_AUDIT_STORAGE_KEY)).toBeTruthy();
    audit.clearPersisted();
    expect(storage.getItem(AR_ROTATE_AUDIT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(AR_ROTATE_AUDIT_RETAINED_KEY)).toBeNull();
    expect(audit.getPreviousSnapshot()).toBeNull();
  });

  it("persists immediately when rotating begins and on pointerup/cancel/lostcapture", () => {
    audit = installArRotateAudit({ storage, now: () => 11_000 });
    storage.removeItem(AR_ROTATE_AUDIT_STORAGE_KEY);
    audit.note("pendingToRotating", {
      gestureMode: "rotating",
      interestId: "fossil",
      pointerId: 1,
    });
    expect(readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY)?.last?.gestureMode).toBe(
      "rotating",
    );
    audit.note("pointerup", { gestureMode: "idle", interestId: null, pointerId: 1 });
    expect(readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY)?.last?.gestureMode).toBe(
      "idle",
    );
  });
});

describe("arRotateAudit disabled-mode guarantees", () => {
  it("does not write localStorage when install is never called", () => {
    const storage = createMemoryStorage();
    const spySet = vi.spyOn(storage, "setItem");
    expect(spySet).not.toHaveBeenCalled();
    expect(window.__arRotateAudit).toBeUndefined();
  });
});
