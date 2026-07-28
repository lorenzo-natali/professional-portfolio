/**
 * Bounded persistent AR exit/crash trace (sessionStorage).
 * Opt-in when ?arDiag= is present — production path unchanged.
 *
 * Distinguishes:
 * A) app-driven exits (cleanup / screen transitions)
 * B) media track/video failures
 * C) Safari/WebKit page reconstruction (new bootId + navigation type)
 */

export const AR_EXIT_TRACE_STORAGE_KEY = "arExitTrace.v1";
export const AR_EXIT_TRACE_MAX_EVENTS = 64;
/** Soft cap for serialized payload size (UTF-16 code units ≈ bytes for ASCII JSON). */
export const AR_EXIT_TRACE_MAX_CHARS = 12_000;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function wallMs() {
  return Date.now();
}

function makeBootId() {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `boot-${wallMs().toString(36)}-${rand}`;
}

function readNavigationType() {
  try {
    const entries = performance.getEntriesByType?.("navigation");
    const nav = entries && entries[0];
    if (nav && typeof nav.type === "string") return nav.type;
  } catch {
    // ignore
  }
  try {
    // Legacy fallback
    const legacy = performance.navigation?.type;
    if (legacy === 1) return "reload";
    if (legacy === 2) return "back_forward";
    if (legacy === 0) return "navigate";
  } catch {
    // ignore
  }
  return "unknown";
}

