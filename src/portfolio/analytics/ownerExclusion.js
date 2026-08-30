import { STORAGE_EXCLUDE } from "./analyticsConfig.js";

/**
 * @param {string} [hostname]
 */
export function isLocalAnalyticsHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

/**
 * @param {Storage | null | undefined} store
 */
export function isOwnerExcluded(store) {
  try {
    return store?.getItem(STORAGE_EXCLUDE) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Storage | null | undefined} store
 */
export function setOwnerExcluded(store, excluded) {
  try {
    if (!store) return false;
    if (excluded) store.setItem(STORAGE_EXCLUDE, "1");
    else store.removeItem(STORAGE_EXCLUDE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Consume ?analytics=off|on from the URL.
 * - off → persist exclusion, strip param
 * - on → clear exclusion (intentional test/debug), strip param
 * Safe no-op when history/URL unavailable.
 *
 * @param {{
 *   search?: string,
 *   pathname?: string,
 *   hash?: string,
 *   localStorage?: Storage | null,
 *   replaceState?: (data: unknown, unused: string, url: string) => void,
 * }} [ctx]
 * @returns {"excluded"|"included"|"none"}
 */
export function consumeAnalyticsQueryFlag(ctx = {}) {
  const search =
    ctx.search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const flag = params.get("analytics");
  if (flag !== "off" && flag !== "on") return "none";

  const store =
    ctx.localStorage !== undefined
      ? ctx.localStorage
      : typeof localStorage !== "undefined"
        ? localStorage
        : null;

  if (flag === "off") setOwnerExcluded(store, true);
  else setOwnerExcluded(store, false);

  params.delete("analytics");
  const nextQuery = params.toString();
  const pathname =
    ctx.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const hash =
    ctx.hash ?? (typeof window !== "undefined" ? window.location.hash : "");
  const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ""}${hash}`;

  try {
    const replace =
      ctx.replaceState ??
      (typeof history !== "undefined" ? history.replaceState.bind(history) : null);
    replace?.(null, "", nextUrl);
  } catch {
    // Ignore history failures.
  }

  return flag === "off" ? "excluded" : "included";
}
