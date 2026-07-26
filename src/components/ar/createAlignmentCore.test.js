import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createAlignmentCore } from "./createAlignmentCore";
import { ALIGNMENT_CORE_INTERACTION } from "./alignmentCoreConfig";
import { quaternionAngle } from "./createAlignmentInteraction";
import { createAlignmentAnimator } from "./createAlignmentAnimator";

describe("createAlignmentCore", () => {
  it("builds two shells and a latent core under placement", () => {
    const core = createAlignmentCore(THREE);
    expect(core.placement.name).toBe("ar-alignment-core-placement");
    expect(core.leftShell.side).toBe("left");
    expect(core.rightShell.side).toBe("right");
    expect(core.hitTargets).toHaveLength(2);
    expect(core.coreGroup.visible).toBe(false);
    expect(core.placement.visible).toBe(false);
    expect(Math.abs(core.leftCarrier.position.x)).toBeCloseTo(core.layout.shellSeparation, 5);
    expect(Math.abs(core.rightCarrier.position.x)).toBeCloseTo(core.layout.shellSeparation, 5);
    expect(core.mergedHitTargets).toHaveLength(1);
    // Separated span targets ~70% of document width.
    const span = 2 * (core.layout.shellSeparation + core.layout.shellRadius);
    expect(span).toBeGreaterThanOrEqual(0.65);
    expect(span).toBeLessThanOrEqual(0.75);
    core.dispose();
    // Idempotent dispose.
    core.dispose();
  });
});

describe("alignment quaternion tolerance", () => {
  it("reports zero angle for identical quaternions", () => {
    const a = new THREE.Quaternion();
    const b = new THREE.Quaternion();
    expect(quaternionAngle(a, b)).toBeLessThan(1e-6);
  });

  it("detects merge when both shells are within tolerance", () => {
    const core = createAlignmentCore(THREE);
    core.leftShell.root.quaternion.copy(core.leftTarget);
    core.rightShell.root.quaternion.copy(core.rightTarget);
    const leftErr = quaternionAngle(core.leftShell.root.quaternion, core.leftTarget);
    const rightErr = quaternionAngle(core.rightShell.root.quaternion, core.rightTarget);
    expect(leftErr).toBeLessThan(ALIGNMENT_CORE_INTERACTION.alignToleranceRad);
    expect(rightErr).toBeLessThan(ALIGNMENT_CORE_INTERACTION.alignToleranceRad);

    let t = 0;
    const animator = createAlignmentAnimator(core, {
      THREE,
      isDragging: () => false,
      now: () => t,
      config: { ...ALIGNMENT_CORE_INTERACTION, mergeDurationMs: 100, pulseDurationMs: 50 },
    });
    animator.reveal();
    expect(animator.getPhase()).toBe("split");
    animator.update();
    expect(animator.getPhase()).toBe("aligning");
    t = 120;
    animator.update();
    expect(animator.getPhase()).toBe("merged");
    expect(core.coreGroup.visible).toBe(true);

    animator.dispose();
    core.dispose();
  });
});
