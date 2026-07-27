/**
 * Opt-in diagnostic probe for visitor-rotation P1 investigation.
 * Enable with ?arRotateAudit=1 (session-latched via arRuntimeFlags).
 *
 * Lifecycle note: adapter.start() always begins with stop()/cleanupSession (P1-1).
 * That early cleanup is provisional and must never alone decide terminalKind.
 */

export const AR_ROTATE_AUDIT_STORAGE_KEY = "arRotateAudit:lastSnapshot";
export const AR_ROTATE_AUDIT_RETAINED_KEY = "arRotateAudit:retainedPrevious";
export const AR_ROTATE_AUDIT_BOOT_KEY = "arRotateAudit:pageBoot";
export const AR_ROTATE_AUDIT_PREV_BOOT_KEY = "arRotateAudit:previousPageBoot";
export const AR_ROTATE_AUDIT_SCHEMA_VERSION = 2;
export const AR_ROTATE_AUDIT_PERSIST_INTERVAL_MS = 3000;
export const AR_ROTATE_AUDIT_MAX_ERRORS = 10;
export const AR_ROTATE_AUDIT_MAX_LIFECYCLE = 32;
export const AR_ROTATE_AUDIT_MAX_MESSAGE_LEN = 160;
export const AR_ROTATE_AUDIT_MAX_PAYLOAD_CHARS = 14_000;
export const AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES = 8;
/** Heartbeat considered "recent" for abrupt-end classification (ms). */
export const AR_ROTATE_AUDIT_RECENT_HEARTBEAT_MS = 15_000;

const MOVE_SAMPLE_EVERY = 30;
const TARGET_LOST_PERSIST_EVERY = 5;

/** Hard terminals — never superseded by later AR activity in the same document. */
const HARD_TERMINAL_KINDS = new Set([
  "intentional_user_close",
  "application_fallback",
  "webglContextLost",
  "cameraTrackEnded",
  "windowError",
  "unhandledRejection",
  "pagehide",
  "reload_or_navigation",
]);

/** Soft / provisional markers that must not alone classify a run as ended. */
const SOFT_CLEANUP_KINDS = new Set([
  "cleanupSession",
  "normal_cleanup",
  "provisional_startup_cleanup",
  "cleanupStarted",
  "cleanupCompleted",
]);

/**
 * Captured Session A — interrupted physical-device run (regression fixture).
 * Early cleanup (~1s) was superseded by targetFound + ~90s heartbeats + active rotate.
 */
export const AR_ROTATE_AUDIT_SESSION_A_FIXTURE = Object.freeze({
  v: 2,
  sessionId: "86da49bc-84ab-4647-b2f2-452f95602710",
  installedAt: 1785148724842,
  persistedAt: 1785148816044,
  heartbeat: 30,
  heartbeatAt: 1785148816044,
  terminalKind: "normal_cleanup",
  intentionalClose: false,
  provisionalCleanupAt: 1785148725750,
  provisionalCleanupCount: 1,
  cleanupSuperseded: true,
  arStartSucceededAt: 1785148727000,
  lastTargetFoundAt: 1785148730000,
  lastInteractionAt: 1785148815000,
  arActive: true,
  counters: {
    pointerdown: 36,
    pointermove: 503,
    pointerup: 30,
    pendingToRotating: 12,
    captureOk: 36,
    captureFail: 0,
    cleanupSession: 1,
    adapterStartRequested: 1,
    adapterStartSucceeded: 1,
    targetFound: 1,
    targetLost: 0,
    windowError: 0,
    unhandledRejection: 0,
    webglContextLost: 0,
    cameraTrackEnded: 0,
    visibilityHidden: 0,
    pagehide: 0,
    heartbeat: 30,
    stop: 0,
    dispose: 0,
  },
  last: {
    gestureMode: "rotating",
    interestId: "fossil",
    pointerId: 1545162833,
    cleanupReason: "cleanupSession",
    terminalKind: "normal_cleanup",
    terminalAt: 1785148725750,
  },
  lifecycleTail: [
    { t: 1785148725750, kind: "provisional_startup_cleanup" },
    { t: 1785148727000, kind: "adapterStartSucceeded" },
    { t: 1785148730000, kind: "targetFound" },
    { t: 1785148816044, kind: "heartbeat" },
  ],
  errors: [],
  memory: null,
});

