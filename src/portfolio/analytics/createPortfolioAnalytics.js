import { resolveAnalyticsEnv } from "./analyticsConfig.js";
import { createActiveDurationTracker } from "./activeDuration.js";
import {
  getOrCreateSessionId,
  getOrCreateVisitorId,
  markVisitSent,
  wasVisitSent,
} from "./identity.js";
import {
  consumeAnalyticsQueryFlag,
  isLocalAnalyticsHost,
  isOwnerExcluded,
} from "./ownerExclusion.js";
import { classifyReferrer, normalizeLandingPath } from "./referrer.js";
import { sendAnalyticsBatch } from "./transport.js";

/**
 * Active install context for Phase C interaction tracking.
 * Null whenever analytics is ineligible or stopped.
 * @type {{
 *   active: true,
 *   postInteraction: (name: string, props?: Record<string, string | number>) => void,
 * } | null}
 */
let activeContext = null;

/**
 * Phase C: fire a meaningful interaction event while the page is alive.
 * No-ops when analytics is inactive/excluded/uninstalled. Never throws.
 *
 * Privacy: callers must pass only allowlisted compact IDs/enums — never
 * prompt text, answers, free-form input, titles, or URLs.
 *
 * @param {string} name
 * @param {Record<string, string | number>} [props]
 */
export function trackPortfolioEvent(name, props) {
  try {
    if (!activeContext?.active) return;
    if (typeof name !== "string" || !name) return;
    activeContext.postInteraction(
      name,
      props && typeof props === "object" && !Array.isArray(props) ? props : {}
    );
  } catch {
    // Analytics must never break portfolio UI.
  }
}

/**
 * Install Phase B portfolio analytics (visit + active duration + session_end)
 * and enable Phase C trackPortfolioEvent while active.
 * Returns a stop() that removes lifecycle listeners. Safe to call when disabled
 * (returns a no-op stop without IDs/listeners/network).
 *
 * @param {{
 *   enabled?: string | boolean | null,
 *   endpoint?: string | null,
 *   dev?: boolean,
 *   hostname?: string,
 *   href?: string,
 *   search?: string,
 *   pathname?: string,
 *   hash?: string,
 *   referrer?: string,
 *   localStorage?: Storage | null,
 *   sessionStorage?: Storage | null,
 *   fetchImpl?: typeof fetch,
 *   sendBeaconImpl?: Navigator["sendBeacon"] | null,
 *   replaceState?: (data: unknown, unused: string, url: string) => void,
 *   addEventListener?: typeof document.addEventListener,
 *   removeEventListener?: typeof document.removeEventListener,
 *   windowAddEventListener?: typeof window.addEventListener,
 *   windowRemoveEventListener?: typeof window.removeEventListener,
 *   now?: () => number,
 *   isHidden?: () => boolean,
 * }} [options]
 */
