/**
 * Step 2 — Single shared ResizeObserver for all ticker stream tracks.
 * Maps observed elements to measure callbacks; no IntersectionObserver or pause.
 */

/** @type {Map<Element, () => void>} */
const elementCallbacks = new Map();
/** @type {ResizeObserver | null} */
let sharedObserver = null;

function ensureObserver() {
  if (sharedObserver || typeof ResizeObserver !== "function") return;
  sharedObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const callback = elementCallbacks.get(entry.target);
      if (!callback) continue;
      try {
        callback();
      } catch {
        // ignore subscriber errors so one ticker cannot break the shared observer
      }
    }
  });
}

/**
 * @param {Element} element
 * @param {() => void} onResize
 * @returns {() => void} unsubscribe
 */
export function subscribeTickerResize(element, onResize) {
  ensureObserver();
  elementCallbacks.set(element, onResize);
  sharedObserver?.observe(element);

  return () => {
    elementCallbacks.delete(element);
    try {
      sharedObserver?.unobserve(element);
    } catch {
      // ignore
    }
    if (elementCallbacks.size === 0 && sharedObserver) {
      sharedObserver.disconnect();
      sharedObserver = null;
    }
  };
}

/** Test / diagnostics helper. */
export function getTickerResizeObserverDiagnostics() {
  return {
    subscriberCount: elementCallbacks.size,
    activeObserverCount: sharedObserver ? 1 : 0,
  };
}
