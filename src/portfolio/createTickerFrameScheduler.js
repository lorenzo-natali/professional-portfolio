/**
 * Step 1 — Single shared requestAnimationFrame owner for all ticker streams.
 * Subscribers receive the raw frame timestamp; timing/delta stay per ticker.
 * No ResizeObserver, IntersectionObserver, cadence, or speed changes.
 */

let nextId = 1;
/** @type {Map<number, (time: number) => void>} */
const subscribers = new Map();
let rafId = 0;

function tick(time) {
  rafId = 0;
  subscribers.forEach((callback) => {
    try {
      callback(time);
    } catch {
      // ignore subscriber errors so one ticker cannot stop the shared loop
    }
  });
  if (subscribers.size > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

/**
 * @param {(time: number) => void} onFrame
 * @returns {() => void} unsubscribe
 */
export function subscribeTickerFrame(onFrame) {
  const id = nextId++;
  subscribers.set(id, onFrame);
  if (!rafId) {
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0 && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

/** Test / diagnostics helper. */
export function getTickerFrameSchedulerDiagnostics() {
  return {
    subscriberCount: subscribers.size,
    activeSchedulerCount: rafId ? 1 : 0,
  };
}
