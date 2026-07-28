/**
 * Step 3 — Single shared IntersectionObserver for ticker viewport visibility.
 * Maps observed elements to visibility callbacks; no pause logic beyond notifying.
 */

/** @type {Map<Element, (visible: boolean) => void>} */
const elementCallbacks = new Map();
/** @type {IntersectionObserver | null} */
let sharedObserver = null;

function ensureObserver() {
  if (sharedObserver || typeof IntersectionObserver !== "function") return;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const callback = elementCallbacks.get(entry.target);
        if (!callback) continue;
        const visible = Boolean(entry.isIntersecting && entry.intersectionRatio > 0);
        try {
          callback(visible);
        } catch {
          // ignore subscriber errors so one ticker cannot break the shared observer
        }
      }
    },
    { root: null, rootMargin: "0px", threshold: [0, 0.01] },
  );
}

/**
 * @param {Element} element
 * @param {(visible: boolean) => void} onVisibilityChange
 * @returns {() => void} unsubscribe
 */
export function subscribeTickerVisibility(element, onVisibilityChange) {
  ensureObserver();
  elementCallbacks.set(element, onVisibilityChange);
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
export function getTickerVisibilityObserverDiagnostics() {
  return {
    subscriberCount: elementCallbacks.size,
    activeObserverCount: sharedObserver ? 1 : 0,
  };
}

/** Test helper — tear down singleton between tests. */
export function resetTickerVisibilityObserverForTests() {
  elementCallbacks.clear();
  sharedObserver?.disconnect();
  sharedObserver = null;
}
