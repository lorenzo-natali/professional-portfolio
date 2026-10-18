import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RESET_DELAY_MS = 48 * 60 * 60 * 1000;

const STATUS_BY_STATE = {
  available: "available",
  visitor_limit_reached: "visitor_limit",
  global_limit_reached: "global_limit",
};

/**
 * Worker base URL from Vite. Empty means the indicator stays unknown and no request is made.
 * @param {{ endpoint?: string | null }} [overrides]
 */
export function resolveAssistantEndpoint(overrides = {}) {
  const raw =
    overrides.endpoint !== undefined
      ? overrides.endpoint
      : import.meta.env.VITE_PORTFOLIO_ASSISTANT_ENDPOINT;
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

/**
 * @param {unknown} body
 * @returns {{ status: "available" | "visitor_limit" | "global_limit", resetsAt: string } | null}
 */
export function interpretAvailability(body) {
  if (!body || typeof body !== "object") return null;
  if (/** @type {{ ok?: unknown }} */ (body).ok !== true) return null;
  const state = /** @type {{ state?: unknown }} */ (body).state;
  const status = typeof state === "string" ? STATUS_BY_STATE[state] : undefined;
  if (!status) return null;
  const resetsAt = /** @type {{ resets_at?: unknown }} */ (body).resets_at;
  if (typeof resetsAt !== "string" || !Number.isFinite(Date.parse(resetsAt))) return null;
  return { status, resetsAt };
}

/**
 * Read-only availability for the preview dot.
 * Refreshes on mount, when the chat opens, when the tab becomes visible, and at resets_at.
 * @param {boolean} chatOpen
 * @returns {{
 *   status: "available" | "visitor_limit" | "global_limit" | "unknown",
 *   refresh: () => Promise<"available" | "visitor_limit" | "global_limit" | "unknown" | null>,
 * }}
 */
export function useAssistantAvailability(chatOpen) {
  const [status, setStatus] = useState(
    /** @type {"available" | "visitor_limit" | "global_limit" | "unknown"} */ ("unknown"),
  );
  const abortRef = useRef(/** @type {AbortController | null} */ (null));
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const seqRef = useRef(0);
  const resetGuardRef = useRef("");
  const refreshRef = useRef(/** @type {() => void} */ (() => {}));

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    const endpoint = resolveAssistantEndpoint();
    abortRef.current?.abort();
    clearTimer();
    if (!endpoint) return Promise.resolve(/** @type {"unknown"} */ ("unknown"));

    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    return fetch(`${endpoint}/availability`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (seq !== seqRef.current || !response.ok) return null;
        try {
          return interpretAvailability(await response.json());
        } catch {
          return null;
        }
      })
      .then((parsed) => {
        if (seq !== seqRef.current) return null;
        if (!parsed) {
          setStatus("unknown");
          return /** @type {"unknown"} */ ("unknown");
        }
        const delay = Date.parse(parsed.resetsAt) - Date.now();
        if (delay > MAX_RESET_DELAY_MS) {
          setStatus("unknown");
          return /** @type {"unknown"} */ ("unknown");
        }
        setStatus(parsed.status);
        if (delay <= 0) {
          if (resetGuardRef.current === parsed.resetsAt) return parsed.status;
          resetGuardRef.current = parsed.resetsAt;
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            refreshRef.current();
          }, 0);
          return parsed.status;
        }
        resetGuardRef.current = "";
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          refreshRef.current();
        }, delay);
        return parsed.status;
      })
      .catch((error) => {
        if (error?.name === "AbortError" || seq !== seqRef.current) return null;
        setStatus("unknown");
        return /** @type {"unknown"} */ ("unknown");
      });
  }, [clearTimer]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      seqRef.current += 1;
      abortRef.current?.abort();
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearTimer, refresh]);

  useEffect(() => {
    if (chatOpen) refresh();
  }, [chatOpen, refresh]);

  return { status, refresh };
}