/**
 * Captured Session B — proves early cleanup is normal startup serialization.
 */
export const AR_ROTATE_AUDIT_SESSION_B_FIXTURE = Object.freeze({
  v: 2,
  sessionId: "7321d741-8b95-498b-8769-fa2eb3d486ee",
  installedAt: 1785148900000,
  persistedAt: 1785148940000,
  heartbeat: 13,
  heartbeatAt: 1785148940000,
  terminalKind: "normal_cleanup",
  intentionalClose: false,
  provisionalCleanupAt: 1785148901000,
  provisionalCleanupCount: 1,
  cleanupSuperseded: true,
  arStartSucceededAt: 1785148902000,
  lastTargetFoundAt: null,
  lastInteractionAt: null,
  arActive: true,
  counters: {
    cleanupSession: 1,
    adapterStartRequested: 1,
    adapterStartSucceeded: 1,
    heartbeat: 13,
    pointerdown: 0,
    targetFound: 0,
    windowError: 0,
    webglContextLost: 0,
  },
  last: {
    gestureMode: "idle",
    interestId: null,
    pointerId: null,
    terminalKind: "normal_cleanup",
    terminalAt: 1785148901000,
  },
  lifecycleTail: [
    { t: 1785148901000, kind: "provisional_startup_cleanup" },
    { t: 1785148902000, kind: "adapterStartSucceeded" },
    { t: 1785148940000, kind: "heartbeat" },
  ],
  errors: [],
  memory: null,
});

export const SESSION_A_ABRUPT_EXPLANATION =
  "An initial cleanup marker was superseded by later target detection, interactions and approximately 90 seconds of heartbeats. The final persisted state was an active rotation gesture, after which execution stopped without an intentional close or a recorded JavaScript, WebGL, camera, visibility or page-lifecycle terminal event.";

/**
 * @param {string} message
 */
export function truncateAuditMessage(message) {
  const text = String(message ?? "");
  if (text.length <= AR_ROTATE_AUDIT_MAX_MESSAGE_LEN) return text;
  return `${text.slice(0, AR_ROTATE_AUDIT_MAX_MESSAGE_LEN)}…`;
}

export function createArRotateAuditSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    if (value.v !== 1 && value.v !== AR_ROTATE_AUDIT_SCHEMA_VERSION) return null;
    if (typeof value.sessionId !== "string" || !value.sessionId) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * True when an early/soft cleanup was followed by real AR activity.
 * @param {object} snapshot
 */
export function isCleanupSupersededByLaterActivity(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (snapshot.cleanupSuperseded === true) return true;

  const cleanupAt =
    typeof snapshot.provisionalCleanupAt === "number"
      ? snapshot.provisionalCleanupAt
      : typeof snapshot.last?.terminalAt === "number" &&
          SOFT_CLEANUP_KINDS.has(String(snapshot.terminalKind || ""))
        ? snapshot.last.terminalAt
        : null;

  if (cleanupAt == null) {
    // Soft terminalKind with later heartbeats / interactions still counts.
    if (!SOFT_CLEANUP_KINDS.has(String(snapshot.terminalKind || ""))) return false;
  }

  const t0 = cleanupAt ?? 0;
  const counters = snapshot.counters || {};
  if (
    typeof snapshot.arStartSucceededAt === "number" &&
    snapshot.arStartSucceededAt > t0
  ) {
    return true;
  }
  if (
    typeof snapshot.lastTargetFoundAt === "number" &&
    snapshot.lastTargetFoundAt > t0
  ) {
    return true;
  }
  if (
    typeof snapshot.lastInteractionAt === "number" &&
    snapshot.lastInteractionAt > t0
  ) {
    return true;
  }
  if (
    (Number(counters.pointerdown) || 0) > 0 ||
    (Number(counters.pendingToRotating) || 0) > 0 ||
    (Number(counters.targetFound) || 0) > 0
  ) {
    if (cleanupAt != null) {
      const hbAt = snapshot.heartbeatAt;
      if (typeof hbAt === "number" && hbAt > cleanupAt) return true;
      if ((Number(counters.heartbeat) || 0) > 0) return true;
    } else {
      return true;
    }
  }
  if (
    typeof snapshot.heartbeatAt === "number" &&
    cleanupAt != null &&
    snapshot.heartbeatAt > cleanupAt &&
    (Number(counters.heartbeat) || 0) >= 1
  ) {
    return true;
  }
  return false;
}

