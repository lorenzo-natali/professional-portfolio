import {
  PROFESSIONAL_EVOLUTION_REDUCED_MOTION_TIMING,
  PROFESSIONAL_EVOLUTION_TIMING,
} from "./professionalEvolutionConfig";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function segmentProgress(elapsed, start, duration) {
  if (elapsed < start) return 0;
  if (duration <= 0) return 1;
  return easeOutCubic(clamp01((elapsed - start) / duration));
}

/**
 * Entrance lifecycle for Professional Evolution.
 *
 * Ownership:
 * - This controller owns visibility, entrance progress, and session-reset timers.
 * - Pose stabilizer owns filtered presentation transform (separate object).
 * - Both share AR_SESSION_RESET_MS via config so loss thresholds cannot drift.
 *
 * Brief tracking loss: keep completion + visibility; do not restart.
 * Mid-entrance loss: cancel RAF; reacquisition snaps to completed static state.
 * Full session reset (after sessionResetMs): restore initial state for next acquisition.
 * dispose(): cancels every RAF/timeout and ignores stale callbacks.
 *
 * @param {ReturnType<import("./createProfessionalEvolutionLayer").createProfessionalEvolutionLayer>} layer
 * @param {{
 *   reducedMotion?: boolean,
 *   timing?: typeof PROFESSIONAL_EVOLUTION_TIMING,
 *   now?: () => number,
 * }} [options]
 */
export function createProfessionalEvolutionAnimation(layer, options = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const timing =
    options.timing ??
    (reducedMotion
      ? PROFESSIONAL_EVOLUTION_REDUCED_MOTION_TIMING
      : PROFESSIONAL_EVOLUTION_TIMING);
  const now = options.now ?? (() => performance.now());

  let disposed = false;
  /** Bumped on dispose so in-flight callbacks cannot mutate a new session. */
  let generation = 0;
  /** @type {"hidden"|"playing"|"idle"|"lost"} */
  let phase = "hidden";
  let entrancePlayed = false;
  let sessionActive = false;
  let rafId = 0;
  let sessionResetTimer = 0;
  let completedProgress = null;

  function clearRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function clearSessionReset() {
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
  }

  function buildProgress(elapsed) {
    const stageCount = layer.stageNodes?.length ?? 0;
    const stages = Array.from({ length: stageCount }, (_, index) => {
      const start = timing.stageStartsMs[index] ?? timing.totalMs;
      return segmentProgress(elapsed, start, timing.stageFadeMs);
    });
    return {
      heading: segmentProgress(elapsed, 0, timing.headingFadeMs),
      line: segmentProgress(elapsed, timing.lineDrawStartMs, timing.lineDrawMs),
      stages,
      emphasis: segmentProgress(elapsed, timing.emphasisStartMs, timing.emphasisMs),
    };
  }

  function applyLift(progressHeading) {
    if (disposed) return;
    const lift = (layer.riseHeight ?? 0) * progressHeading;
    layer.anim.position.set(0, 0, lift);
  }

  function snapToCompleted() {
    if (disposed) return;
    phase = "idle";
    entrancePlayed = true;
    sessionActive = true;
    layer.group.visible = true;
    const progress = completedProgress ?? buildProgress(timing.totalMs);
    completedProgress = progress;
    layer.applyProgress(progress);
    applyLift(1);
  }

  function playEntrance() {
    if (disposed || entrancePlayed || phase === "playing") return;
    phase = "playing";
    sessionActive = true;
    layer.group.visible = true;
    clearRaf();

    const gen = generation;
    let started = null;
    const tick = (frameTime) => {
      // Stale frame after dispose, loss, or generation bump — stop cleanly.
      if (disposed || gen !== generation || phase !== "playing") {
        rafId = 0;
        return;
      }
      const tNow = typeof frameTime === "number" ? frameTime : now();
      if (started == null) started = tNow;
      const elapsed = tNow - started;
      const progress = buildProgress(elapsed);
      layer.applyProgress(progress);
      applyLift(progress.heading);
      if (elapsed >= timing.totalMs) {
        completedProgress = buildProgress(timing.totalMs);
        snapToCompleted();
        rafId = 0;
        return;
      }
      // Re-check before scheduling so mid-tick onTargetLost cannot leave a dangling RAF.
      if (disposed || gen !== generation || phase !== "playing") {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function onTargetFound() {
    if (disposed) return;
    clearSessionReset();

    // Brief loss recovery: preserve completion + visibility.
    if (sessionActive && entrancePlayed) {
      phase = "idle";
      layer.group.visible = true;
      if (completedProgress) layer.applyProgress(completedProgress);
      applyLift(1);
      return;
    }

    // Interrupted mid-entrance: resolve deterministically to completed static state.
    if (sessionActive && !entrancePlayed && phase === "lost") {
      clearRaf();
      snapToCompleted();
      return;
    }

    if (phase === "playing") return;
    playEntrance();
  }

  function onTargetLost() {
    if (disposed) return;
    if (phase === "hidden") return;

    // Cancel active entrance RAF immediately; keep visibility/completion for brief loss.
    phase = "lost";
    clearRaf();
    clearSessionReset();

    const gen = generation;
    sessionResetTimer = window.setTimeout(() => {
      sessionResetTimer = 0;
      if (disposed || gen !== generation) return;
      sessionActive = false;
      entrancePlayed = false;
      completedProgress = null;
      phase = "hidden";
      layer.resetVisualState?.();
      applyLift(0);
    }, timing.sessionResetMs);
  }

  function dispose() {
    disposed = true;
    generation += 1;
    clearRaf();
    clearSessionReset();
    phase = "hidden";
    sessionActive = false;
    entrancePlayed = false;
    completedProgress = null;
  }

  return {
    onTargetFound,
    onTargetLost,
    dispose,
    getState: () => ({
      phase,
      entrancePlayed,
      sessionActive,
      disposed,
      reducedMotion,
      timing,
      riseAxis: layer.riseAxis ?? "z",
    }),
  };
}
