import { INTEREST_ENTRANCE, INTEREST_OBJECTS } from "./interestObjectsConfig";

/**
 * Staggered entrance for interest miniatures (document Z rise).
 * Runs once per acquisition session; brief loss does not replay.
 * Background-loaded models respect the current tracking/session state.
 *
 * @param {ReturnType<import("./createInterestObjectsLayer").createInterestObjectsLayer>} layer
 * @param {{
 *   items?: typeof INTEREST_OBJECTS,
 *   now?: () => number,
 *   showAllImmediately?: boolean,
 * }} [options]
 */
export function createInterestObjectsAnimation(layer, options = {}) {
  const items = options.items ?? INTEREST_OBJECTS;
  const expectedCount = items.length;
  const now = options.now ?? (() => performance.now());
  const showAllImmediately = Boolean(options.showAllImmediately);

  let disposed = false;
  /** @type {"hidden" | "playing" | "idle"} */
  let phase = "hidden";
  let played = false;
  let sessionActive = false;
  /** True only after this animation's own markLoadFinished(). */
  let loadPassDone = false;
  let rafId = 0;
  let startedAt = 0;
  /** @type {Set<string>} */
  const completedIds = new Set();

  function clearRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function countLoaded() {
    let n = 0;
    items.forEach((item) => {
      if (layer.getEntry?.(item.id)?.loaded) n += 1;
    });
    return n;
  }

  function snapItemComplete(id) {
    layer.applyEntranceProgress(id, 1);
    completedIds.add(id);
  }

  /**
   * Every successfully loaded item has finished its entrance.
   * Unloaded items are ignored (failed / still pending).
   */
  function allLoadedItemsComplete() {
    return items.every((item) => {
      const entry = layer.getEntry?.(item.id);
      if (!entry?.loaded) return true;
      return completedIds.has(item.id);
    });
  }

  /**
   * Settle only after the current session's load pass finished.
   * An empty loaded list settles only when loadPassDone (all attempts failed).
   * Never settles while loads are still in flight.
   */
  function settleIfReady() {
    if (disposed || !loadPassDone) return false;
    if (!allLoadedItemsComplete()) return false;

    phase = "idle";
    played = true;
    sessionActive = true;
    layer.setVisible(true);
    clearRaf();
    return true;
  }

  function ensureTicker() {
    if (disposed || rafId || phase !== "playing") return;

    if (showAllImmediately) {
      const poll = () => {
        if (disposed || phase !== "playing") {
          rafId = 0;
          return;
        }
        items.forEach((item) => {
          if (layer.getEntry?.(item.id)?.loaded) snapItemComplete(item.id);
        });
        if (settleIfReady()) return;
        rafId = requestAnimationFrame(poll);
      };
      rafId = requestAnimationFrame(poll);
      return;
    }

    if (!startedAt) startedAt = now();
    const tick = (frameTime) => {
      if (disposed || phase !== "playing") {
        rafId = 0;
        return;
      }
      const tNow = typeof frameTime === "number" ? frameTime : now();
      const elapsed = tNow - startedAt;

      items.forEach((item) => {
        const entry = layer.getEntry?.(item.id);
        if (!entry?.loaded || completedIds.has(item.id)) return;

        const local = elapsed - (item.appearanceDelayMs ?? 0);
        if (local < 0) {
          layer.applyEntranceProgress(item.id, 0);
          return;
        }
        const p = Math.min(1, local / Math.max(1, INTEREST_ENTRANCE.durationMs));
        layer.applyEntranceProgress(item.id, p);
        if (p >= 1) completedIds.add(item.id);
      });

      if (settleIfReady()) return;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (disposed || phase === "playing") return;

    if (played) {
      layer.setVisible(true);
      items.forEach((item) => {
        if (layer.getEntry?.(item.id)?.loaded) snapItemComplete(item.id);
      });
      phase = "idle";
      return;
    }

    phase = "playing";
    sessionActive = true;
    layer.setVisible(true);
    startedAt = now();

    if (showAllImmediately) {
      items.forEach((item) => {
        if (layer.getEntry?.(item.id)?.loaded) snapItemComplete(item.id);
      });
      if (settleIfReady()) return;
    }

    ensureTicker();
  }

  function onAcquisitionReady() {
    if (disposed) return;
    sessionActive = true;
    if (played) {
      layer.setVisible(true);
      items.forEach((item) => {
        if (layer.getEntry?.(item.id)?.loaded) snapItemComplete(item.id);
      });
      phase = "idle";
      return;
    }
    play();
  }

  /**
   * Background GLB finished. Respects current tracking/session state.
   * While playing, late loads join the stagger ticker (no idle snap).
   * @param {string} id
   */
  function onItemLoaded(id) {
    if (disposed) return;
    if (!sessionActive) {
      layer.applyEntranceProgress(id, 0);
      return;
    }
    // Only snap when the entrance sequence already completed for this acquisition.
    if (played && phase === "idle") {
      snapItemComplete(id);
      layer.setVisible(true);
      return;
    }
    if (phase === "hidden") {
      play();
      return;
    }
    if (showAllImmediately && phase === "playing") {
      snapItemComplete(id);
    }
    ensureTicker();
  }

  function markLoadFinished() {
    if (disposed) return;
    loadPassDone = true;
    if (phase === "playing") {
      if (showAllImmediately) {
        items.forEach((item) => {
          if (layer.getEntry?.(item.id)?.loaded) snapItemComplete(item.id);
        });
      }
      settleIfReady();
      ensureTicker();
    } else if (phase === "hidden" && !sessionActive) {
      // Load finished before acquisition — stay hidden; play() will settle later.
    }
  }

  function resetSession() {
    if (disposed) return;
    clearRaf();
    played = false;
    sessionActive = false;
    phase = "hidden";
    startedAt = 0;
    completedIds.clear();
    // loadPassDone stays true — assets remain loaded for this AR session object.
    layer.resetVisualState();
  }

  return {
    onAcquisitionReady,
    onItemLoaded,
    markLoadFinished,
    resetSession,
    play,
    getState: () => ({
      phase,
      played,
      sessionActive,
      disposed,
      loadPassDone,
      loadedCount: countLoaded(),
      expectedCount,
      completedIds: [...completedIds],
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      clearRaf();
      phase = "hidden";
      sessionActive = false;
      played = false;
      loadPassDone = false;
      completedIds.clear();
    },
  };
}
