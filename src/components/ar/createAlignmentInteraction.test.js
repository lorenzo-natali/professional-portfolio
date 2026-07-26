import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createAlignmentCore } from "./createAlignmentCore";
import { createAlignmentInteraction } from "./createAlignmentInteraction";
import { createAlignmentAnimator } from "./createAlignmentAnimator";
import { ALIGNMENT_CORE_INTERACTION } from "./alignmentCoreConfig";

function makeHarness() {
  const core = createAlignmentCore(THREE);
  core.setVisible(true);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
  camera.position.set(0, 0, 2.2);
  camera.lookAt(0, 0, 0);
  const dom = document.createElement("canvas");
  Object.defineProperty(dom, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 300, height: 300, right: 300, bottom: 300 }),
  });
  document.body.appendChild(dom);
  return { core, camera, dom };
}

describe("createAlignmentInteraction", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears inertia on reset and dispose", () => {
    const { core, camera, dom } = makeHarness();
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core,
      THREE,
      getPhase: () => "split",
    });

    interaction.reset();
    expect(interaction.getState().velX).toBe(0);
    expect(interaction.getState().velY).toBe(0);
    expect(interaction.getState().lastInertialTarget).toBeNull();
    expect(interaction.getState().pointerCount).toBe(0);
    expect(interaction.getState().dragging).toBe(false);

    interaction.dispose();
    expect(interaction.getState().disposed).toBe(true);
    expect(interaction.getState().velX).toBe(0);
    expect(interaction.getState().enabled).toBe(false);
    interaction.dispose();
    core.dispose();
  });

  it("setEnabled(false) cancels drag and clears inertia", () => {
    const { core, camera, dom } = makeHarness();
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core,
      THREE,
      getPhase: () => "split",
    });

    interaction.setEnabled(false);
    expect(interaction.isEnabled()).toBe(false);
    expect(interaction.getState().velX).toBe(0);
    expect(interaction.getState().activeTarget).toBeNull();
    expect(interaction.isDragging()).toBe(false);

    dom.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 150,
        clientY: 150,
        button: 0,
        bubbles: true,
      }),
    );
    expect(interaction.getState().pointerCount).toBe(0);

    interaction.dispose();
    core.dispose();
  });

  it("disables input during aligning and re-enables after merge", () => {
    const { core, camera, dom } = makeHarness();
    let phase = "hidden";
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core,
      THREE,
      getPhase: () => phase,
    });

    let t = 0;
    const animator = createAlignmentAnimator(core, {
      THREE,
      isDragging: () => interaction.isDragging(),
      now: () => t,
      onPhaseChange: (next) => {
        phase = next;
        if (next === "aligning" || next === "hidden") interaction.setEnabled(false);
        else interaction.setEnabled(true);
      },
      config: { ...ALIGNMENT_CORE_INTERACTION, mergeDurationMs: 40 },
    });

    animator.reveal();
    expect(phase).toBe("split");
    expect(interaction.isEnabled()).toBe(true);

    core.leftShell.root.quaternion.copy(core.leftTarget);
    core.rightShell.root.quaternion.copy(core.rightTarget);
    animator.update();
    expect(phase).toBe("aligning");
    expect(interaction.isEnabled()).toBe(false);
    expect(interaction.getState().velX).toBe(0);

    t = 50;
    animator.update();
    expect(phase).toBe("merged");
    expect(interaction.isEnabled()).toBe(true);
    expect(core.mergedHit.visible).toBe(true);

    animator.dispose();
    interaction.dispose();
    core.dispose();
  });

  it("ignores outside drags in split mode", () => {
    const { core, camera, dom } = makeHarness();
    core.hitTargets.length = 0;
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core,
      THREE,
      getPhase: () => "split",
    });
    const before = core.leftShell.root.rotation.x;
    dom.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 10,
        clientY: 10,
        button: 0,
        bubbles: true,
      }),
    );
    dom.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 7,
        clientX: 80,
        clientY: 40,
        bubbles: true,
      }),
    );
    expect(core.leftShell.root.rotation.x).toBe(before);
    expect(interaction.getState().activeTarget).toBeNull();
    interaction.dispose();
    core.dispose();
  });

  it("ignores outside drags after merge when merged hit misses", () => {
    const { core, camera, dom } = makeHarness();
    const interaction = createAlignmentInteraction({
      domElement: dom,
      camera,
      core: { ...core, mergedHitTargets: [] },
      THREE,
      getPhase: () => "merged",
    });
    const before = core.mergedInteraction.rotation.y;
    dom.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 3,
        clientX: 150,
        clientY: 150,
        button: 0,
        bubbles: true,
      }),
    );
    dom.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 3,
        clientX: 190,
        clientY: 150,
        bubbles: true,
      }),
    );
    expect(core.mergedInteraction.rotation.y).toBe(before);
    interaction.dispose();
    core.dispose();
  });
});

describe("alignment merge rules", () => {
  it("requires both shells inside tolerance and merges only once", () => {
    const core = createAlignmentCore(THREE);
    let t = 0;
    const phases = [];
    const animator = createAlignmentAnimator(core, {
      THREE,
      isDragging: () => false,
      now: () => t,
      onPhaseChange: (p) => phases.push(p),
      config: { ...ALIGNMENT_CORE_INTERACTION, mergeDurationMs: 40 },
    });
    animator.reveal();

    core.leftShell.root.quaternion.copy(core.leftTarget);
    animator.update();
    expect(animator.getPhase()).toBe("split");

    core.rightShell.root.quaternion.copy(core.rightTarget);
    animator.update();
    expect(animator.getPhase()).toBe("aligning");
    t = 50;
    animator.update();
    expect(animator.getPhase()).toBe("merged");
    expect(phases.filter((p) => p === "merged")).toHaveLength(1);

    t = 200;
    animator.update();
    expect(animator.getPhase()).toBe("merged");
    expect(phases.filter((p) => p === "merged")).toHaveLength(1);

    animator.dispose();
    core.dispose();
  });

  it("reset during merge restores hidden session state", () => {
    const core = createAlignmentCore(THREE);
    let t = 0;
    const animator = createAlignmentAnimator(core, {
      THREE,
      isDragging: () => false,
      now: () => t,
      config: { ...ALIGNMENT_CORE_INTERACTION, mergeDurationMs: 200 },
    });
    animator.reveal();
    core.leftShell.root.quaternion.copy(core.leftTarget);
    core.rightShell.root.quaternion.copy(core.rightTarget);
    animator.update();
    expect(animator.getPhase()).toBe("aligning");

    animator.resetSession();
    expect(animator.getPhase()).toBe("hidden");
    expect(core.placement.visible).toBe(false);
    expect(core.coreGroup.visible).toBe(false);
    expect(Math.abs(core.leftCarrier.position.x)).toBeGreaterThan(0.1);

    animator.dispose();
    core.dispose();
  });
});
