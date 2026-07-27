/**
 * Opt-in diagnostic probe for visitor-rotation P1 investigation.
 * Enable with ?arRotateAudit=1 (session-latched via arRuntimeFlags).
 *
 * In-memory counters remain primary; a compact snapshot is persisted to
 * localStorage on a low-frequency timer and on terminal lifecycle events.
 * Never persists on every pointermove.
 */

export const AR_ROTATE_AUDIT_STORAGE_KEY = "arRotateAudit:lastSnapshot";
export const AR_ROTATE_AUDIT_RETAINED_KEY = "arRotateAudit:retainedPrevious";
export const AR_ROTATE_AUDIT_SCHEMA_VERSION = 1;
export const AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS = 3000;
export const AR_ROTATE_AUDIT_MAX_ERRORS = 10;
export const AR_ROTATE_AUDIT_MAX_LIFECYCLE = 24;
export const AR_ROTATE_AUDIT_MAX_MESSAGE_LEN = 160;
export const AR_ROTATE_AUDIT_MAX_PAYLOAD_CHARS = 12_000;
/** Heartbeat considered "recent" for abrupt-end classification (ms). */
export const AR_ROTATE_AUDIT_RECENT_HEARTBEAT_MS = 15_000;

const MOVE_SAMPLE_EVERY = 30;
const TARGET_LOST_PERSIST_EVERY = 5;

/** @typedef {{
 *   pointerdown: number,
 *   pointermove: number,
 *   pointermoveSampled: number,
 *   pointerup: number,
 *   pointercancel: number,
 *   lostpointercapture: number,
 *   pendingToRotating: number,
 *   captureOk: number,
 *   captureFail: number,
 *   cancelActiveGesture: number,
 *   dispose: number,
 *   start: number,
 *   stop: number,
 *   cleanupSession: number,
 *   targetFound: number,
 *   targetLost: number,
 *   windowError: number,
 *   unhandledRejection: number,
 *   webglContextLost: number,
 *   webglContextRestored: number,
 *   visibilityHidden: number,
 *   visibilityVisible: number,
 *   pagehide: number,
 *   cameraTrackEnded: number,
 *   heartbeat: number,
 * }} ArRotateAuditCounters */

/**
 * @param {string} message
 */
export function truncateAuditMessage(message) {
  const text = String(message ?? "");
  if (text.length <= AR_ROTATE_AUDIT_MAX_MESSAGE_LEN) return text;
  return `${text.slice(0, AR_ROTATE_AUDIT_MAX_MESSAGE_LEN)}…`;
}

/**
 * @returns {string}
 */
