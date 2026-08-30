/**
 * Coarse server-derived metadata. Never persist raw IP or full UA.
 */

/**
 * @param {string | null | undefined} countryHeader CF-IPCountry or equivalent
 * @returns {string | null} ISO-ish country code or null
 */
export function normalizeCountry(countryHeader) {
  if (typeof countryHeader !== "string") return null;
  const code = countryHeader.trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

/**
 * @param {string | null | undefined} ua
 * @returns {"safari"|"chrome"|"firefox"|"edge"|"other"|"unknown"}
 */
export function normalizeBrowserFamily(ua) {
  if (!ua || typeof ua !== "string") return "unknown";
  const s = ua.toLowerCase();
  // Order matters: Edge/Chrome contain "safari"/"chrome" substrings.
  if (s.includes("edg/") || s.includes("edgios/") || s.includes("edga/")) {
    return "edge";
  }
  if (s.includes("firefox/") || s.includes("fxios/")) return "firefox";
  if (s.includes("chrome/") || s.includes("crios/")) return "chrome";
  if (s.includes("safari/") && !s.includes("chrome/") && !s.includes("crios/")) {
    return "safari";
  }
  return "other";
}

/**
 * @param {string | null | undefined} ua
 * @returns {"mobile"|"tablet"|"desktop"|"unknown"}
 */
export function normalizeDeviceClass(ua) {
  if (!ua || typeof ua !== "string") return "unknown";
  const s = ua.toLowerCase();
  if (s.includes("ipad") || (s.includes("android") && !s.includes("mobile"))) {
    return "tablet";
  }
  if (
    s.includes("mobi") ||
    s.includes("iphone") ||
    s.includes("ipod") ||
    (s.includes("android") && s.includes("mobile"))
  ) {
    return "mobile";
  }
  if (s.includes("windows") || s.includes("macintosh") || s.includes("linux")) {
    return "desktop";
  }
  return "unknown";
}

/**
 * @param {Request} request
 * @returns {{ country: string | null, browser_family: string, device_class: string, received_at: string }}
 */
export function deriveServerMetadata(request) {
  const ua = request.headers.get("user-agent");
  const cf =
    request.cf && typeof request.cf === "object"
      ? /** @type {{ country?: string }} */ (request.cf)
      : null;
  const country =
    normalizeCountry(request.headers.get("cf-ipcountry")) ??
    normalizeCountry(cf?.country);

  return {
    country,
    browser_family: normalizeBrowserFamily(ua),
    device_class: normalizeDeviceClass(ua),
    received_at: new Date().toISOString(),
  };
}
