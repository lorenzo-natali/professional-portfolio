import { getArRuntimeFlags } from "./arRuntimeFlags";

/**
 * Document-level calibrate signal mounted before React / Beyond the CV.
 * Survives intro/desktop screens so the mode cannot be "invisible".
 *
 * @returns {() => void} dispose
 */
export function mountCalibrateBootBanner() {
  if (typeof document === "undefined") return () => {};
  const flags = getArRuntimeFlags();
  if (!flags.arInterestsCalibrate) return () => {};

  let el = document.querySelector("[data-ar-calibrate-boot-banner='true']");
  if (!el) {
    el = document.createElement("div");
    el.dataset.arCalibrateBootBanner = "true";
    document.documentElement.appendChild(el);
  }

  el.setAttribute("role", "status");
  el.textContent =
    "CALIBRATE MODE ON — open Beyond the CV (camera starts automatically)";
  el.style.cssText = [
    "position:fixed",
    "left:0",
    "right:0",
    "top:0",
    "z-index:2147483647",
    "pointer-events:none",
    "padding:max(0.55rem,env(safe-area-inset-top)) 0.75rem 0.45rem",
    "background:rgba(180,83,9,0.96)",
    "color:#fffbeb",
    "font:700 12px/1.35 ui-sans-serif, system-ui, -apple-system, sans-serif",
    "letter-spacing:0.06em",
    "text-align:center",
    "text-transform:uppercase",
  ].join(";");

  console.info("[ar-interests-calibrate] boot banner mounted", {
    source: flags.calibrateSource,
    href: flags.href,
  });

  return () => {
    el?.remove();
  };
}
