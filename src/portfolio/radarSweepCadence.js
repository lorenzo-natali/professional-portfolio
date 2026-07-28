/**
 * Step 4–5 — Mobile/iOS Risk Radar sweep: ~30 FPS cadence + lighter/slower profile.
 *
 * Desktop keeps the original CSS @keyframes radar-sweep animation.
 * On mobile radar viewports / iPhone|iPod, CSS animation is disabled and a
 * single rAF loop advances rotate() only after the frame interval elapses,
 * using elapsed time so apparent angular speed matches the mobile period.
 */

export const RADAR_SWEEP_MOBILE_FRAME_MS = 1000 / 30;
export const RADAR_SWEEP_MOBILE_PERIOD_MS = 24_000;
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

/**
 * Step 5: one consistent mobile/iPhone sweep period (~24s), independent of
 * the previous 12s / 18s CSS durations.
 */
export function getRadarSweepPeriodMs(
  _win = typeof window !== "undefined" ? window : undefined,
) {
  return RADAR_SWEEP_MOBILE_PERIOD_MS;
}

/**
 * @param {HTMLElement} element
 * @param {{ periodMs?: number, frameIntervalMs?: number }} [options]
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
