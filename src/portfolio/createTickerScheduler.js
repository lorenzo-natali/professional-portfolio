/**
 * Single shared ticker rAF scheduler for all TickerStream instances.
 * - One requestAnimationFrame owner while any subscriber is active + visible
 * - Shared IntersectionObserver pauses offscreen tracks
 * - Shared resize measurement (one ResizeObserver fan-out)
 * - Lower update cadence on iOS stability profile
 */

import { isIosStabilityActive } from "./iosStability.js";

/** @typedef {{
 *   id: number,
 *   el: HTMLElement,
 *   update: (dtSec: number) => void,
 *   measure: () => void,
 *   visible: boolean,
 *   paused: boolean,
 * }} TickerSubscriber */

let singleton = null;
let nextId = 1;

function createTickerScheduler() {
  /** @type {Map<number, TickerSubscriber>} */
  const subscribers = new Map();
  let rafId = 0;
  let lastTime = 0;
  let frameCounter = 0;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;
  /** @type {IntersectionObserver | null} */
  let intersectionObserver = null;

  function ios() {
    return isIosStabilityActive();
  }

  function ensureObservers() {
    if (typeof ResizeObserver === "function" && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        subscribers.forEach((sub) => {
          try {
            sub.measure();
          } catch {
            // ignore
          }
        });
      });
    }
    if (typeof IntersectionObserver === "function" && !intersectionObserver) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            for (const sub of subscribers.values()) {
              if (sub.el === entry.target) {
                sub.visible = entry.isIntersecting && entry.intersectionRatio > 0;
              }
            }
          }
          syncLoop();
        },
        { root: null, rootMargin: "64px 0px", threshold: [0, 0.01] },
      );
    }
  }

  function hasLiveWork() {
    for (const sub of subscribers.values()) {
      if (sub.visible && !sub.paused) return true;
    }
    return false;
  }

  function tick(time) {
    rafId = 0;
    if (!hasLiveWork()) {
      lastTime = 0;
      return;
    }

    // iOS: run every other frame to cut compositor/JS pressure.
    frameCounter += 1;
    const skip = ios() && frameCounter % 2 === 0;
    if (!skip) {
      if (!lastTime) lastTime = time;
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const speedScale = ios() ? 0.65 : 1;
      subscribers.forEach((sub) => {
        if (!sub.visible || sub.paused) return;
        try {
          sub.update(delta * speedScale);
        } catch {
          // ignore
        }
      });
    } else {
      lastTime = time;
    }

    rafId = requestAnimationFrame(tick);
  }

  function syncLoop() {
    if (hasLiveWork()) {
      if (!rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
      }
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      lastTime = 0;
    }
  }

  /**
   * @param {HTMLElement} el
   * @param {{ update: (dtSec: number) => void, measure: () => void }} handlers
   */
  function subscribe(el, handlers) {
    ensureObservers();
    const id = nextId++;
    /** @type {TickerSubscriber} */
    const sub = {
      id,
      el,
      update: handlers.update,
      measure: handlers.measure,
      visible: true,
      paused: false,
    };
    subscribers.set(id, sub);
    try {
      handlers.measure();
    } catch {
      // ignore
    }
    resizeObserver?.observe(el);
    intersectionObserver?.observe(el);
    syncLoop();
    return {
      id,
      setPaused(paused) {
        sub.paused = Boolean(paused);
        if (!paused) lastTime = 0;
        syncLoop();
      },
      rememeasure() {
        try {
          handlers.measure();
        } catch {
          // ignore
        }
      },
      unsubscribe() {
        subscribers.delete(id);
        try {
          resizeObserver?.unobserve(el);
        } catch {
          // ignore
        }
        try {
          intersectionObserver?.unobserve(el);
        } catch {
          // ignore
        }
        syncLoop();
        if (subscribers.size === 0) {
          resizeObserver?.disconnect();
          intersectionObserver?.disconnect();
          resizeObserver = null;
          intersectionObserver = null;
        }
      },
    };
  }

  function getDiagnostics() {
    let visible = 0;
    let paused = 0;
    subscribers.forEach((sub) => {
      if (sub.visible) visible += 1;
      if (sub.paused) paused += 1;
    });
    return {
      subscriberCount: subscribers.size,
      visibleCount: visible,
      pausedCount: paused,
      /** 1 while the shared loop is scheduled, else 0 */
      activeSchedulerCount: rafId ? 1 : 0,
      iosStability: ios(),
    };
  }

  /** Test helper — tear down singleton between tests. */
  function disposeForTests() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    subscribers.clear();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    resizeObserver = null;
    intersectionObserver = null;
    lastTime = 0;
  }

  return { subscribe, getDiagnostics, disposeForTests };
}

export function getTickerScheduler() {
  if (!singleton) {
    singleton = createTickerScheduler();
    if (typeof window !== "undefined") {
      window.__portfolioTickerScheduler = {
        getDiagnostics: () => singleton.getDiagnostics(),
      };
    }
  }
  return singleton;
}

/** @returns {ReturnType<typeof createTickerScheduler>["getDiagnostics"] extends Function ? ReturnType<ReturnType<typeof createTickerScheduler>["getDiagnostics"]> : never} */
export function getTickerSchedulerDiagnostics() {
  return getTickerScheduler().getDiagnostics();
}

export function resetTickerSchedulerForTests() {
  if (singleton) {
    singleton.disposeForTests();
  }
  singleton = null;
  if (typeof window !== "undefined") {
    delete window.__portfolioTickerScheduler;
  }
}
