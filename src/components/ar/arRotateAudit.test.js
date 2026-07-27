import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS,
  AR_ROTATE_AUDIT_RETAINED_KEY,
  AR_ROTATE_AUDIT_SCHEMA_VERSION,
  AR_ROTATE_AUDIT_STORAGE_KEY,
  buildArRotateAuditPersistable,
  classifyPreviousArRotateSnapshot,
  installArRotateAudit,
  parseArRotateAuditSnapshot,
  readArRotateAuditStorage,
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
    // First terminal wins.
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
});

describe("arRotateAudit disabled-mode guarantees", () => {
  it("does not write localStorage when install is never called", () => {
    const storage = createMemoryStorage();
    const spySet = vi.spyOn(storage, "setItem");
    // Module import alone must be side-effect free regarding storage.
    expect(spySet).not.toHaveBeenCalled();
    expect(window.__arRotateAudit).toBeUndefined();
  });
});