/**
 * @param {object | null | undefined} snapshot
 * @param {{ now?: number }} [options]
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
      explanation: null,
      cleanupSuperseded: false,
    };
  }

  const rawTerminal =
    typeof snapshot.terminalKind === "string" ? snapshot.terminalKind : null;
  const intentionalClose = Boolean(snapshot.intentionalClose);
  const heartbeat = Number(snapshot.heartbeat) || 0;
  const heartbeatAt =
    typeof snapshot.heartbeatAt === "number" ? snapshot.heartbeatAt : null;
  const persistedAt =
    typeof snapshot.persistedAt === "number" ? snapshot.persistedAt : null;
  const sessionId =
    typeof snapshot.sessionId === "string" ? snapshot.sessionId : null;
  const superseded = isCleanupSupersededByLaterActivity(snapshot);

  /** Effective terminal after discarding stale soft cleanup markers. */
  let terminalKind = rawTerminal;
  if (SOFT_CLEANUP_KINDS.has(String(rawTerminal || "")) && superseded) {
    terminalKind = null;
  }

  const noInteractionEvidence =
    (Number(snapshot.counters?.pointerdown) || 0) === 0 &&
    (Number(snapshot.counters?.pendingToRotating) || 0) === 0 &&
    (Number(snapshot.counters?.targetFound) || 0) === 0 &&
    typeof snapshot.lastTargetFoundAt !== "number" &&
    typeof snapshot.lastInteractionAt !== "number" &&
    typeof snapshot.arStartSucceededAt !== "number";

  let classification = "unknown_previous_session_end";
  /** @type {string | null} */
  let explanation = null;

  if (intentionalClose || terminalKind === "intentional_user_close") {
    classification = "intentional_user_close";
  } else if (terminalKind === "application_fallback") {
    classification = "application_fallback";
  } else if (HARD_TERMINAL_KINDS.has(String(terminalKind || ""))) {
    if (terminalKind === "webglContextLost") classification = "webgl_context_lost";
    else if (terminalKind === "cameraTrackEnded") classification = "camera_ended";
    else if (terminalKind === "windowError") classification = "javascript_error";
    else if (terminalKind === "unhandledRejection") {
      classification = "unhandled_rejection";
    } else if (terminalKind === "pagehide") classification = "pagehide";
    else if (terminalKind === "reload_or_navigation") {
      classification = "reload_or_navigation";
    } else classification = String(terminalKind);
  } else if (
    !superseded &&
    !intentionalClose &&
    heartbeat === 0 &&
    noInteractionEvidence &&
    (SOFT_CLEANUP_KINDS.has(String(rawTerminal || "")) ||
      typeof snapshot.provisionalCleanupAt === "number" ||
      (Number(snapshot.counters?.cleanupSession) || 0) > 0)
  ) {
    // Cleanup with no subsequent AR activity (startup abort / empty teardown).
    classification = "normal_cleanup";
  } else if (
    !intentionalClose &&
    !HARD_TERMINAL_KINDS.has(String(terminalKind || "")) &&
    (heartbeat > 0 ||
      (Number(snapshot.counters?.pointerdown) || 0) > 0 ||
      (Number(snapshot.counters?.targetFound) || 0) > 0 ||
      typeof snapshot.arStartSucceededAt === "number" ||
      snapshot.last?.gestureMode === "rotating" ||
      snapshot.last?.gestureMode === "pending" ||
      superseded)
  ) {
    classification = "abrupt_previous_session_end";
    if (
      sessionId === AR_ROTATE_AUDIT_SESSION_A_FIXTURE.sessionId ||
      (superseded && snapshot.last?.gestureMode === "rotating")
    ) {
      explanation = SESSION_A_ABRUPT_EXPLANATION;
    } else if (superseded) {
      explanation =
        "An initial cleanup marker was superseded by later AR activity; the run ended without an intentional close or a hard terminal event.";
    }
  } else if (
    !terminalKind &&
    !intentionalClose &&
    heartbeat > 0 &&
    heartbeatAt != null &&
    now - heartbeatAt <= AR_ROTATE_AUDIT_RECENT_HEARTBEAT_MS
  ) {
    classification = "abrupt_previous_session_end";
  }

  return {
    classification,
    intentionalClose,
    hadTerminalEvent: Boolean(terminalKind) && HARD_TERMINAL_KINDS.has(terminalKind),
    sessionId,
    persistedAt,
    terminalKind: terminalKind,
    rawTerminalKind: rawTerminal,
    heartbeat,
    heartbeatAt,
    explanation,
    cleanupSuperseded: superseded,
  };
}