export function installPortfolioAnalytics(options = {}) {
  // Any re-install clears prior Phase C context first (eligibility wins).
  activeContext = null;

  // Always honour exclusion query flags (even when analytics stays off),
  // so owner exclusion is ready before a future production enable.
  consumeAnalyticsQueryFlag({
    search: options.search,
    pathname: options.pathname,
    hash: options.hash,
    localStorage: options.localStorage,
    replaceState: options.replaceState,
  });

  const env = resolveAnalyticsEnv({
    enabled: options.enabled,
    endpoint: options.endpoint,
    dev: options.dev,
  });

  const hostname =
    options.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");

  const localStore =
    options.localStorage !== undefined
      ? options.localStorage
      : typeof localStorage !== "undefined"
        ? localStorage
        : null;
  const sessionStore =
    options.sessionStorage !== undefined
      ? options.sessionStorage
      : typeof sessionStorage !== "undefined"
        ? sessionStorage
        : null;

  const noop = { stop() {}, active: false };

  if (!env.enabled || !env.endpoint) return noop;
  if (env.dev || isLocalAnalyticsHost(hostname)) return noop;
  if (isOwnerExcluded(localStore)) return noop;

  const { visitorId } = getOrCreateVisitorId(localStore);
  const sessionId = getOrCreateSessionId(sessionStore);

  const duration = createActiveDurationTracker({
    now: options.now,
    isHidden: options.isHidden,
  });

  let stopped = false;
  let sessionEndSent = false;

  const docAdd =
    options.addEventListener ??
    (typeof document !== "undefined"
      ? document.addEventListener.bind(document)
      : null);
  const docRemove =
    options.removeEventListener ??
    (typeof document !== "undefined"
      ? document.removeEventListener.bind(document)
      : null);
  const winAdd =
    options.windowAddEventListener ??
    (typeof window !== "undefined"
      ? window.addEventListener.bind(window)
      : null);
  const winRemove =
    options.windowRemoveEventListener ??
    (typeof window !== "undefined"
      ? window.removeEventListener.bind(window)
      : null);

  const sendBeaconImpl =
    options.sendBeaconImpl !== undefined
      ? options.sendBeaconImpl
      : typeof navigator !== "undefined" && navigator.sendBeacon
        ? navigator.sendBeacon.bind(navigator)
        : null;

  const post = (events, preferBeacon = false) => {
    try {
      sendAnalyticsBatch({
        endpoint: env.endpoint,
        visitorId,
        sessionId,
        events,
        fetchImpl: options.fetchImpl,
        sendBeaconImpl,
        preferBeacon,
      });
    } catch {
      // swallow
    }
  };

  const postInteraction = (name, props) => {
    if (stopped) return;
    post(
      [
        {
          name,
          ts: new Date().toISOString(),
          props,
        },
      ],
      false
    );
  };

  // One portfolio_visit per tab session.
  if (!wasVisitSent(sessionStore, sessionId)) {
    const referrer =
      options.referrer ??
      (typeof document !== "undefined" ? document.referrer : "");
    const pathname =
      options.pathname ??
      (typeof window !== "undefined" ? window.location.pathname : "/");
    post([
      {
        name: "portfolio_visit",
        ts: new Date().toISOString(),
        props: {
          referrer_class: classifyReferrer(referrer),
          landing_path: normalizeLandingPath(pathname),
        },
      },
    ]);
    markVisitSent(sessionStore, sessionId);
  }

  duration.resume();

  const onVisibility = () => {
    if (stopped) return;
    try {
      const hidden =
        options.isHidden?.() ??
        (typeof document !== "undefined" ? document.hidden : false);
      if (hidden) duration.pause();
      else duration.resume();
    } catch {
      // ignore
    }
  };

  const onPageHide = () => {
    if (stopped || sessionEndSent) return;
    sessionEndSent = true;
    try {
      const activeMs = duration.finalize();
      post(
        [
          {
            name: "session_end",
            ts: new Date().toISOString(),
            props: { active_ms: activeMs },
          },
        ],
        true
      );
    } catch {
      // ignore
    }
  };

  try {
    docAdd?.("visibilitychange", onVisibility);
    winAdd?.("pagehide", onPageHide);
  } catch {
    // If listeners cannot be attached, still leave visit as best-effort.
  }

  activeContext = {
    active: true,
    postInteraction,
  };

  return {
    active: true,
    visitorId,
    sessionId,
    /** @internal test helper */
    _duration: duration,
    stop() {
      if (stopped) return;
      stopped = true;
      if (activeContext?.postInteraction === postInteraction) {
        activeContext = null;
      }
      try {
        docRemove?.("visibilitychange", onVisibility);
        winRemove?.("pagehide", onPageHide);
      } catch {
        // ignore
      }
      // Do not force session_end on stop() — reserved for pagehide / real unload.
      // Tests that need end can call pagehide themselves.
      try {
        duration.pause();
      } catch {
        // ignore
      }
    },
  };
}
