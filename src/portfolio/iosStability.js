/**
 * Detect iPhone/iPad Safari (and iOS WebKit) for the conservative stability profile.
 * Does not require prefers-reduced-motion.
 */

export function isIosWebKit(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  const ua = String(userAgent || "");
  const iOS = /iP(hone|ad|od)/i.test(ua);
  const iPadOsDesktopUa =
    /Macintosh/i.test(ua) &&
    typeof navigator !== "undefined" &&
    Number(navigator.maxTouchPoints || 0) > 1;
  // All iOS WebKit (Safari and other browsers) share the same compositor limits.
  return Boolean((iOS || iPadOsDesktopUa) && /WebKit/i.test(ua));
}

/**
 * Apply html[data-ios-stability="1"] once. Safe to call multiple times.
 * @returns {boolean} whether the profile is active
 */
export function applyIosStabilityProfile() {
  if (typeof document === "undefined") return false;
  const active = isIosWebKit();
  if (active) {
    document.documentElement.dataset.iosStability = "1";
  } else {
    delete document.documentElement.dataset.iosStability;
  }
  if (typeof window !== "undefined") {
    window.__portfolioIosStability = active;
  }
  return active;
}

export function isIosStabilityActive() {
  if (typeof document !== "undefined" && document.documentElement?.dataset?.iosStability === "1") {
    return true;
  }
  if (typeof window !== "undefined" && typeof window.__portfolioIosStability === "boolean") {
    return window.__portfolioIosStability;
  }
  return isIosWebKit();
}
