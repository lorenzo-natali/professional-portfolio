import { ALIGNMENT_CORE_INTERACTION } from "./alignmentCoreConfig";

/**
 * Independent shell rotation (X/Y) with inertia. No translate / scale.
 * After merge, rotates the completed assembly only when the pointer hits it.
 *
 * @param {{
 *   domElement: HTMLElement,
 *   camera: import("three").Camera,
 *   core: ReturnType<import("./createAlignmentCore").createAlignmentCore>,
 *   THREE: typeof import("three"),
 *   config?: typeof ALIGNMENT_CORE_INTERACTION,
 *   getPhase?: () => "hidden" | "split" | "aligning" | "merged",
 *   onDragStart?: () => void,
 *   onDragEnd?: () => void,
 * }} options
 */
export function createAlignmentInteraction(options) {
  const domElement = options.domElement;
  const camera = options.camera;
  const core = options.core;
  const THREE = options.THREE;
  const config = { ...ALIGNMENT_CORE_INTERACTION, ...options.config };
  const getPhase = options.getPhase ?? (() => "split");

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();

  let disposed = false;
  /** Explicit gate — disabled during aligning / hidden / after dispose. */
  let enabled = true;
  /** @type {"left" | "right" | "merged" | null} */
  let activeTarget = null;
  let lastInertialTarget = null;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;
  let velY = 0;
  let dragging = false;
  /** @type {number | null} */
  let capturedPointerId = null;

  function releaseCapturedPointer() {
    if (capturedPointerId == null) return;
    try {
      domElement.releasePointerCapture?.(capturedPointerId);
    } catch {
      // ignore
    }
    capturedPointerId = null;
  }

  /**
   * Clears velocities, pointers, drag, and capture.
   * Safe to call repeatedly.
   */
  function reset() {
    releaseCapturedPointer();
    pointers.clear();
    activeTarget = null;
    lastInertialTarget = null;
    lastX = 0;
    lastY = 0;
    velX = 0;
    velY = 0;
    dragging = false;
  }

  function setEnabled(next) {
    const value = Boolean(next);
    if (!value) {
      reset();
    }
    enabled = value && !disposed;
  }

  function resolveTarget(clientX, clientY) {
    const phase = getPhase();
    if (!enabled || disposed) return null;
    if (phase === "aligning" || phase === "hidden") return null;

    const rect = domElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    if (phase === "merged") {
      const mergedHits = raycaster.intersectObjects(core.mergedHitTargets ?? [], false);
      return mergedHits.length > 0 ? "merged" : null;
    }

    // Split: nearest valid shell proxy (raycaster sorts by distance).
    const hits = raycaster.intersectObjects(core.hitTargets ?? [], false);
    for (const hit of hits) {
      const side = hit.object?.userData?.shellSide;
      if (side === "left" || side === "right") return side;
    }
    return null;
  }

  function targetObject(kind) {
    if (kind === "left") return core.leftShell.root;
    if (kind === "right") return core.rightShell.root;
    if (kind === "merged") return core.mergedInteraction;
    return null;
  }

  function applyDelta(dx, dy) {
    if (!enabled || disposed) return;
    const object = targetObject(activeTarget);
    if (!object) return;
    const sens = config.rotationSensitivity;
    object.rotation.y += dx * sens;
    object.rotation.x += dy * sens;
    object.quaternion.setFromEuler(object.rotation);
  }

  function onPointerDown(event) {
    if (disposed || !enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointers.size > 0) return;

    const target = resolveTarget(event.clientX, event.clientY);
    if (!target) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      domElement.setPointerCapture?.(event.pointerId);
      capturedPointerId = event.pointerId;
    } catch {
      capturedPointerId = null;
    }

    activeTarget = target;
    lastInertialTarget = target;
    lastX = event.clientX;
    lastY = event.clientY;
    velX = 0;
    velY = 0;
    dragging = false;
    options.onDragStart?.();
    event.preventDefault?.();
  }

  function onPointerMove(event) {
    if (disposed || !enabled || !activeTarget || !pointers.has(event.pointerId)) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (!dragging) {
      if (Math.hypot(dx, dy) < config.dragThresholdPx) return;
      dragging = true;
    }

    applyDelta(dx, dy);
    velX = dx * config.inertiaGain;
    velY = dy * config.inertiaGain;
    event.preventDefault?.();
  }

  function onPointerUp(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (capturedPointerId === event.pointerId) {
      releaseCapturedPointer();
    } else {
      try {
        domElement.releasePointerCapture?.(event.pointerId);
      } catch {
        // ignore
      }
    }
    if (pointers.size === 0) {
      dragging = false;
      options.onDragEnd?.();
      lastInertialTarget = activeTarget;
      activeTarget = null;
    }
  }

  function update() {
    if (disposed || !enabled) {
      velX = 0;
      velY = 0;
      return;
    }
    if (dragging || pointers.size > 0) return;
    if (Math.abs(velX) < 0.02 && Math.abs(velY) < 0.02) {
      velX = 0;
      velY = 0;
      return;
    }
    const phase = getPhase();
    if (phase === "aligning" || phase === "hidden") {
      velX = 0;
      velY = 0;
      return;
    }
    const kind = phase === "merged" ? "merged" : lastInertialTarget;
    if (!kind || (phase === "merged" && kind !== "merged")) {
      velX = 0;
      velY = 0;
      return;
    }
    // Inertia only continues for a target that was actually grabbed.
    if (phase === "split" && kind !== "left" && kind !== "right") {
      velX = 0;
      velY = 0;
      return;
    }
    const prev = activeTarget;
    activeTarget = kind;
    applyDelta(velX, velY);
    activeTarget = prev;
    velX *= config.inertiaDamping;
    velY *= config.inertiaDamping;
  }

  function isDragging() {
    return pointers.size > 0 || dragging;
  }

  domElement.addEventListener("pointerdown", onPointerDown, { passive: false });
  domElement.addEventListener("pointermove", onPointerMove, { passive: false });
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);
  domElement.addEventListener("lostpointercapture", onPointerUp);

  return {
    update,
    isDragging,
    reset,
    setEnabled,
    isEnabled: () => enabled && !disposed,
    getState: () => ({
      enabled,
      disposed,
      dragging,
      activeTarget,
      lastInertialTarget,
      velX,
      velY,
      pointerCount: pointers.size,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      reset();
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointercancel", onPointerUp);
      domElement.removeEventListener("lostpointercapture", onPointerUp);
    },
  };
}

/**
 * Quaternion angle in radians between two orientations.
 * @param {import("three").Quaternion} a
 * @param {import("three").Quaternion} b
 */
export function quaternionAngle(a, b) {
  const dot = Math.min(1, Math.max(-1, Math.abs(a.dot(b))));
  return 2 * Math.acos(dot);
}
