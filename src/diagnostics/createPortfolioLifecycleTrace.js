/**
 * Persistent global portfolio lifecycle trace (sessionStorage).
 * Opt-in when ?siteDiag= is present — production path unchanged without the flag.
 *
 * Exposes:
 *   window.__portfolioLifecycleTrace
 *   window.__portfolioLifecycleTrace.buildSummary()
 *   window.__portfolioLifecycleTrace.copy()
 */

export const PORTFOLIO_LIFECYCLE_TRACE_STORAGE_KEY = "portfolioLifecycleTrace.v1";
export const PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS = 96;
export const PORTFOLIO_LIFECYCLE_TRACE_MAX_CHARS = 14_000;

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
  return `doc-${wallMs().toString(36)}-${rand}`;
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
  if (events.length <= PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS) return events;
  return events.slice(events.length - PORTFOLIO_LIFECYCLE_TRACE_MAX_EVENTS);
}

function truncateDetail(detail) {
  if (detail == null) return undefined;
  const text = String(detail);
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

/**
 * How the previous document session appears to have ended.
 * @param {object | null | undefined} previous
 * @returns {"none"|"cleanup"|"pagehide"|"error"|"abrupt"}
 */
export function classifyPreviousSessionEnd(previous) {
  if (!previous) return "none";
  const last = String(previous.lastReason || "");
  const kinds = Array.isArray(previous.events)
    ? previous.events.map((e) => e.kind)
    : [];

  if (
    /errorBoundary|windowError|unhandledrejection/i.test(last) ||
    kinds.some((k) =>
      ["errorBoundary", "windowError", "unhandledrejection"].includes(k),
    )
  ) {
    return "error";
  }
  if (
    /pagehide|beforeunload/i.test(last) ||
    kinds.includes("pagehide") ||
    kinds.includes("beforeunload")
  ) {
    return "pagehide";
  }
  if (
    /cleanup|appUnmount|reactUnmount/i.test(last) ||
    kinds.some((k) =>
      ["appUnmount", "reactUnmount", "cleanup", "diagCleanup"].includes(k),
    )
  ) {
    return "cleanup";
  }
  // New boot without a terminal lifecycle marker → abrupt (Safari kill / crash).
  return "abrupt";
}

/**
 * @param {{ force?: boolean, enabled?: boolean }} [options]
 */
export function installPortfolioLifecycleTrace(options = {}) {
  if (typeof window === "undefined") {
    return createDisabledApi();
  }

  if (window.__portfolioLifecycleTrace && !options.force) {
    return window.__portfolioLifecycleTrace;
  }

  if (options.enabled === false) {
    return createDisabledApi();
  }

  const storage = safeStorage();
  const documentBootId = makeBootId();
  const bootAt = wallMs();
  const bootPerf = nowMs();
  const navigationType = readNavigationType();

  const stored = parseStored(storage?.getItem(PORTFOLIO_LIFECYCLE_TRACE_STORAGE_KEY));
  const previousSession =
    stored?.current &&
    stored.current.documentBootId &&
    stored.current.documentBootId !== documentBootId
      ? stored.current
      : stored?.previous || null;

  const previousDocumentBootId = previousSession?.documentBootId ?? null;
  const previousSessionEnd = classifyPreviousSessionEnd(previousSession);

  /** @type {{
   *   documentBootId: string,
   *   bootAt: number,
   *   bootPerf: number,
   *   navigationType: string,
   *   reactRootMountCount: number,
   *   appMountCount: number,
   *   appUnmountCount: number,
   *   events: Array<Record<string, unknown>>,
   *   lastReason: string | null,
   * }} */
  const current = {
    documentBootId,
    bootAt,
    bootPerf,
    navigationType,
    reactRootMountCount: 0,
    appMountCount: 0,
    appUnmountCount: 0,
    events: [],
    lastReason: null,
  };

  let disposed = false;
  /** @type {Array<() => void>} */
  const unsubscribers = [];
  /** @type {Map<string, Function>} */
  const originalFns = new Map();

  function persist() {
    if (!storage || disposed) return;
    const payload = {
      version: 1,
      previous: previousSession,
      current,
      bootMeta: {
        documentBootId,
        previousDocumentBootId,
        previousSessionEnd,
        navigationType,
        elapsedMs: Math.round(nowMs() - bootPerf),
      },
    };
    let text = JSON.stringify(payload);
    while (
      text.length > PORTFOLIO_LIFECYCLE_TRACE_MAX_CHARS &&
      current.events.length > 12
    ) {
      current.events.splice(0, Math.max(1, Math.floor(current.events.length / 4)));
      payload.current = current;
      text = JSON.stringify(payload);
    }
    try {
      storage.setItem(PORTFOLIO_LIFECYCLE_TRACE_STORAGE_KEY, text);
    } catch {
      // quota / private mode
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
      elapsedMs: Math.round(nowMs() - bootPerf),
      wall: wallMs(),
      kind: String(kind).slice(0, 72),
    };
    if (detail != null) {
      if (
        typeof detail === "string" ||
        typeof detail === "number" ||
        typeof detail === "boolean"
      ) {
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

    const reasonKinds = new Set([
      "pagehide",
      "beforeunload",
      "windowError",
      "unhandledrejection",
      "errorBoundary",
      "appUnmount",
      "cleanup",
      "diagCleanup",
      "locationReload",
      "locationAssign",
      "locationReplace",
      "historyGo",
      "historyBack",
      "historyForward",
      "swControllerChange",
    ]);
    if (opts.asReason === true || reasonKinds.has(entry.kind)) {
      current.lastReason = entry.detail
        ? `${entry.kind}:${entry.detail}`
        : entry.kind;
    }
    persist();
    try {
      console.info("[portfolio-lifecycle]", entry.kind, entry.detail ?? "");
    } catch {
      // ignore
    }
  }

  function wrapCallable(target, key, eventKind, detailFn) {
    if (!target || typeof target[key] !== "function") return;
    const wrapKey = `${Object.prototype.toString.call(target)}:${key}`;
    if (originalFns.has(wrapKey)) return;
    let original;
    try {
      original = target[key].bind(target);
    } catch {
      return;
    }
    originalFns.set(wrapKey, original);
    const wrapped = function wrappedNavigation(...args) {
      try {
        record(eventKind, detailFn ? detailFn(args) : String(args[0] ?? ""), {
          asReason: true,
        });
      } catch {
        // ignore
      }
      return original(...args);
    };
    try {
      target[key] = wrapped;
    } catch {
      try {
        Object.defineProperty(target, key, {
          configurable: true,
          writable: true,
          value: wrapped,
        });
      } catch {
        // jsdom / Safari may freeze Location methods — skip wrap, keep listening.
        originalFns.delete(wrapKey);
        record("navWrapSkipped", key, { asReason: false });
        return;
      }
    }
    unsubscribers.push(() => {
      try {
        target[key] = original;
      } catch {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            writable: true,
            value: original,
          });
        } catch {
          // ignore
        }
      }
      originalFns.delete(wrapKey);
    });
  }

  function bindGlobals() {
    const onVisibility = () => {
      record("visibilitychange", document.hidden ? "hidden" : "visible", {
        asReason: false,
      });
    };
    const onPageHide = (ev) => {
      record("pagehide", `persisted=${Boolean(ev?.persisted)}`, {
        asReason: true,
      });
    };
    const onPageShow = (ev) => {
      record("pageshow", `persisted=${Boolean(ev?.persisted)}`, {
        asReason: false,
      });
    };
    const onBeforeUnload = () => {
      record("beforeunload", null, { asReason: true });
    };
    const onError = (ev) => {
      const msg = ev?.message || String(ev?.error || "error");
      const stack =
        ev?.error && typeof ev.error.stack === "string"
          ? ev.error.stack.slice(0, 240)
          : undefined;
      record("windowError", stack ? { message: msg, stack } : msg, {
        asReason: true,
      });
    };
    const onRejection = (ev) => {
      const reason = ev?.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : String(reason ?? "reject");
      const stack =
        reason instanceof Error && reason.stack
          ? reason.stack.slice(0, 240)
          : undefined;
      record(
        "unhandledrejection",
        stack ? { message, stack } : message,
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

    // Navigation / reload traps (record only — never auto-reload).
    wrapCallable(window.location, "reload", "locationReload", () => "location.reload");
    wrapCallable(window.location, "assign", "locationAssign", (args) =>
      String(args[0] ?? ""),
    );
    wrapCallable(window.location, "replace", "locationReplace", (args) =>
      String(args[0] ?? ""),
    );
    wrapCallable(window.history, "go", "historyGo", (args) => String(args[0] ?? ""));
    wrapCallable(window.history, "back", "historyBack", () => "history.back");
    wrapCallable(window.history, "forward", "historyForward", () => "history.forward");

    // Service worker (if any controller exists — none in this repo today).
    if ("serviceWorker" in navigator) {
      const onControllerChange = () => {
        record(
          "swControllerChange",
          navigator.serviceWorker.controller?.scriptURL || "no-controller",
          { asReason: true },
        );
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
      unsubscribers.push(() => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange,
        );
      });

      void navigator.serviceWorker.getRegistrations?.().then((regs) => {
        record(
          "swRegistrations",
          { count: regs?.length ?? 0 },
          { asReason: false },
        );
        for (const reg of regs || []) {
          const onUpdateFound = () => {
            record("swUpdateFound", reg.scope || "scope", { asReason: false });
          };
          try {
            reg.addEventListener("updatefound", onUpdateFound);
            unsubscribers.push(() => {
              try {
                reg.removeEventListener("updatefound", onUpdateFound);
              } catch {
                // ignore
              }
            });
          } catch {
            // ignore
          }
        }
      });
    } else {
      record("swUnavailable", null, { asReason: false });
    }
  }

  function recordReactRootMount() {
    current.reactRootMountCount += 1;
    record(
      "reactRootMount",
      { count: current.reactRootMountCount },
      { asReason: false },
    );
    persist();
  }

  function recordAppMount() {
    current.appMountCount += 1;
    record("appMount", { count: current.appMountCount }, { asReason: false });
    persist();
  }

  function recordAppUnmount() {
    current.appUnmountCount += 1;
    record("appUnmount", { count: current.appUnmountCount }, { asReason: true });
    persist();
  }

  /**
   * @param {unknown} error
   * @param {{ componentStack?: string } | null | undefined} [info]
   */
  function recordErrorBoundary(error, info) {
    const message =
      error instanceof Error ? error.message : String(error ?? "boundary");
    const stack =
      error instanceof Error && error.stack
        ? error.stack.slice(0, 320)
        : undefined;
    record(
      "errorBoundary",
      {
        message,
        stack,
        componentStack: info?.componentStack
          ? String(info.componentStack).slice(0, 240)
          : undefined,
      },
      { asReason: true },
    );
  }

  function getSnapshot() {
    return {
      enabled: true,
      documentBootId,
      previousDocumentBootId,
      previousSessionEnd,
      bootAt,
      bootPerf,
      navigationType,
      elapsedMs: Math.round(nowMs() - bootPerf),
      reactRootMountCount: current.reactRootMountCount,
      appMountCount: current.appMountCount,
      appUnmountCount: current.appUnmountCount,
      previous: previousSession,
      current,
    };
  }

  function buildSummary() {
    const snap = getSnapshot();
    const lastEvents = (snap.current.events || []).slice(-12).map((e) => ({
      kind: e.kind,
      elapsedMs: e.elapsedMs,
      detail: e.detail,
    }));
    return {
      documentBootId: snap.documentBootId,
      previousDocumentBootId: snap.previousDocumentBootId,
      previousSessionEnd: snap.previousSessionEnd,
      navigationType: snap.navigationType,
      elapsedMs: snap.elapsedMs,
      reactRootMountCount: snap.reactRootMountCount,
      appMountCount: snap.appMountCount,
      appUnmountCount: snap.appUnmountCount,
      lastReason: snap.current.lastReason,
      lastEvents,
      eventCount: snap.current.events.length,
    };
  }

  async function copy() {
    const text = JSON.stringify(
      { summary: buildSummary(), snapshot: getSnapshot() },
      null,
      2,
    );
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
        console.info("[portfolio-lifecycle]", text);
      }
      return text;
    }
  }

  function dispose() {
    if (disposed) return;
    record("diagCleanup", "dispose", { asReason: true });
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
  record(
    "documentBoot",
    {
      documentBootId,
      previousDocumentBootId,
      previousSessionEnd,
      navigationType,
    },
    { asReason: false },
  );
  persist();

  try {
    console.info(
      "[portfolio-lifecycle] boot",
      documentBootId,
      "prev=",
      previousDocumentBootId,
      "prevEnd=",
      previousSessionEnd,
      "nav=",
      navigationType,
    );
  } catch {
    // ignore
  }

  const api = {
    enabled: true,
    documentBootId,
    previousDocumentBootId,
    previousSessionEnd,
    navigationType,
    record,
    recordReactRootMount,
    recordAppMount,
    recordAppUnmount,
    recordErrorBoundary,
    getSnapshot,
    buildSummary,
    copy,
    dispose,
  };

  window.__portfolioLifecycleTrace = api;
  return api;
}

function createDisabledApi() {
  return {
    enabled: false,
    documentBootId: null,
    previousDocumentBootId: null,
    previousSessionEnd: "none",
    navigationType: "unknown",
    record() {},
    recordReactRootMount() {},
    recordAppMount() {},
    recordAppUnmount() {},
    recordErrorBoundary() {},
    getSnapshot() {
      return null;
    },
    buildSummary() {
      return { enabled: false };
    },
    copy: async () => "",
    dispose() {},
  };
}

/** @returns {ReturnType<typeof installPortfolioLifecycleTrace> | null} */
export function getPortfolioLifecycleTrace() {
  if (typeof window === "undefined") return null;
  return window.__portfolioLifecycleTrace || null;
}
