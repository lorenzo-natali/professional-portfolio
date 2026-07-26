import { ALIGNMENT_CORE_INTERACTION } from "./alignmentCoreConfig";
import { quaternionAngle } from "./createAlignmentInteraction";

/**
 * Alignment detection, magnetic merge, and completed-core breath.
 *
 * @param {ReturnType<import("./createAlignmentCore").createAlignmentCore>} core
 * @param {{
 *   THREE: typeof import("three"),
 *   config?: typeof ALIGNMENT_CORE_INTERACTION,
 *   isDragging?: () => boolean,
 *   now?: () => number,
 *   onPhaseChange?: (phase: "hidden" | "split" | "aligning" | "merged") => void,
 * }} options
 */
export function createAlignmentAnimator(core, options) {
  const THREE = options.THREE;
  const config = { ...ALIGNMENT_CORE_INTERACTION, ...options.config };
  const isDragging = options.isDragging ?? (() => false);
  const now = options.now ?? (() => performance.now());
  const onPhaseChange = options.onPhaseChange;

  /** @type {"hidden" | "split" | "aligning" | "merged"} */
  let phase = "hidden";
  let disposed = false;
  let mergeStartedAt = 0;
  let pulseStartedAt = 0;
  let leftStart = new THREE.Quaternion();
  let rightStart = new THREE.Quaternion();
  let leftStartX = 0;
  let rightStartX = 0;

  function setPhase(next) {
    if (phase === next) return;
    phase = next;
    onPhaseChange?.(phase);
  }

  function bothWithinTolerance() {
    const leftErr = quaternionAngle(core.leftShell.root.quaternion, core.leftTarget);
    const rightErr = quaternionAngle(core.rightShell.root.quaternion, core.rightTarget);
    return leftErr <= config.alignToleranceRad && rightErr <= config.alignToleranceRad;
  }

  function beginMerge() {
    setPhase("aligning");
    mergeStartedAt = now();
    leftStart.copy(core.leftShell.root.quaternion);
    rightStart.copy(core.rightShell.root.quaternion);
    leftStartX = core.leftCarrier.position.x;
    rightStartX = core.rightCarrier.position.x;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }

  function finishMerge() {
    core.leftShell.root.quaternion.copy(core.leftTarget);
    core.rightShell.root.quaternion.copy(core.rightTarget);
    core.leftShell.root.rotation.setFromQuaternion(core.leftShell.root.quaternion);
    core.rightShell.root.rotation.setFromQuaternion(core.rightShell.root.quaternion);
    core.leftCarrier.position.x = 0;
    core.rightCarrier.position.x = 0;

    core.mergedInteraction.attach(core.leftCarrier);
    core.mergedInteraction.attach(core.rightCarrier);
    core.mergedInteraction.attach(core.coreGroup);

    core.mergedHit.visible = true;
    core.coreGroup.visible = true;
    core.haloMat.opacity = 0.35;
    core.coreMat.emissiveIntensity = 1.35;
    pulseStartedAt = now();
    setPhase("merged");
  }

  function reveal() {
    if (disposed) return;
    if (phase === "hidden") {
      setPhase("split");
    }
    core.setVisible(true);
  }

  function hide() {
    if (disposed) return;
    setPhase("hidden");
    core.setVisible(false);
  }

  function resetSession() {
    if (disposed) return;
    if (core.leftCarrier.parent !== core.assembly) {
      core.assembly.attach(core.leftCarrier);
    }
    if (core.rightCarrier.parent !== core.assembly) {
      core.assembly.attach(core.rightCarrier);
    }
    if (core.coreGroup.parent !== core.assembly) {
      core.assembly.attach(core.coreGroup);
    }
    core.mergedInteraction.rotation.set(0, 0, 0);
    core.resetToSplit();
    mergeStartedAt = 0;
    pulseStartedAt = 0;
    setPhase("hidden");
    core.setVisible(false);
  }

  function update() {
    if (disposed || phase === "hidden") return;
    const tNow = now();

    if (phase === "split") {
      if (!isDragging() && bothWithinTolerance()) {
        beginMerge();
      }
      return;
    }

    if (phase === "aligning") {
      const elapsed = tNow - mergeStartedAt;
      const u = Math.min(1, elapsed / Math.max(1, config.mergeDurationMs));
      const e = easeInOut(u);
      core.leftShell.root.quaternion.slerpQuaternions(leftStart, core.leftTarget, e);
      core.rightShell.root.quaternion.slerpQuaternions(rightStart, core.rightTarget, e);
      core.leftShell.root.rotation.setFromQuaternion(core.leftShell.root.quaternion);
      core.rightShell.root.rotation.setFromQuaternion(core.rightShell.root.quaternion);
      core.leftCarrier.position.x = THREE.MathUtils.lerp(leftStartX, 0, e);
      core.rightCarrier.position.x = THREE.MathUtils.lerp(rightStartX, 0, e);
      if (u >= 1) finishMerge();
      return;
    }

    if (phase === "merged") {
      const pulseElapsed = tNow - pulseStartedAt;
      if (pulseElapsed < config.pulseDurationMs) {
        const p = pulseElapsed / config.pulseDurationMs;
        const pulse = Math.sin(p * Math.PI);
        core.haloMat.opacity = 0.15 + pulse * 0.45;
        core.coreMat.emissiveIntensity = 0.9 + pulse * 0.7;
      } else {
        const breath =
          0.5 +
          0.5 *
            Math.sin(
              ((tNow - pulseStartedAt) / config.coreBreathPeriodMs) * Math.PI * 2,
            );
        const amp = config.coreBreathAmplitude;
        core.coreMat.emissiveIntensity = 0.85 + breath * amp;
        core.haloMat.opacity = 0.12 + breath * 0.1;
      }
    }
  }

  return {
    reveal,
    hide,
    resetSession,
    update,
    getPhase: () => phase,
    dispose() {
      if (disposed) return;
      disposed = true;
      phase = "hidden";
    },
  };
}
