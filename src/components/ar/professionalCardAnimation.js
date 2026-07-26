import {
  PROFESSIONAL_CARD_REDUCED_MOTION_TIMING,
  PROFESSIONAL_CARD_TIMING,
} from "./professionalCardConfig";
import { DECISION_CORE_GLOW, DECISION_CORE_TIMING } from "./decisionCoreConfig";
import { getCardOpacity, setCardOpacity } from "./createProfessionalCard3D";

function readOpacity(artifact) {
  if (typeof artifact.getOpacity === "function") return artifact.getOpacity();
  if (typeof artifact.setOpacity === "function" && artifact.coreMaterial) {
    const material = artifact.coreMaterial;
    const base = material.userData?.baseOpacity ?? 1;
    return base > 0 ? material.opacity / base : 0;
  }
  return getCardOpacity(artifact);
}

function writeOpacity(artifact, opacity) {
  if (typeof artifact.setOpacity === "function") {
    artifact.setOpacity(opacity);
    return;
  }
  setCardOpacity(artifact.group, opacity);
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Lifecycle controller for restrained card entrance / loss / session reset.
 *
 * Writes only:
 * - anim.position.z (document-local rise)
 * - opacity / visibility
 *
 * Does not rotate or scale the card after entrance. User gestures own interaction.
 *
 * @param {ReturnType<import("./createProfessionalCard3D").createProfessionalCard3D>} card
 * @param {{
 *   reducedMotion?: boolean,
 *   timing?: typeof PROFESSIONAL_CARD_TIMING,
 *   now?: () => number,
 *   onSessionReset?: () => void,
 * }} [options]
 */
export function createProfessionalCardAnimation(card, options = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const timing =
    options.timing ??
    (reducedMotion ? PROFESSIONAL_CARD_REDUCED_MOTION_TIMING : PROFESSIONAL_CARD_TIMING);
  const now = options.now ?? (() => performance.now());
  const onSessionReset = options.onSessionReset;

  let disposed = false;
  /** @type {"hidden"|"stabilizing"|"playing"|"idle"|"losing"|"lost"} */
  let phase = "hidden";
  let entrancePlayed = false;
  let sessionActive = false;
  let rafId = 0;
  let stabilizeTimer = 0;
  let sessionResetTimer = 0;

  const riseHeight = card.riseHeight;

  function clearRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function clearTimers() {
    if (stabilizeTimer) {
      clearTimeout(stabilizeTimer);
      stabilizeTimer = 0;
    }
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
  }

  /**
   * @param {{ lift?: number, opacity?: number }} pose
   */
  function applyPose({ lift = 0, opacity = 1, glow }) {
    // Rise along document-local normal (Z). Keep XY and rotation fixed on anim.
    card.anim.position.x = 0;
    card.anim.position.y = 0;
    card.anim.position.z = lift;
    card.anim.rotation.set(0, 0, 0);
    writeOpacity(card, opacity);
    if (typeof glow === "number" && typeof card.setCoreGlow === "function") {
      card.setCoreGlow(glow);
    }
    if (card.outlineMaterial) {
      card.outlineMaterial.opacity = 0;
      card.outlineMaterial.needsUpdate = true;
    }
  }

  function snapToIdle() {
    phase = "idle";
    entrancePlayed = true;
    sessionActive = true;
    card.group.visible = true;
    applyPose({
      lift: riseHeight,
      opacity: 1,
      glow: DECISION_CORE_GLOW.idle,
    });
  }

  function playEntrance() {
    if (disposed || entrancePlayed || phase === "playing") return;

    phase = "playing";
    card.group.visible = true;
    sessionActive = true;

    clearRaf();
    let started = null;
    const duration = Math.max(timing.riseMs, 1);
    const glowPulseMs = DECISION_CORE_TIMING.glowPulseMs;
    const fromLift = 0;
    const fromOpacity = 0;

    const tick = (frameTime) => {
      if (disposed || phase !== "playing") return;
      const tNow = typeof frameTime === "number" ? frameTime : now();
      if (started == null) started = tNow;
      const elapsed = tNow - started;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      // Soft glow pulse once during entrance, then settle to idle.
      const pulseT = Math.min(1, elapsed / Math.max(1, glowPulseMs));
      const glow =
        pulseT < 1
          ? lerp(DECISION_CORE_GLOW.idle, DECISION_CORE_GLOW.pulsePeak, Math.sin(pulseT * Math.PI))
          : DECISION_CORE_GLOW.idle;
      applyPose({
        lift: lerp(fromLift, riseHeight, eased),
        opacity: lerp(fromOpacity, 1, eased),
        glow,
      });
      if (t >= 1) {
        snapToIdle();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function beginStabilizeAndEnter() {
    if (disposed) return;

    // Same recognition session after brief loss: resume readable idle.
    if (sessionActive && entrancePlayed) {
      clearRaf();
      clearTimers();
      snapToIdle();
      return;
    }

    // Entrance interrupted by loss before completion — finish to idle without replaying.
    if (sessionActive && !entrancePlayed && (phase === "lost" || phase === "losing")) {
      clearRaf();
      clearTimers();
      snapToIdle();
      return;
    }

    if (phase === "stabilizing" || phase === "playing") {
      return;
    }

    clearTimers();
    phase = "stabilizing";
    if (timing.stabilizeDelayMs <= 0) {
      playEntrance();
      return;
    }
    stabilizeTimer = window.setTimeout(() => {
      stabilizeTimer = 0;
      if (disposed || phase !== "stabilizing") return;
      playEntrance();
    }, timing.stabilizeDelayMs);
  }

  function softHide(onDone) {
    clearRaf();
    phase = "losing";
    let loseStartedAt = null;
    const opacityBeforeLose = Math.max(readOpacity(card), 0.05);
    const fromLift = card.anim.position.z;

    const tick = (frameTime) => {
      if (disposed || phase !== "losing") return;
      const tNow = typeof frameTime === "number" ? frameTime : now();
      if (loseStartedAt == null) loseStartedAt = tNow;
      const t = Math.min(1, (tNow - loseStartedAt) / Math.max(1, timing.loseFadeMs));
      const eased = easeOutCubic(t);
      applyPose({
        lift: fromLift,
        opacity: lerp(opacityBeforeLose, 0, eased),
      });
      if (t >= 1) {
        card.group.visible = false;
        phase = "lost";
        onDone?.();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function onTargetFound() {
    if (disposed) return;
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
    beginStabilizeAndEnter();
  }

  function onTargetLost() {
    if (disposed) return;

    if (phase === "stabilizing") {
      clearTimers();
      phase = "lost";
      return;
    }

    if (phase === "hidden" || phase === "lost" || phase === "losing") {
      return;
    }

    softHide(() => {
      if (disposed) return;
      sessionResetTimer = window.setTimeout(() => {
        sessionResetTimer = 0;
        if (disposed) return;
        sessionActive = false;
        entrancePlayed = false;
        phase = "hidden";
        applyPose({ lift: 0, opacity: 0 });
        // Gesture controller is the sole interaction writer — including reset.
        if (onSessionReset) {
          onSessionReset();
        } else {
          card.resetInteractionPose?.();
        }
      }, timing.sessionResetMs);
    });
  }

  function dispose() {
    disposed = true;
    clearRaf();
    clearTimers();
    phase = "hidden";
    sessionActive = false;
    entrancePlayed = false;
  }

  return {
    onTargetFound,
    onTargetLost,
    dispose,
    /** @internal test helpers */
    getState: () => ({
      phase,
      entrancePlayed,
      sessionActive,
      reducedMotion,
      timing,
      riseAxis: card.riseAxis ?? "z",
    }),
  };
}
