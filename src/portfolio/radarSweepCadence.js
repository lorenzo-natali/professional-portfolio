/**
 * Step 4 — Mobile/iOS Risk Radar sweep cadence cap (~30 FPS).
 *
 * Desktop keeps the original CSS @keyframes radar-sweep animation.
 * On mobile radar viewports / iPhone|iPod, CSS animation is disabled and a
 * single rAF loop advances rotate() only after the frame interval elapses,
 * using elapsed time so apparent angular speed matches the CSS period.
 */

export const RADAR_SWEEP_MOBILE_FRAME_MS = 1000 / 30;
export const RADAR_SWEEP_CADENCE_CLASS = "radar-sweep--cadence-capped";

/** Activation: existing mobile radar breakpoint OR iPhone/iPod (incl. landscape). */
export function shouldReduceRadarSweepCadence(
  win = typeof window !== "undefined" ? window : undefined,
) {
  if (!win) return false;
  const mobileRadarViewport = Boolean(
    win.matchMedia?.("(max-width: 639px)")?.matches,
  );
  const ua = win.navigator?.userAgent || "";
  const iosPhone = /iPhone|iPod/i.test(ua);
  return mobileRadarViewport || iosPhone;
}

/** Match CSS periods: ≤639px → 12s; otherwise (e.g. iPhone landscape) → 18s. */
export function getRadarSweepPeriodMs(
  win = typeof window !== "undefined" ? window : undefined,
) {
  if (win?.matchMedia?.("(max-width: 639px)")?.matches) return 12_000;
  return 18_000;
}

/**
 * @param {HTMLElement} element
 * @param {{ periodMs?: number, frameIntervalMs?: number, now?: () => number }} [options]
 * @returns {() => void} stop
 */
export function startCappedRadarSweep(element, options = {}) {
  const periodMs = options.periodMs ?? getRadarSweepPeriodMs();
  const frameIntervalMs = options.frameIntervalMs ?? RADAR_SWEEP_MOBILE_FRAME_MS;

  let rafId = 0;
  let lastPaint = Number.NEGATIVE_INFINITY;
  let start = 0;
  let hasStart = false;

  element.classList.add(RADAR_SWEEP_CADENCE_CLASS);

  const tick = (frameTime) => {
    rafId = requestAnimationFrame(tick);
    if (!hasStart) {
      start = frameTime;
      hasStart = true;
    }
    if (frameTime - lastPaint < frameIntervalMs) return;
    lastPaint = frameTime;
    const elapsed = frameTime - start;
    const deg = ((elapsed % periodMs) / periodMs) * 360;
    element.style.transform = `rotate(${deg}deg)`;
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    element.classList.remove(RADAR_SWEEP_CADENCE_CLASS);
    element.style.transform = "";
  };
}