export function createArRotateAuditSessionId() {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return rand;
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
export function parseArRotateAuditSnapshot(raw) {
  if (raw == null) return null;
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object") return null;
    if (value.v !== AR_ROTATE_AUDIT_SCHEMA_VERSION) return null;
    if (typeof value.sessionId !== "string" || !value.sessionId) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Classify a persisted snapshot from a prior page load.
 * Never labels OOM / Safari kill / memory pressure.
 *
 * @param {object | null | undefined} snapshot
 * @param {{ now?: number }} [options]
 * @returns {{
 *   classification: string,
 *   intentionalClose: boolean,
 *   hadTerminalEvent: boolean,
 *   sessionId: string | null,
 *   persistedAt: number | null,
 *   terminalKind: string | null,
 *   heartbeat: number,
 *   heartbeatAt: number | null,
 * }}
 */
export function classifyPreviousArRotateSnapshot(snapshot, options = {}) {
  const now = options.now ?? Date.now();
  if (!snapshot || typeof snapshot !== "object") {
    return {
      classification: "none",
      intentionalClose: false,
      hadTerminalEvent: false,
      sessionId: null,
      persistedAt: null,
      terminalKind: null,
      heartbeat: 0,
      heartbeatAt: null,
    };
  }

  const terminalKind =
    typeof snapshot.terminalKind === "string" ? snapshot.terminalKind : null;
  const intentionalClose = Boolean(snapshot.intentionalClose);
  const heartbeat = Number(snapshot.heartbeat) || 0;
  const heartbeatAt =
    typeof snapshot.heartbeatAt === "number" ? snapshot.heartbeatAt : null;
  const persistedAt =
    typeof snapshot.persistedAt === "number" ? snapshot.persistedAt : null;
  const sessionId =
    typeof snapshot.sessionId === "string" ? snapshot.sessionId : null;

  let classification = "unknown_previous_session_end";

  if (intentionalClose || terminalKind === "intentional_user_close") {
    classification = "intentional_user_close";
  } else if (terminalKind === "application_fallback") {
    classification = "application_fallback";
  } else if (terminalKind === "cleanupSession" || terminalKind === "normal_cleanup") {
    classification = "normal_cleanup";
  } else if (terminalKind === "webglContextLost") {
    classification = "webgl_context_lost";
  } else if (terminalKind === "cameraTrackEnded") {
    classification = "camera_ended";
  } else if (terminalKind === "windowError") {
    classification = "javascript_error";
  } else if (terminalKind === "unhandledRejection") {
    classification = "unhandled_rejection";
  } else if (terminalKind === "pagehide") {
    classification = "pagehide";
  } else if (terminalKind === "visibilityHidden") {
    classification = "visibility_hidden";
  } else if (terminalKind === "reload_or_navigation") {
    classification = "reload_or_navigation";
  } else if (
    !terminalKind &&
    !intentionalClose &&
    heartbeat > 0 &&
    heartbeatAt != null &&
    now - heartbeatAt <= AR_ROTATE_AUDIT_RECENT_HEARTBEAT_MS
  ) {
    classification = "abrupt_previous_session_end";
  } else if (!terminalKind && !intentionalClose && heartbeat > 0) {
    classification = "abrupt_previous_session_end";
  }

  return {
    classification,
    intentionalClose,
    hadTerminalEvent: Boolean(terminalKind),
    sessionId,
    persistedAt,
    terminalKind,
    heartbeat,
    heartbeatAt,
  };
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} key
 */
export function readArRotateAuditStorage(storage, key) {
  if (!storage) return null;
  try {
    return parseArRotateAuditSnapshot(storage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} key
 * @param {object} snapshot
 * @returns {boolean}
 */
export function writeArRotateAuditStorage(storage, key, snapshot) {
  if (!storage || !snapshot) return false;
  try {
    let text = JSON.stringify(snapshot);
    if (text.length > AR_ROTATE_AUDIT_MAX_PAYLOAD_CHARS) {
      const trimmed = {
        ...snapshot,
        lifecycleTail: Array.isArray(snapshot.lifecycleTail)
          ? snapshot.lifecycleTail.slice(-8)
          : [],
        errors: Array.isArray(snapshot.errors) ? snapshot.errors.slice(-4) : [],
        memory: snapshot.memory ?? null,
      };
      text = JSON.stringify(trimmed);
      if (text.length > AR_ROTATE_AUDIT_MAX_PAYLOAD_CHARS) {
        text = JSON.stringify({
          v: AR_ROTATE_AUDIT_SCHEMA_VERSION,
          sessionId: snapshot.sessionId,
          installedAt: snapshot.installedAt,
          persistedAt: snapshot.persistedAt,
          heartbeat: snapshot.heartbeat,
          heartbeatAt: snapshot.heartbeatAt,
          terminalKind: snapshot.terminalKind ?? null,
          intentionalClose: Boolean(snapshot.intentionalClose),
          truncated: true,
        });
      }
    }
    storage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   sessionId: string,
 *   installedAt: number,
 *   counters: ArRotateAuditCounters,
 *   last: Record<string, unknown>,
 *   errors: Array<{ t: number, kind: string, message: string }>,
 *   lifecycleTail: Array<{ t: number, kind: string }>,
 *   memorySamples: Array<{ t: number, usedJSHeapSize?: number, totalJSHeapSize?: number }>,
 *   heartbeat: number,
 *   heartbeatAt: number | null,
 *   intentionalClose: boolean,
 *   terminalKind: string | null,
 *   now?: number,
 *   href?: string,
 *   visibilityState?: string,
 * }} state
 */
export function buildArRotateAuditPersistable(state) {
  const now = state.now ?? Date.now();
  const lastMem = state.memorySamples?.length
    ? state.memorySamples[state.memorySamples.length - 1]
    : null;
  return {
    v: AR_ROTATE_AUDIT_SCHEMA_VERSION,
    sessionId: state.sessionId,
    installedAt: state.installedAt,
    persistedAt: now,
    heartbeat: state.heartbeat,
    heartbeatAt: state.heartbeatAt,
    terminalKind: state.terminalKind,
    intentionalClose: Boolean(state.intentionalClose),
    cleanupReason:
      typeof state.last?.cleanupReason === "string" ? state.last.cleanupReason : null,
    counters: { ...state.counters },
    last: {
      gestureMode: state.last?.gestureMode ?? null,
      interestId: state.last?.interestId ?? null,
      pointerId: state.last?.pointerId ?? null,
      cleanupReason: state.last?.cleanupReason ?? null,
      terminalKind: state.last?.terminalKind ?? null,
      terminalAt: state.last?.terminalAt ?? null,
    },
    lifecycleTail: (state.lifecycleTail || []).slice(-AR_ROTATE_AUDIT_MAX_LIFECYCLE),
    errors: (state.errors || []).slice(-AR_ROTATE_AUDIT_MAX_ERRORS),
    memory: lastMem
      ? {
          t: lastMem.t,
          usedJSHeapSize: lastMem.usedJSHeapSize,
          totalJSHeapSize: lastMem.totalJSHeapSize,
        }
      : null,
    href: typeof state.href === "string" ? state.href.slice(0, 240) : "",
    visibilityState: state.visibilityState ?? null,
  };
}

function emptyCounters() {
  return {
    pointerdown: 0,
    pointermove: 0,
    pointermoveSampled: 0,
    pointerup: 0,
    pointercancel: 0,
    lostpointercapture: 0,
    pendingToRotating: 0,
    captureOk: 0,
    captureFail: 0,
    cancelActiveGesture: 0,
    dispose: 0,
    start: 0,
    stop: 0,
    cleanupSession: 0,
    targetFound: 0,
    targetLost: 0,
    windowError: 0,
    unhandledRejection: 0,
    webglContextLost: 0,
    webglContextRestored: 0,
    visibilityHidden: 0,
    visibilityVisible: 0,
    pagehide: 0,
    cameraTrackEnded: 0,
    heartbeat: 0,
  };
}

/**
 * @param {{
 *   storage?: Storage | null,
 *   now?: () => number,
 *   persistIntervalMs?: number,
 * }} [options]
 */
export function installArRotateAudit(options = {}) {
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof localStorage !== "undefined"
        ? localStorage
        : null;
  const nowFn = options.now ?? (() => Date.now());
  const persistIntervalMs =
    options.persistIntervalMs ?? AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS;

  if (typeof window === "undefined") {
    return {
      enabled: true,
      sessionId: "ssr",
      installedAt: nowFn(),
      counters: emptyCounters(),
      last: {},
      memorySamples: [],
      errors: [],
      note() {},
      snapshot: () => ({}),
      persistNow: () => false,
      getPreviousSnapshot: () => null,
      clearPersisted: () => {},
      dispose() {},
    };
  }

  // Avoid double-install replacing an active probe mid-session.
  if (window.__arRotateAudit?.enabled && !window.__arRotateAudit.__allowReinstall) {
    return window.__arRotateAudit;
  }

  const sessionId = createArRotateAuditSessionId();
  const installedAt = nowFn();

  const previousRaw = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
  const retainedRaw = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_RETAINED_KEY);
  /** Prefer lastSnapshot from interrupted run; fall back to already-retained copy. */
  let retainedPrevious = null;
  if (previousRaw && previousRaw.sessionId !== sessionId) {
    retainedPrevious = previousRaw;
    writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_RETAINED_KEY, previousRaw);
  } else if (retainedRaw) {
    retainedPrevious = retainedRaw;
  }

  const previousClassification = classifyPreviousArRotateSnapshot(retainedPrevious, {
    now: installedAt,
  });

  /** @type {ArRotateAuditCounters} */
  const counters = emptyCounters();

  /** @type {Record<string, unknown>} */
  const last = {
    gestureMode: "idle",
    interestId: null,
    pointerId: null,
    cleanupReason: null,
  };

  /** @type {Array<{ t: number, usedJSHeapSize?: number, totalJSHeapSize?: number }>} */
  const memorySamples = [];
  /** @type {Array<{ t: number, kind: string, message: string }>} */
  const errors = [];
  /** @type {Array<{ t: number, kind: string }>} */
  const lifecycleTail = [];

  let intentionalClose = false;
  /** @type {string | null} */
  let terminalKind = null;
  let heartbeat = 0;
  /** @type {number | null} */
  let heartbeatAt = null;
  let disposed = false;

  function sampleMemory(force = false) {
    const mem =
      typeof performance !== "undefined"
        ? /** @type {{ memory?: { usedJSHeapSize: number, totalJSHeapSize: number } }} */ (
            performance
          ).memory
        : undefined;
    if (!mem && !force) return;
    memorySamples.push({
      t: nowFn(),
      usedJSHeapSize: mem?.usedJSHeapSize,
      totalJSHeapSize: mem?.totalJSHeapSize,
    });
    if (memorySamples.length > 8) {
      memorySamples.splice(0, memorySamples.length - 8);
    }
  }

  function pushLifecycle(kind) {
    lifecycleTail.push({ t: nowFn(), kind });
    if (lifecycleTail.length > AR_ROTATE_AUDIT_MAX_LIFECYCLE) {
      lifecycleTail.splice(0, lifecycleTail.length - AR_ROTATE_AUDIT_MAX_LIFECYCLE);
    }
  }

  function buildPersistable() {
    return buildArRotateAuditPersistable({
      sessionId,
      installedAt,
      counters,
      last,
      errors,
      lifecycleTail,
      memorySamples,
      heartbeat,
      heartbeatAt,
      intentionalClose,
      terminalKind,
      now: nowFn(),
      href: String(window.location?.href || ""),
      visibilityState: document.visibilityState,
    });
  }

  function persistNow() {
    if (disposed) return false;
    sampleMemory(false);
    return writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, buildPersistable());
  }

  /**
   * @param {string} kind
   * @param {boolean} [isTerminal]
   */
  function markTerminal(kind, isTerminal = true) {
    if (!isTerminal) return;
    if (!terminalKind) {
      terminalKind = kind;
      last.terminalKind = kind;
      last.terminalAt = nowFn();
    }
  }

  /**
   * @param {string} kind
   * @param {Record<string, unknown>} [extra]
   */
  function note(kind, extra = {}) {
    if (disposed) return;

    if (kind in counters) {
      // @ts-expect-error dynamic counter key
      counters[kind] += 1;
    }

    if (kind === "pointermove") {
      if (counters.pointermove % MOVE_SAMPLE_EVERY === 0) {
        counters.pointermoveSampled += 1;
        Object.assign(last, extra);
        sampleMemory();
      }
      return;
    }

    Object.assign(last, extra);
    if (extra.intentionalClose === true || extra.cleanupReason === "beyond-the-cv-close") {
      intentionalClose = true;
    }

    const lifecycleKinds = new Set([
      "cleanupSession",
      "stop",
      "dispose",
      "start",
      "targetFound",
      "targetLost",
      "visibilityHidden",
      "visibilityVisible",
      "pagehide",
      "webglContextLost",
      "webglContextRestored",
      "cameraTrackEnded",
      "windowError",
      "unhandledRejection",
      "heartbeat",
    ]);
    if (lifecycleKinds.has(kind)) pushLifecycle(kind);

    if (kind === "targetLost") {
      // Sampled persistence only — not a terminal failure.
      if (counters.targetLost % TARGET_LOST_PERSIST_EVERY === 0) persistNow();
      return;
    }

    if (kind === "stop" && intentionalClose) {
      markTerminal("intentional_user_close");
      sampleMemory(true);
      persistNow();
      console.info("[ar-rotate-audit]", kind, {
        sessionId,
        terminalKind,
        intentionalClose,
      });
      return;
    }

    if (kind === "cleanupSession") {
      markTerminal(intentionalClose ? "intentional_user_close" : "normal_cleanup");
      sampleMemory(true);
      persistNow();
      console.info("[ar-rotate-audit]", kind, { sessionId, terminalKind, intentionalClose });
      return;
    }

    if (kind === "application_fallback") {
      markTerminal("application_fallback");
      sampleMemory(true);
      persistNow();
      return;
    }

    if (
      kind === "webglContextLost" ||
      kind === "windowError" ||
      kind === "unhandledRejection" ||
      kind === "pagehide" ||
      kind === "cameraTrackEnded"
    ) {
      markTerminal(kind);
      sampleMemory(true);
      persistNow();
      console.info("[ar-rotate-audit]", kind, { sessionId, terminalKind });
      return;
    }

    if (kind === "visibilityHidden") {
      // Persist state; do not assume failure.
      sampleMemory(true);
      persistNow();
    }
  }

  function onError(event) {
    const message = truncateAuditMessage(event?.message || event?.error || "error");
    errors.push({ t: nowFn(), kind: "error", message });
    if (errors.length > AR_ROTATE_AUDIT_MAX_ERRORS) {
      errors.splice(0, errors.length - AR_ROTATE_AUDIT_MAX_ERRORS);
    }
    note("windowError", { message });
  }

  function onRejection(event) {
    const reason = event?.reason;
    const message = truncateAuditMessage(
      reason instanceof Error ? reason.message : String(reason ?? "rejection"),
    );
    errors.push({ t: nowFn(), kind: "unhandledrejection", message });
    if (errors.length > AR_ROTATE_AUDIT_MAX_ERRORS) {
      errors.splice(0, errors.length - AR_ROTATE_AUDIT_MAX_ERRORS);
    }
    note("unhandledRejection", { message });
  }

  function onContextLost(event) {
    note("webglContextLost", {
      message: "webglcontextlost",
      cancelable: Boolean(event?.cancelable),
    });
  }

  function onContextRestored() {
    note("webglContextRestored", {});
  }

  function onVisibility() {
    if (document.visibilityState === "hidden") {
      note("visibilityHidden", { visibilityState: document.visibilityState });
    } else {
      note("visibilityVisible", { visibilityState: document.visibilityState });
    }
  }

  function onPageHide(event) {
    note("pagehide", { persisted: Boolean(event?.persisted) });
  }

  /** @type {Set<MediaStreamTrack>} */
  const boundTracks = new Set();

  function onTrackEnded() {
    note("cameraTrackEnded", { message: "MediaStreamTrack ended" });
  }

  function bindCameraTracks() {
    const video = document.querySelector("[data-ar-tracking-container='true'] video");
    if (!(video instanceof HTMLVideoElement)) return;
    const stream = video.srcObject;
    if (!(stream instanceof MediaStream)) return;
    for (const track of stream.getTracks()) {
      if (boundTracks.has(track)) continue;
      boundTracks.add(track);
      track.addEventListener("ended", onTrackEnded);
    }
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);

  const bindCanvas = () => {
    const canvas = document.querySelector("[data-ar-tracking-container='true'] canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    return canvas;
  };

  let boundCanvas = bindCanvas();
  bindCameraTracks();

  const persistTimer = window.setInterval(() => {
    if (disposed) return;
    heartbeat += 1;
    counters.heartbeat += 1;
    heartbeatAt = nowFn();
    pushLifecycle("heartbeat");
    persistNow();
    if (!boundCanvas) boundCanvas = bindCanvas();
    bindCameraTracks();
  }, persistIntervalMs);

  sampleMemory(true);

  if (retainedPrevious) {
    console.info("[ar-rotate-audit] previous snapshot retained", {
      sessionId: previousClassification.sessionId,
      persistedAt: previousClassification.persistedAt,
      terminalKind: previousClassification.terminalKind,
      classification: previousClassification.classification,
      endedWithoutIntentionalCleanup:
        previousClassification.classification === "abrupt_previous_session_end",
    });
  }

  const api = {
    enabled: true,
    sessionId,
    installedAt,
    counters,
    last,
    memorySamples,
    errors,
    note,
    snapshot() {
      sampleMemory(true);
      return {
        ...buildPersistable(),
        now: nowFn(),
        previousClassification,
      };
    },
    persistNow,
    getPreviousSnapshot() {
      return retainedPrevious
        ? {
            snapshot: retainedPrevious,
            ...classifyPreviousArRotateSnapshot(retainedPrevious, { now: nowFn() }),
          }
        : null;
    },
    clearPersisted() {
      try {
        storage?.removeItem?.(AR_ROTATE_AUDIT_STORAGE_KEY);
        storage?.removeItem?.(AR_ROTATE_AUDIT_RETAINED_KEY);
      } catch {
        // ignore quota / privacy errors
      }
      retainedPrevious = null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.clearInterval(persistTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (boundCanvas) {
        boundCanvas.removeEventListener("webglcontextlost", onContextLost, false);
        boundCanvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      }
      for (const track of boundTracks) {
        try {
          track.removeEventListener("ended", onTrackEnded);
        } catch {
          // ignore
        }
      }
      boundTracks.clear();
      if (window.__arRotateAudit === api) delete window.__arRotateAudit;
    },
  };

  window.__arRotateAudit = api;
  console.info(
    "[ar-rotate-audit] installed — snapshot()/getPreviousSnapshot()/persistNow(); evidence survives reload via localStorage",
    { sessionId },
  );
  // Initial persist so a near-immediate crash still leaves a session marker.
  persistNow();
  return api;
}

export function isArRotateAuditEnabled() {
  return Boolean(typeof window !== "undefined" && window.__arRotateAudit?.enabled);
}
