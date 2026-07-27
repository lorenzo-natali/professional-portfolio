/**
 * Deep-link launch for Beyond the CV (QR on printed CV, shared URLs).
 *
 * Supported forms (truthy):
 *   ?beyond=1 | ?beyond=true | ?beyond=yes | ?beyond
 *   #beyond=1 (or hash query ?beyond=1)
 */

export const BEYOND_CV_QUERY_PARAM = "beyond";

function truthyBeyondValue(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  // Bare `?beyond` yields "" from URLSearchParams.
  if (normalized === "") return true;
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readParam(params, key) {
  try {
    return params.get(key);
  } catch {
    return null;
  }
}

/**
 * @param {Location | { href?: string, search?: string, hash?: string } | null | undefined} [loc]
 * @returns {boolean}
 */
export function shouldLaunchBeyondCvFromLocation(loc) {
  const locationRef =
    loc ||
    (typeof window !== "undefined"
      ? window.location
      : { href: "", search: "", hash: "" });

  const search = String(locationRef.search || "");
  const hash = String(locationRef.hash || "");
  const href = String(locationRef.href || "");

  try {
    if (search) {
      const fromSearch = readParam(new URLSearchParams(search), BEYOND_CV_QUERY_PARAM);
      if (fromSearch != null) return truthyBeyondValue(fromSearch);
    }
  } catch {
    // ignore
  }

  if (hash && hash.includes(BEYOND_CV_QUERY_PARAM)) {
    try {
      const qIndex = hash.indexOf("?");
      const hashQuery =
        qIndex >= 0 ? hash.slice(qIndex + 1) : hash.replace(/^#/, "");
      const fromHash = readParam(new URLSearchParams(hashQuery), BEYOND_CV_QUERY_PARAM);
      if (fromHash != null) return truthyBeyondValue(fromHash);
    } catch {
      // ignore
    }
  }

  if (href && new RegExp(`[?&#]${BEYOND_CV_QUERY_PARAM}(=|&|#|$)`, "i").test(href)) {
    try {
      const match = href.match(
        new RegExp(`[?&#]${BEYOND_CV_QUERY_PARAM}(?:=([^&#]*))?(?:[&#]|$)`, "i"),
      );
      if (match) return truthyBeyondValue(match[1] ?? "");
    } catch {
      // ignore
    }
  }

  return false;
}
