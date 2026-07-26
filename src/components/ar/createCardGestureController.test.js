import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createCardGestureController } from "./createCardGestureController";
import { PROFESSIONAL_CARD_INTERACTION } from "./professionalCardConfig";

function makeInteraction(rotation = { x: -0.05, y: 0, z: 0 }, scale = 1) {
  const interaction = new THREE.Group();
  interaction.rotation.set(rotation.x, rotation.y, rotation.z);
  interaction.scale.setScalar(scale);
  return interaction;
}

function fire(el, type, props) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, props);
  el.dispatchEvent(event);
  return event;
}

/** Cross the drag threshold, then apply a meaningful delta. */
function drag(el, from, mid, to) {
  fire(el, "pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: from.x,
    clientY: from.y,
    button: 0,
  });
  fire(el, "pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: mid.x,
    clientY: mid.y,
  });
  fire(el, "pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: to.x,
    clientY: to.y,
  });
}

describe("createCardGestureController", () => {
  let el;
  let interaction;
  let controller;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    interaction = makeInteraction();
    controller = createCardGestureController({
      domElement: el,
      interaction,
      initialRotation: { x: -0.05, y: 0, z: 0 },
      initialScale: 1,
      config: {
        ...PROFESSIONAL_CARD_INTERACTION,
        rotationSensitivity: 0.01,
        dragThresholdPx: 6,
        clampXRad: { min: -0.5, max: 0.2 },
        clampYRad: { min: -1, max: 1 },
        minScale: 0.8,
        maxScale: 1.5,
      },
    });
  });

  afterEach(() => {
    controller?.dispose();
    el.remove();
  });

  it("ignores sub-threshold movement and does not jump on pointer down", () => {
    const y0 = interaction.rotation.y;
    fire(el, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    expect(interaction.rotation.y).toBeCloseTo(y0, 5);
    fire(el, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 103,
      clientY: 101,
    });
    expect(interaction.rotation.y).toBeCloseTo(y0, 5);
    expect(controller.getState().rotateArmed).toBe(false);
  });

  it("one-finger drag rotates only the interaction group after the threshold", () => {
    const presentation = new THREE.Group();
    presentation.matrixAutoUpdate = false;
    presentation.matrix.makeTranslation(2, 3, 4);
    const beforePresentation = presentation.matrix.clone();

    drag(el, { x: 100, y: 100 }, { x: 110, y: 100 }, { x: 150, y: 80 });

    expect(interaction.rotation.y).toBeGreaterThan(0);
    expect(interaction.rotation.x).toBeLessThan(0);
    expect(presentation.matrix.equals(beforePresentation)).toBe(true);
    expect(el.setPointerCapture).toHaveBeenCalled();
  });

  it("enforces rotation clamps", () => {
    drag(el, { x: 0, y: 0 }, { x: 0, y: -10 }, { x: 0, y: -5000 });
    expect(interaction.rotation.x).toBeCloseTo(-0.5, 5);

    fire(el, "pointerup", { pointerId: 1, pointerType: "touch", clientX: 0, clientY: -5000 });
    drag(el, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 5000 });
    expect(interaction.rotation.x).toBeCloseTo(0.2, 5);

    fire(el, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10000,
      clientY: 5000,
    });
    expect(interaction.rotation.y).toBeCloseTo(1, 5);
  });

  it("pinch changes only interaction scale within bounds from the gesture-start baseline", () => {
    fire(el, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fire(el, "pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 100,
      clientY: 0,
      button: 0,
    });
    fire(el, "pointermove", { pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0 });
    fire(el, "pointermove", { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 0 });
    expect(interaction.scale.x).toBeCloseTo(1.5, 5);

    controller.reset();
    fire(el, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fire(el, "pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 0,
      button: 0,
    });
    fire(el, "pointermove", { pointerId: 2, pointerType: "touch", clientX: 40, clientY: 0 });
    expect(interaction.scale.x).toBeCloseTo(0.8, 5);
  });

  it("pointercancel clears gesture state without leaving a stuck mode", () => {
    fire(el, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
      button: 0,
    });
    fire(el, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 40,
      clientY: 10,
    });
    expect(controller.getState().pointerCount).toBe(1);
    fire(el, "pointercancel", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 40,
      clientY: 10,
    });
    expect(controller.getState().pointerCount).toBe(0);
    expect(controller.getState().mode).toBe("idle");
  });

  it("fires onTap for a stationary pointer up without drag or pinch", () => {
    const onTap = vi.fn();
    controller.dispose();
    controller = createCardGestureController({
      domElement: el,
      interaction,
      initialRotation: { x: -0.05, y: 0, z: 0 },
      initialScale: 1,
      onTap,
      config: {
        ...PROFESSIONAL_CARD_INTERACTION,
        dragThresholdPx: 6,
      },
    });

    fire(el, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 120,
      clientY: 140,
      button: 0,
    });
    fire(el, "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 121,
      clientY: 141,
    });
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith({ clientX: 120, clientY: 140 });
  });

  it("reset restores defaults and dispose removes listeners", () => {
    drag(el, { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 80, y: 40 });
    expect(interaction.rotation.y).not.toBeCloseTo(0, 3);

    controller.reset();
    expect(interaction.rotation.x).toBeCloseTo(-0.05, 5);
    expect(interaction.rotation.y).toBeCloseTo(0, 5);
    expect(interaction.scale.x).toBeCloseTo(1, 5);

    controller.dispose();
    const yBefore = interaction.rotation.y;
    drag(el, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 80, y: 0 });
    expect(interaction.rotation.y).toBeCloseTo(yBefore, 5);
  });
});