function safeStorage() {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function parseStored(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function trimEvents(events) {
  if (!Array.isArray(events)) return [];
  if (events.length <= AR_EXIT_TRACE_MAX_EVENTS) return events;
  return events.slice(events.length - AR_EXIT_TRACE_MAX_EVENTS);
}

function truncateDetail(detail) {
  if (detail == null) return undefined;
  const text = String(detail);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

/**
 * Classify whether the last exit looks app-driven, media-driven, or WebKit reconstruction.
 * Heuristic only — for the HUD / intro banner.
 * @param {object | null | undefined} previous
 * @param {{ bootIdChanged: boolean, navigationType: string }} bootMeta
 */
export function classifyExitHypothesis(previous, bootMeta) {
  if (!previous) return "none";
  const kinds = Array.isArray(previous.events)
    ? previous.events.map((e) => e.kind)
    : [];
  const lastReason = previous.lastReason || null;

  if (bootMeta?.bootIdChanged && bootMeta.navigationType === "reload") {
    return "webkit-or-reload";
  }
  if (
    bootMeta?.bootIdChanged &&
    (kinds.includes("pagehide") || kinds.includes("pageshow") || kinds.includes("beforeunload"))
  ) {
    // New JS boot after pagehide without an explicit app cleanup reason → likely reconstruction.
    const hadAppCleanup = kinds.some(
      (k) =>
        k === "arCleanup" ||
        k === "screenTransition" ||
        k === "componentUnmount" ||
        k === "streamStop",
    );
    if (!hadAppCleanup || lastReason === "pagehide" || lastReason === "beforeunload") {
      return "webkit-page-reconstruction";
    }
  }
  if (
    kinds.some((k) =>
      [
        "videoError",
        "videoEnded",
        "videoAbort",
        "trackEnded",
        "trackMute",
      ].includes(k),
    )
  ) {
    return "media-track-or-video";
  }
  if (
    kinds.some((k) =>
      ["arCleanup", "screenTransition", "componentUnmount", "errorBoundary", "streamStop"].includes(
        k,
      ),
    )
  ) {
    return "app-driven";
  }
  if (bootMeta?.bootIdChanged) return "webkit-or-unknown-boot";
  return "unknown";
}

/**
 * @param {{ force?: boolean, enabled?: boolean }} [options]
 */
export function installArExitTrace(options = {}) {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      record() {},
      dispose() {},
      getSnapshot() {
        return null;
      },
      copy: async () => "",
    };
  }

  if (window.__arExitTrace && !options.force) {
    return window.__arExitTrace;
  }

  const enabled = options.enabled !== false;
  if (!enabled) {
    const disabled = {
      enabled: false,
      record() {},
      dispose() {},
      getSnapshot() {
        return null;
      },
      copy: async () => "",
    };
    return disabled;
  }

  const storage = safeStorage();
  const bootId = makeBootId();
  const bootAt = wallMs();
  const bootPerf = nowMs();
  const navigationType = readNavigationType();

  const stored = parseStored(storage?.getItem(AR_EXIT_TRACE_STORAGE_KEY));
  const previousSession =
    stored?.current && stored.current.bootId && stored.current.bootId !== bootId
      ? stored.current
      : stored?.previous || null;
  const bootIdChanged = Boolean(
    previousSession?.bootId && previousSession.bootId !== bootId,
  );

  /** @type {{
   *   bootId: string,
   *   bootAt: number,
   *   bootPerf: number,
   *   navigationType: string,
   *   events: Array<Record<string, unknown>>,
   *   lastReason: string | null,
   * }} */
  const current = {
    bootId,
    bootAt,
    bootPerf,
    navigationType,
    events: [],
    lastReason: null,
  };

  let disposed = false;
  /** @type {Array<() => void>} */
  const unsubscribers = [];

  function persist() {
    if (!storage || disposed) return;
    const payload = {
      version: 1,
      previous: previousSession,
      current,
      bootMeta: {
        bootId,
        bootIdChanged,
        navigationType,
        previousBootId: previousSession?.bootId ?? null,
        previousLastReason: previousSession?.lastReason ?? null,
        hypothesis: classifyExitHypothesis(previousSession, {
          bootIdChanged,
          navigationType,
        }),
      },
    };
    let text = JSON.stringify(payload);
    // Bound size: drop oldest events until under cap.
    while (text.length > AR_EXIT_TRACE_MAX_CHARS && current.events.length > 8) {
      current.events.splice(0, Math.max(1, Math.floor(current.events.length / 4)));
      payload.current = current;
      text = JSON.stringify(payload);
    }
    try {
      storage.setItem(AR_EXIT_TRACE_STORAGE_KEY, text);
    } catch {
      // Quota / private mode — keep in-memory only.
    }
  }

  /**
   * @param {string} kind
   * @param {string | Record<string, unknown> | null | undefined} [detail]
   * @param {{ asReason?: boolean }} [opts]
   */
  function record(kind, detail, opts = {}) {
    if (disposed) return;
    const entry = {
      t: Math.round(nowMs() * 10) / 10,
      wall: wallMs(),
      kind: String(kind).slice(0, 64),
    };
    if (detail != null) {
      if (typeof detail === "string" || typeof detail === "number" || typeof detail === "boolean") {
        entry.detail = truncateDetail(detail);
      } else if (typeof detail === "object") {
        try {
          entry.detail = truncateDetail(JSON.stringify(detail));
        } catch {
          entry.detail = truncateDetail(String(detail));
        }
      }
    }
    current.events = trimEvents([...current.events, entry]);
    if (opts.asReason !== false) {
      const reasonKinds = new Set([
        "arCleanup",
        "streamStop",
        "screenTransition",
        "componentUnmount",
        "errorBoundary",
        "pagehide",
        "beforeunload",
        "videoError",
        "videoEnded",
        "videoAbort",
        "trackEnded",
        "windowError",
        "unhandledrejection",
        "cameraSessionStart",
        "cameraStreamAcquired",
      ]);
      if (reasonKinds.has(entry.kind) || opts.asReason === true) {
        current.lastReason = entry.detail
          ? `${entry.kind}:${entry.detail}`
          : entry.kind;
      }
    }
    persist();
    try {
      console.info("[ar-exit-trace]", entry.kind, entry.detail ?? "");
    } catch {
      // ignore
    }
  }

  function bindGlobals() {
    const onVisibility = () => {
      record("visibilitychange", document.hidden ? "hidden" : "visible", {
        asReason: false,
      });
    };
    const onPageHide = (ev) => {
      record("pagehide", `persisted=${Boolean(ev?.persisted)}`, { asReason: true });
    };
    const onPageShow = (ev) => {
      record("pageshow", `persisted=${Boolean(ev?.persisted)}`, { asReason: false });
    };
    const onBeforeUnload = () => {
      record("beforeunload", null, { asReason: true });
    };
    const onError = (ev) => {
      record("windowError", ev?.message || String(ev?.error || "error"), {
        asReason: true,
      });
    };
    const onRejection = (ev) => {
      const reason = ev?.reason;
      record(
        "unhandledrejection",
        reason instanceof Error ? reason.message : String(reason ?? "reject"),
        { asReason: true },
      );
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    unsubscribers.push(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    });
  }

  /**
   * Attach video + MediaStreamTrack listeners. Returns disposer.
   * @param {HTMLVideoElement} video
   * @param {MediaStream | null | undefined} stream
   */
  function bindMedia(video, stream) {
    if (!video) return () => {};
    const videoEvents = [
      "loadedmetadata",
      "playing",
      "pause",
      "stalled",
      "waiting",
      "suspend",
      "emptied",
      "ended",
      "abort",
      "error",
    ];
    /** @type {Array<() => void>} */
    const local = [];

    for (const name of videoEvents) {
      const handler = () => {
        if (name === "error") {
          const err = video.error;
          record(
            "videoError",
            err ? `code=${err.code} message=${err.message || ""}` : "error",
            { asReason: true },
          );
          return;
        }
        const kindMap = {
          ended: "videoEnded",
          abort: "videoAbort",
        };
        record(kindMap[name] || `video_${name}`, null, {
          asReason: name === "ended" || name === "abort",
        });
      };
      video.addEventListener(name, handler);
      local.push(() => video.removeEventListener(name, handler));
    }

    const tracks = stream?.getTracks?.() || [];
    for (const track of tracks) {
      const onMute = () => record("trackMute", track.kind, { asReason: true });
      const onUnmute = () => record("trackUnmute", track.kind, { asReason: false });
      const onEnded = () =>
        record("trackEnded", `${track.kind}:${track.readyState}`, { asReason: true });
      track.addEventListener("mute", onMute);
      track.addEventListener("unmute", onUnmute);
      track.addEventListener("ended", onEnded);
      local.push(() => {
        track.removeEventListener("mute", onMute);
        track.removeEventListener("unmute", onUnmute);
        track.removeEventListener("ended", onEnded);
      });

      // Wrap stop() once per track to capture app-driven stops.
      if (typeof track.stop === "function" && !track.__arExitTraceStopWrapped) {
        const origStop = track.stop.bind(track);
        track.__arExitTraceStopWrapped = true;
        track.stop = () => {
          record("streamStop", {
            kind: track.kind,
            caller: "MediaStreamTrack.stop",
            readyState: track.readyState,
          }, { asReason: true });
          return origStop();
        };
      }
    }

    return () => {
      local.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    };
  }

  function getSnapshot() {
    return {
      enabled: true,
      bootId,
      bootAt,
      bootPerf,
      navigationType,
      bootIdChanged,
      previousBootId: previousSession?.bootId ?? null,
      previousLastReason: previousSession?.lastReason ?? null,
      hypothesis: classifyExitHypothesis(previousSession, {
        bootIdChanged,
        navigationType,
      }),
      previous: previousSession,
      current,
    };
  }

  async function copy() {
    const text = JSON.stringify(getSnapshot(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      record("copied", null, { asReason: false });
      return text;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        record("copied", null, { asReason: false });
      } catch {
        console.info("[ar-exit-trace]", text);
      }
      return text;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  }

  bindGlobals();
  record("boot", {
    bootId,
    navigationType,
    bootIdChanged,
    previousBootId: previousSession?.bootId ?? null,
    previousLastReason: previousSession?.lastReason ?? null,
  }, { asReason: false });
  persist();

  const api = {
    enabled: true,
    bootId,
    record,
    bindMedia,
    persist,
    getSnapshot,
    copy,
    dispose,
    getPreviousLastReason() {
      return previousSession?.lastReason ?? null;
    },
    getHypothesis() {
      return classifyExitHypothesis(previousSession, {
        bootIdChanged,
        navigationType,
      });
    },
  };

  window.__arExitTrace = api;
  return api;
}

/**
 * Safe recorder used by app code — no-ops when trace is not installed.
 * @param {string} kind
 * @param {unknown} [detail]
 * @param {{ asReason?: boolean }} [opts]
 */
export function recordArExitTrace(kind, detail, opts) {
  try {
    if (typeof window !== "undefined" && window.__arExitTrace?.record) {
      window.__arExitTrace.record(kind, detail, opts);
    }
  } catch {
    // never throw into AR path
  }
}

/**
 * @returns {string | null}
 */
export function getPreviousArExitReason() {
  try {
    if (typeof window !== "undefined" && window.__arExitTrace?.getPreviousLastReason) {
      return window.__arExitTrace.getPreviousLastReason();
    }
    const storage = safeStorage();
    const stored = parseStored(storage?.getItem(AR_EXIT_TRACE_STORAGE_KEY));
    return stored?.previous?.lastReason ?? stored?.bootMeta?.previousLastReason ?? null;
  } catch {
    return null;
  }
}

/**
 * Prefer the latest reason from the current boot (same-page return to intro),
 * otherwise the preceding boot's lastReason (WebKit reconstruction).
 * @returns {string | null}
 */
export function getDisplayedArExitReason() {
  try {
    if (typeof window !== "undefined" && window.__arExitTrace?.getSnapshot) {
      const snap = window.__arExitTrace.getSnapshot();
      if (snap?.current?.lastReason) return snap.current.lastReason;
      if (snap?.previousLastReason) return snap.previousLastReason;
    }
    return getPreviousArExitReason();
  } catch {
    return null;
  }
}
