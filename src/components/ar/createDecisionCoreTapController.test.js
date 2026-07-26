import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createDecisionCore3D } from "./createDecisionCore3D";
import { createDecisionCoreTapController } from "./createDecisionCoreTapController";

describe("createDecisionCoreTapController", () => {
  let artifact;
  let camera;
  let dom;
  let controller;
  let now;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(performance.now());
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    now = 0;
    artifact = createDecisionCore3D(THREE);
    artifact.setOpacity(1);
    artifact.group.visible = true;
    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10);
    camera.position.set(0, 0, 0.55);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    dom = document.createElement("div");
    Object.defineProperty(dom, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 }),
    });
    document.body.appendChild(dom);
    controller = createDecisionCoreTapController(THREE, {
      artifact,
      camera,
      domElement: dom,
      now: () => now,
      timing: { labelVisibleMs: 50, expandMs: 1, collapseMs: 1 },
    });
  });

  afterEach(() => {
    controller?.dispose();
    artifact?.dispose();
    dom?.remove();
    vi.unstubAllGlobals();
  });

  function tapCenter() {
    // Project first segment blade to screen and tap there.
    const segment = artifact.segments[0];
    artifact.group.updateMatrixWorld(true);
    const world = new THREE.Vector3();
    segment.blade.getWorldPosition(world);
    const projected = world.clone().project(camera);
    const clientX = ((projected.x + 1) / 2) * 400;
    const clientY = ((-projected.y + 1) / 2) * 400;
    controller.handleTap({ clientX, clientY });
    return segment;
  }

  it("first tap expands the segment and reveals a short label", () => {
    const segment = tapCenter();
    expect(segment.expanded).toBe(true);
    expect(segment.label.visible).toBe(true);
    expect(segment.tokensOpen).toBe(false);
    expect(controller.getState().activeStageId).toBe(segment.id);
  });

  it("second tap reveals framework tokens; outside tap collapses", () => {
    const segment = tapCenter();
    tapCenter();
    expect(segment.tokensOpen).toBe(true);
    expect(segment.tokenMeshes.every((mesh) => mesh.visible)).toBe(true);

    controller.handleTap({ clientX: 2, clientY: 2 });
    expect(segment.expanded).toBe(false);
    expect(segment.tokensOpen).toBe(false);
    expect(controller.getState().activeStageId).toBeNull();
  });

  it("auto-hides the stage label after the configured delay", () => {
    vi.useFakeTimers();
    const segment = tapCenter();
    expect(segment.label.visible).toBe(true);
    vi.advanceTimersByTime(60);
    expect(segment.label.visible).toBe(false);
    vi.useRealTimers();
  });
});
