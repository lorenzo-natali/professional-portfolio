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
 * Install Phase B portfolio analytics (visit + active duration + session_end).
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

  return {
    active: true,
    visitorId,
    sessionId,
    /** @internal test helper */
    _duration: duration,
    stop() {
      if (stopped) return;
      stopped = true;
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
