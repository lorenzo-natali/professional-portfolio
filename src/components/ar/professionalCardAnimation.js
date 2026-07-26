import {
  PROFESSIONAL_CARD_REDUCED_MOTION_TIMING,
  PROFESSIONAL_CARD_TIMING,
} from "./professionalCardConfig";
import { getCardOpacity, setCardOpacity } from "./createProfessionalCard3D";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Lifecycle controller for the professional card entrance / loss / session reset.
 *
 * Rise uses document-local Z (MindAR image-plane normal), never screen/viewport axes.
 *
 * @param {ReturnType<import("./createProfessionalCard3D").createProfessionalCard3D>} card
 * @param {{
 *   reducedMotion?: boolean,
 *   timing?: typeof PROFESSIONAL_CARD_TIMING,
 *   now?: () => number,
 * }} [options]
 */
export function createProfessionalCardAnimation(card, options = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const timing =
    options.timing ??
    (reducedMotion ? PROFESSIONAL_CARD_REDUCED_MOTION_TIMING : PROFESSIONAL_CARD_TIMING);
  const now = options.now ?? (() => performance.now());

  let disposed = false;
  /** @type {"hidden"|"stabilizing"|"playing"|"idle"|"losing"|"lost"} */
  let phase = "hidden";
  let entrancePlayed = false;
  let sessionActive = false;
  let rafId = 0;
  let stabilizeTimer = 0;
  let sessionResetTimer = 0;

  const idle = card.idleRotation;
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

  function setOutlineOpacity(value) {
    if (!card.outlineMaterial) return;
    card.outlineMaterial.opacity = Math.min(Math.max(value, 0), 1);
    card.outlineMaterial.needsUpdate = true;
  }

  /**
   * @param {{
   *   lift?: number,
   *   rotX?: number,
   *   rotY?: number,
   *   rotZ?: number,
   *   opacity?: number,
   *   outline?: number,
   * }} pose
   */
  function applyPose({
    lift = 0,
    rotX = 0,
    rotY = 0,
    rotZ = 0,
    opacity = 1,
    outline = 0,
  }) {
    // Rise along document-local normal (Z). Keep XY fixed so the card stays over the header origin.
    card.anim.position.x = 0;
    card.anim.position.y = 0;
    card.anim.position.z = lift;
    card.anim.rotation.set(rotX, rotY, rotZ);
    setCardOpacity(card.group, opacity);
    setOutlineOpacity(outline);
  }

  function snapToIdle() {
    phase = "idle";
    entrancePlayed = true;
    sessionActive = true;
    card.group.visible = true;
    applyPose({
      lift: riseHeight,
      rotX: idle.x,
      rotY: idle.y,
      rotZ: idle.z,
      opacity: 1,
      outline: 0,
    });
  }

  function runKeyframeSequence(keyframes, onComplete) {
    clearRaf();
    let started = null;
    const total = keyframes.reduce((sum, frame) => sum + frame.durationMs, 0);

    const tick = (frameTime) => {
      if (disposed || phase !== "playing") return;
      // Prefer rAF timestamp when available; fall back to injected clock for tests.
      const tNow = typeof frameTime === "number" ? frameTime : now();
      if (started == null) started = tNow;
      const elapsed = tNow - started;
      let cursor = 0;
      let applied = null;

      for (let i = 0; i < keyframes.length; i += 1) {
        const frame = keyframes[i];
        const end = cursor + frame.durationMs;
        if (elapsed < end || i === keyframes.length - 1) {
          const localT =
            frame.durationMs <= 0
              ? 1
              : Math.min(1, Math.max(0, (elapsed - cursor) / frame.durationMs));
          const eased = (frame.ease ?? easeInOutCubic)(localT);
          applied = {
            lift: lerp(frame.from.lift, frame.to.lift, eased),
            rotX: lerp(frame.from.rotX, frame.to.rotX, eased),
            rotY: lerp(frame.from.rotY, frame.to.rotY, eased),
            rotZ: lerp(frame.from.rotZ, frame.to.rotZ, eased),
            opacity: lerp(frame.from.opacity, frame.to.opacity, eased),
            outline: lerp(frame.from.outline, frame.to.outline, eased),
          };
          break;
        }
        cursor = end;
      }

      if (applied) applyPose(applied);

      if (elapsed >= total) {
        snapToIdle();
        onComplete?.();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function playEntrance() {
    if (disposed || entrancePlayed || phase === "playing") return;

    phase = "playing";
    card.group.visible = true;
    sessionActive = true;

    const start = {
      lift: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      opacity: 0,
      outline: 0,
    };

    if (reducedMotion || timing.flipMs <= 0) {
      runKeyframeSequence([
        {
          durationMs: Math.max(timing.riseMs, 1),
          ease: easeOutCubic,
          from: start,
          to: {
            lift: riseHeight,
            rotX: idle.x,
            rotY: idle.y,
            rotZ: idle.z,
            opacity: 1,
            outline: 0,
          },
        },
      ]);
      return;
    }

    // Keep a small positive lift once the card has volume so tilt/flip clear the CV plane.
    const flushLift = Math.max(card.size?.thickness ?? 0.016, 0.012) * 0.55;
    const afterOutline = {
      lift: flushLift,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      opacity: 0.15,
      outline: 1,
    };
    const afterRise = {
      lift: riseHeight,
      rotX: -0.08,
      rotY: 0.1,
      rotZ: 0,
      opacity: 1,
      outline: 0.12,
    };
    const afterTilt = {
      lift: riseHeight,
      rotX: -0.4,
      rotY: 0.16,
      rotZ: 0.03,
      opacity: 1,
      outline: 0,
    };
    // Partial turn: back faces the viewer without completing a full spin through the page.
    const afterFlip = {
      lift: riseHeight,
      rotX: -0.18,
      rotY: Math.PI * 0.7,
      rotZ: 0.02,
      opacity: 1,
      outline: 0,
    };
    const settled = {
      lift: riseHeight,
      rotX: idle.x,
      rotY: idle.y,
      rotZ: idle.z,
      opacity: 1,
      outline: 0,
    };

    runKeyframeSequence([
      {
        durationMs: timing.outlineMs,
        ease: easeOutCubic,
        from: start,
        to: afterOutline,
      },
      {
        durationMs: timing.riseMs,
        ease: easeOutCubic,
        from: afterOutline,
        to: afterRise,
      },
      {
        durationMs: timing.tiltMs,
        ease: easeInOutCubic,
        from: afterRise,
        to: afterTilt,
      },
      {
        durationMs: timing.flipMs,
        ease: easeInOutCubic,
        from: afterTilt,
        to: afterFlip,
      },
      {
        durationMs: timing.settleMs,
        ease: easeInOutCubic,
        from: afterFlip,
        to: settled,
      },
    ]);
  }

  function beginStabilizeAndEnter() {
    if (disposed) return;

    // Same recognition session after brief loss: resume readable idle, never overlap timelines.
    if (sessionActive && entrancePlayed) {
      clearRaf();
      clearTimers();
      snapToIdle();
      return;
    }

    // Entrance was interrupted by loss before completion — finish to idle without replaying.
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
    const opacityBeforeLose = Math.max(getCardOpacity(card), 0.05);
    const fromLift = card.anim.position.z;
    const fromX = card.anim.rotation.x;
    const fromYRot = card.anim.rotation.y;
    const fromZ = card.anim.rotation.z;

    const tick = (frameTime) => {
      if (disposed || phase !== "losing") return;
      const tNow = typeof frameTime === "number" ? frameTime : now();
      if (loseStartedAt == null) loseStartedAt = tNow;
      const t = Math.min(1, (tNow - loseStartedAt) / Math.max(1, timing.loseFadeMs));
      const eased = easeOutCubic(t);
      applyPose({
        lift: fromLift,
        rotX: fromX,
        rotY: fromYRot,
        rotZ: fromZ,
        opacity: lerp(opacityBeforeLose, 0, eased),
        outline: 0,
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
    // Cancel only the session-reset timer; do not clear an in-flight stabilize unnecessarily twice.
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
      // Keep sessionActive false until entrance actually started.
      return;
    }

    if (phase === "hidden" || phase === "lost" || phase === "losing") {
      return;
    }

    // playing | idle
    softHide(() => {
      if (disposed) return;
      sessionResetTimer = window.setTimeout(() => {
        sessionResetTimer = 0;
        if (disposed) return;
        sessionActive = false;
        entrancePlayed = false;
        phase = "hidden";
        applyPose({ lift: 0, rotX: 0, rotY: 0, rotZ: 0, opacity: 0, outline: 0 });
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
