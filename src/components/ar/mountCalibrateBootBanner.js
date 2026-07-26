import { getArRuntimeFlags } from "./arRuntimeFlags";

/**
 * Compact document-level calibrate chip before Beyond the CV opens.
 * Removed as soon as the AR portal mounts so it does not cover the camera.
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
  el.textContent = "CALIBRATE MODE — tap Beyond the CV";
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:max(0.4rem,env(safe-area-inset-top))",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "pointer-events:none",
    "padding:0.35rem 0.7rem",
    "border-radius:0.35rem",
    "background:rgba(180,83,9,0.94)",
    "color:#fffbeb",
    "font:700 11px/1.3 ui-sans-serif, system-ui, -apple-system, sans-serif",
    "letter-spacing:0.05em",
    "text-align:center",
    "text-transform:uppercase",
    "max-width:min(92vw,20rem)",
  ].join(";");

  console.info("[ar-interests-calibrate] boot banner mounted", {
    source: flags.calibrateSource,
    href: flags.href,
  });

  return () => {
    el?.remove();
  };
}

/** Hide the boot chip once the AR experience owns the screen. */
export function hideCalibrateBootBanner() {
  if (typeof document === "undefined") return;
  document.querySelector("[data-ar-calibrate-boot-banner='true']")?.remove();
}