export function readArRotateAuditStorage(storage, key) {
  if (!storage) return null;
  try {
    return parseArRotateAuditSnapshot(storage.getItem(key));
  } catch {
    return null;
  }
}

export function writeArRotateAuditStorage(storage, key, snapshot) {
  if (!storage || !snapshot) return false;
  try {
    let text = JSON.stringify(snapshot);
    if (text.length > AR_ROTATE_AUDIT_MAX_PAYLOAD_CHARS) {
      const trimmed = {
        ...snapshot,
        lifecycleTail: Array.isArray(snapshot.lifecycleTail)
          ? snapshot.lifecycleTail.slice(-10)
          : [],
        errors: Array.isArray(snapshot.errors) ? snapshot.errors.slice(-4) : [],
        healthSamples: Array.isArray(snapshot.healthSamples)
          ? snapshot.healthSamples.slice(-4)
          : [],
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
          cleanupSuperseded: Boolean(snapshot.cleanupSuperseded),
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
 * Earliest page-bootstrap record (opt-in caller only).
 * @param {{ storage?: Storage | null, now?: () => number }} [options]
 */
export function recordArRotateAuditPageBoot(options = {}) {
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof localStorage !== "undefined"
        ? localStorage
        : null;
  const nowFn = options.now ?? (() => Date.now());
  if (!storage) return null;

  try {
    const prev = (() => {
      try {
        return JSON.parse(storage.getItem(AR_ROTATE_AUDIT_BOOT_KEY) || "null");
      } catch {
        return null;
      }
    })();
    if (prev && typeof prev === "object") {
      storage.setItem(AR_ROTATE_AUDIT_PREV_BOOT_KEY, JSON.stringify(prev));
    }

    let navType = null;
    try {
      const entry = performance.getEntriesByType?.("navigation")?.[0];
      navType = entry?.type ?? null;
    } catch {
      navType = null;
    }

    const bootSequence =
      prev && typeof prev.bootSequence === "number" ? prev.bootSequence + 1 : 1;
    const boot = {
      pageBootId: createArRotateAuditSessionId(),
      bootSequence,
      timeOrigin:
        typeof performance !== "undefined" ? performance.timeOrigin : null,
      navigationType: navType,
      recordedAt: nowFn(),
      href: typeof location !== "undefined" ? String(location.href || "").slice(0, 240) : "",
    };
    storage.setItem(AR_ROTATE_AUDIT_BOOT_KEY, JSON.stringify(boot));
    if (typeof window !== "undefined") {
      window.__arRotateAuditPageBoot = boot;
      window.__arRotateAuditPreviousPageBoot = prev;
    }
    return boot;
  } catch {
    return null;
  }
}

export function buildArRotateAuditPersistable(state) {
  const now = state.now ?? Date.now();
  const lastMem = state.memorySamples?.length
    ? state.memorySamples[state.memorySamples.length - 1]
    : null;
  const lastHealth = state.healthSamples?.length
    ? state.healthSamples[state.healthSamples.length - 1]
    : null;
  return {
    v: AR_ROTATE_AUDIT_SCHEMA_VERSION,
    sessionId: state.sessionId,
    installedAt: state.installedAt,
    persistedAt: now,
    pageBootId: state.pageBootId ?? null,
    heartbeat: state.heartbeat,
    heartbeatAt: state.heartbeatAt,
    terminalKind: state.terminalKind,
    intentionalClose: Boolean(state.intentionalClose),
    provisionalCleanupAt: state.provisionalCleanupAt ?? null,
    provisionalCleanupCount: state.provisionalCleanupCount ?? 0,
    cleanupSuperseded: Boolean(state.cleanupSuperseded),
    arStartSucceededAt: state.arStartSucceededAt ?? null,
    lastTargetFoundAt: state.lastTargetFoundAt ?? null,
    lastInteractionAt: state.lastInteractionAt ?? null,
    arActive: Boolean(state.arActive),
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
      arActive: state.last?.arActive ?? null,
      targetVisible: state.last?.targetVisible ?? null,
    },
    lifecycleTail: (state.lifecycleTail || []).slice(-AR_ROTATE_AUDIT_MAX_LIFECYCLE),
    errors: (state.errors || []).slice(-AR_ROTATE_AUDIT_MAX_ERRORS),
    healthSamples: (state.healthSamples || []).slice(-AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES),
    health: lastHealth,
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
    adapterStartRequested: 0,
    adapterStartSucceeded: 0,
    adapterStartFailed: 0,
    adapterStopRequested: 0,
    cleanupStarted: 0,
    cleanupCompleted: 0,
    cleanupSession: 0,
    provisionalStartupCleanup: 0,
    interactionControllerInstalled: 0,
    interactionControllerDisposed: 0,
    mindarStartCompleted: 0,
    rendererCreated: 0,
    cameraStreamActive: 0,
    targetFound: 0,
    targetLost: 0,
    windowError: 0,
    unhandledRejection: 0,
    webglContextLost: 0,
    webglContextRestored: 0,
    visibilityHidden: 0,
    visibilityVisible: 0,
    pagehide: 0,
    pageshow: 0,
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
      note() {},
      snapshot: () => ({}),
      persistNow: () => false,
      getPreviousSnapshot: () => null,
      clearPersisted: () => {},
      setHealthProvider() {},
      dispose() {},
    };
  }

  if (window.__arRotateAudit?.enabled && !window.__arRotateAudit.__allowReinstall) {
    return window.__arRotateAudit;
  }

  const sessionId = createArRotateAuditSessionId();
  const installedAt = nowFn();
  let pageBootId = null;
  try {
    const boot = JSON.parse(storage?.getItem?.(AR_ROTATE_AUDIT_BOOT_KEY) || "null");
    pageBootId = boot?.pageBootId ?? null;
  } catch {
    pageBootId = null;
  }

  const previousRaw = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY);
  const retainedRaw = readArRotateAuditStorage(storage, AR_ROTATE_AUDIT_RETAINED_KEY);
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

  const counters = emptyCounters();
  const last = {
    gestureMode: "idle",
    interestId: null,
    pointerId: null,
    cleanupReason: null,
    arActive: false,
    targetVisible: null,
  };
  const memorySamples = [];
  const errors = [];
  const lifecycleTail = [];
  /** @type {Array<Record<string, unknown>>} */
  const healthSamples = [];

  let intentionalClose = false;
  /** @type {string | null} */
  let terminalKind = null;
  let heartbeat = 0;
  /** @type {number | null} */
  let heartbeatAt = null;
  let disposed = false;

  let provisionalCleanupAt = null;
  let provisionalCleanupCount = 0;
  let cleanupSuperseded = false;
  /** @type {number | null} */
  let arStartSucceededAt = null;
  /** @type {number | null} */
  let lastTargetFoundAt = null;
  /** @type {number | null} */
  let lastInteractionAt = null;
  let arActive = false;
  let arStartSucceeded = false;
  /** @type {null | (() => Record<string, unknown> | null | undefined)} */
  let healthProvider = null;

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
    if (memorySamples.length > 8) memorySamples.splice(0, memorySamples.length - 8);
  }

  function pushLifecycle(kind) {
    lifecycleTail.push({ t: nowFn(), kind });
    if (lifecycleTail.length > AR_ROTATE_AUDIT_MAX_LIFECYCLE) {
      lifecycleTail.splice(0, lifecycleTail.length - AR_ROTATE_AUDIT_MAX_LIFECYCLE);
    }
  }

  function sampleHealth() {
    if (!healthProvider) return;
    try {
      const sample = healthProvider();
      if (!sample || typeof sample !== "object") return;
      const bounded = {
        t: nowFn(),
        gestureMode: last.gestureMode,
        interestId: last.interestId,
        pointerId: last.pointerId,
        arActive,
        targetVisible: last.targetVisible,
        geometries: sample.geometries ?? null,
        textures: sample.textures ?? null,
        programs: sample.programs ?? null,
        renderCalls: sample.renderCalls ?? null,
        triangles: sample.triangles ?? null,
        canvasWidth: sample.canvasWidth ?? null,
        canvasHeight: sample.canvasHeight ?? null,
        trackReadyState: sample.trackReadyState ?? null,
        trackMuted: sample.trackMuted ?? null,
        trackEnabled: sample.trackEnabled ?? null,
        interestEntries: sample.interestEntries ?? null,
        rendererAvailable: sample.rendererAvailable ?? null,
      };
      healthSamples.push(bounded);
      if (healthSamples.length > AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES) {
        healthSamples.splice(0, healthSamples.length - AR_ROTATE_AUDIT_MAX_HEALTH_SAMPLES);
      }
      Object.assign(last, {
        arActive: bounded.arActive,
        targetVisible: bounded.targetVisible,
      });
    } catch {
      // Diagnostics must never affect WebAR.
    }
  }

  function buildPersistable() {
    return buildArRotateAuditPersistable({
      sessionId,
      installedAt,
      pageBootId,
      counters,
      last,
      errors,
      lifecycleTail,
      memorySamples,
      healthSamples,
      heartbeat,
      heartbeatAt,
      intentionalClose,
      terminalKind,
      provisionalCleanupAt,
      provisionalCleanupCount,
      cleanupSuperseded,
      arStartSucceededAt,
      lastTargetFoundAt,
      lastInteractionAt,
      arActive,
      now: nowFn(),
      href: String(window.location?.href || ""),
      visibilityState: document.visibilityState,
    });
  }

  function persistNow() {
    if (disposed) return false;
    try {
      sampleMemory(false);
      sampleHealth();
      return writeArRotateAuditStorage(storage, AR_ROTATE_AUDIT_STORAGE_KEY, buildPersistable());
    } catch {
      return false;
    }
  }

  function markHardTerminal(kind) {
    if (!terminalKind || SOFT_CLEANUP_KINDS.has(String(terminalKind))) {
      terminalKind = kind;
      last.terminalKind = kind;
      last.terminalAt = nowFn();
    }
  }

  function markActivityAfterCleanup() {
    if (provisionalCleanupAt != null) {
      cleanupSuperseded = true;
      if (SOFT_CLEANUP_KINDS.has(String(terminalKind || ""))) {
        terminalKind = null;
        last.terminalKind = null;
      }
    }
  }

  function note(kind, extra = {}) {
    if (disposed) return;
    try {
      if (kind in counters) {
        // @ts-expect-error dynamic
        counters[kind] += 1;
      }

      if (kind === "pointermove") {
        lastInteractionAt = nowFn();
        markActivityAfterCleanup();
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
        "cleanupStarted",
        "cleanupCompleted",
        "provisionalStartupCleanup",
        "provisional_startup_cleanup",
        "stop",
        "dispose",
        "start",
        "adapterStartRequested",
        "adapterStartSucceeded",
        "adapterStartFailed",
        "adapterStopRequested",
        "interactionControllerInstalled",
        "interactionControllerDisposed",
        "mindarStartCompleted",
        "rendererCreated",
        "cameraStreamActive",
        "targetFound",
        "targetLost",
        "visibilityHidden",
        "visibilityVisible",
        "pagehide",
        "pageshow",
        "webglContextLost",
        "webglContextRestored",
        "cameraTrackEnded",
        "windowError",
        "unhandledRejection",
        "heartbeat",
        "pendingToRotating",
        "application_fallback",
      ]);
      if (lifecycleKinds.has(kind)) pushLifecycle(kind);

      if (
        kind === "pointerdown" ||
        kind === "pointerup" ||
        kind === "pointercancel" ||
        kind === "lostpointercapture" ||
        kind === "pendingToRotating" ||
        kind === "captureOk"
      ) {
        lastInteractionAt = nowFn();
        markActivityAfterCleanup();
      }

      if (kind === "pendingToRotating") {
        persistNow();
        return;
      }
      if (kind === "pointerup" || kind === "pointercancel" || kind === "lostpointercapture") {
        persistNow();
        return;
      }

      if (kind === "adapterStartRequested" || kind === "start") {
        counters.adapterStartRequested = Math.max(
          counters.adapterStartRequested,
          counters.start,
        );
        persistNow();
        return;
      }

      if (kind === "adapterStartSucceeded" || kind === "mindarStartCompleted") {
        arStartSucceeded = true;
        arStartSucceededAt = nowFn();
        arActive = true;
        last.arActive = true;
        markActivityAfterCleanup();
        persistNow();
        return;
      }

      if (kind === "adapterStartFailed") {
        persistNow();
        return;
      }

      if (kind === "targetFound") {
        lastTargetFoundAt = nowFn();
        last.targetVisible = true;
        markActivityAfterCleanup();
        persistNow();
        return;
      }

      if (kind === "targetLost") {
        last.targetVisible = false;
        if (counters.targetLost % TARGET_LOST_PERSIST_EVERY === 0) persistNow();
        return;
      }

      if (kind === "cleanupStarted") {
        // Timeline + counter only; provisional vs final decided on cleanupSession.
        return;
      }

      if (kind === "cleanupSession") {
        const isProvisional = !arStartSucceeded && !intentionalClose;
        if (isProvisional) {
          provisionalCleanupCount += 1;
          provisionalCleanupAt = nowFn();
          counters.provisionalStartupCleanup += 1;
          pushLifecycle("provisional_startup_cleanup");
          // Soft marker only — never alone decides terminalKind.
          if (!terminalKind) {
            last.terminalKind = "provisional_startup_cleanup";
            last.terminalAt = provisionalCleanupAt;
          }
          sampleMemory(true);
          persistNow();
          return;
        }
        arActive = false;
        last.arActive = false;
        if (intentionalClose) {
          markHardTerminal("intentional_user_close");
        } else {
          // Active/post-start teardown without intentional close: keep timeline
          // only. Do not freeze terminalKind to normal_cleanup.
          pushLifecycle("cleanup_after_active");
        }
        sampleMemory(true);
        persistNow();
        return;
      }

      if (kind === "cleanupCompleted") {
        persistNow();
        return;
      }

      if (kind === "stop" || kind === "adapterStopRequested") {
        if (intentionalClose) {
          markHardTerminal("intentional_user_close");
          sampleMemory(true);
          persistNow();
        }
        return;
      }

      if (kind === "application_fallback") {
        markHardTerminal("application_fallback");
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
        markHardTerminal(kind);
        sampleMemory(true);
        persistNow();
        console.info("[ar-rotate-audit]", kind, { sessionId, terminalKind });
        return;
      }

      if (kind === "visibilityHidden" || kind === "pageshow") {
        sampleMemory(true);
        persistNow();
      }

      if (kind === "dispose" || kind === "interactionControllerDisposed") {
        persistNow();
      }
    } catch {
      // Diagnostics must never affect WebAR.
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

  function onPageShow(event) {
    note("pageshow", { persisted: Boolean(event?.persisted) });
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
  window.addEventListener("pageshow", onPageShow);

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
    try {
      heartbeat += 1;
      counters.heartbeat += 1;
      heartbeatAt = nowFn();
      markActivityAfterCleanup();
      pushLifecycle("heartbeat");
      persistNow();
      if (!boundCanvas) boundCanvas = bindCanvas();
      bindCameraTracks();
    } catch {
      // ignore
    }
  }, persistIntervalMs);

  sampleMemory(true);

  if (retainedPrevious) {
    console.info("[ar-rotate-audit] previous snapshot retained", {
      sessionId: previousClassification.sessionId,
      persistedAt: previousClassification.persistedAt,
      terminalKind: previousClassification.terminalKind,
      rawTerminalKind: previousClassification.rawTerminalKind,
      classification: previousClassification.classification,
      cleanupSuperseded: previousClassification.cleanupSuperseded,
      explanation: previousClassification.explanation,
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
    setHealthProvider(fn) {
      healthProvider = typeof fn === "function" ? fn : null;
    },
    snapshot() {
      sampleMemory(true);
      sampleHealth();
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
        // ignore
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
      window.removeEventListener("pageshow", onPageShow);
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
      healthProvider = null;
      if (window.__arRotateAudit === api) delete window.__arRotateAudit;
    },
  };

  window.__arRotateAudit = api;
  console.info(
    "[ar-rotate-audit] installed (lifecycle v2) — provisional startup cleanup is non-terminal",
    { sessionId, pageBootId },
  );
  persistNow();
  return api;
}

export function isArRotateAuditEnabled() {
  return Boolean(typeof window !== "undefined" && window.__arRotateAudit?.enabled);
}
