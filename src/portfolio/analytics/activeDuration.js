/**
 * Active-duration accumulator — no heartbeats.
 * Counts only time while document is visible.
 */

export function createActiveDurationTracker({
  now = () => performance.now(),
  isHidden = () =>
    typeof document !== "undefined" ? Boolean(document.hidden) : false,
} = {}) {
  let activeMs = 0;
  let segmentStart = null;
  let finalized = false;

  const startSegment = () => {
    if (finalized || segmentStart != null) return;
    if (isHidden()) return;
    segmentStart = now();
  };

  const closeSegment = () => {
    if (segmentStart == null) return;
    const elapsed = Math.max(0, Math.round(now() - segmentStart));
    activeMs += elapsed;
    segmentStart = null;
  };

  return {
    /** Begin (or resume) counting if currently visible. */
    resume() {
      if (finalized) return;
      startSegment();
    },
    /** Pause counting (tab hidden). */
    pause() {
      if (finalized) return;
      closeSegment();
    },
    /**
     * Close any open segment and freeze. Idempotent — safe when both
     * visibilitychange(hidden) and pagehide fire.
     * @returns {number} total active_ms
     */
    finalize() {
      if (finalized) return activeMs;
      closeSegment();
      finalized = true;
      return activeMs;
    },
    getActiveMs() {
      if (segmentStart == null) return activeMs;
      return activeMs + Math.max(0, Math.round(now() - segmentStart));
    },
    isFinalized() {
      return finalized;
    },
  };
}
