import { PROFESSIONAL_CARD_INTERACTION } from "./professionalCardConfig";

/**
 * Direct touch manipulation for the Professional Card interaction group.
 *
 * Sole writer of interaction.rotation (X/Y) and interaction.scale.
 * Does not touch the MindAR anchor or stabilized presentation transform.
 *
 * @param {{
 *   domElement: HTMLElement,
 *   interaction: import("three").Object3D,
 *   config?: typeof PROFESSIONAL_CARD_INTERACTION,
 *   initialRotation?: { x: number, y: number, z: number },
 *   initialScale?: number,
 *   isEnabled?: () => boolean,
 *   onTap?: (point: { clientX: number, clientY: number }) => void,
 * }} options
 */
export function createCardGestureController(options) {
  const domElement = options.domElement;
  const interaction = options.interaction;
  const config = { ...PROFESSIONAL_CARD_INTERACTION, ...options.config };
  const initialRotation = options.initialRotation ?? {
    x: interaction.rotation.x,
    y: interaction.rotation.y,
    z: interaction.rotation.z,
  };
  const initialScale = options.initialScale ?? interaction.scale.x;
  const isEnabled = options.isEnabled ?? (() => true);
  const onTap = options.onTap;
  const dragThresholdPx = config.dragThresholdPx ?? 6;

  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();
  let mode = "idle"; // idle | rotate | pinch
  let rotateArmed = false;
  let pinchUsed = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let downClientX = 0;
  let downClientY = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = initialScale;
  let disposed = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyRotationDelta(dx, dy) {
    const sens = config.rotationSensitivity;
    interaction.rotation.y = clamp(
      interaction.rotation.y + dx * sens,
      config.clampYRad.min,
      config.clampYRad.max,
    );
    interaction.rotation.x = clamp(
      interaction.rotation.x + dy * sens,
      config.clampXRad.min,
      config.clampXRad.max,
    );
  }

  function applyScale(next) {
    const value = clamp(next, config.minScale, config.maxScale);
    interaction.scale.setScalar(value);
  }

  function pointerDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()];
    mode = "pinch";
    rotateArmed = false;
    pinchUsed = true;
    pinchStartDistance = Math.max(pointerDistance(a, b), 1);
    pinchStartScale = interaction.scale.x;
  }

  function beginRotateTracking(point, { armImmediately }) {
    mode = "rotate";
    downX = point.x;
    downY = point.y;
    lastX = point.x;
    lastY = point.y;
    rotateArmed = armImmediately;
  }

  function syncModeFromPointers({ armRotateImmediately = false } = {}) {
    if (pointers.size >= 2) {
      beginPinch();
      return;
    }
    if (pointers.size === 1) {
      const only = [...pointers.values()][0];
      beginRotateTracking(only, { armImmediately: armRotateImmediately });
      return;
    }
    mode = "idle";
    rotateArmed = false;
  }

  function onPointerDown(event) {
    if (disposed || !isEnabled()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      domElement.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }

    if (pointers.size >= 2) {
      beginPinch();
    } else {
      pinchUsed = false;
      downClientX = event.clientX;
      downClientY = event.clientY;
      beginRotateTracking(
        { x: event.clientX, y: event.clientY },
        { armImmediately: false },
      );
    }
    event.preventDefault?.();
  }

  function onPointerMove(event) {
    if (disposed || !pointers.has(event.pointerId)) return;
    if (!isEnabled()) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (mode === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.max(pointerDistance(a, b), 1);
      applyScale(pinchStartScale * (distance / pinchStartDistance));
      event.preventDefault?.();
      return;
    }

    if (mode === "rotate" && pointers.size === 1) {
      const point = pointers.get(event.pointerId);
      if (!rotateArmed) {
        const traveled = Math.hypot(point.x - downX, point.y - downY);
        if (traveled < dragThresholdPx) {
          event.preventDefault?.();
          return;
        }
        // Arm without applying the threshold travel as a sudden rotation jump.
        rotateArmed = true;
        lastX = point.x;
        lastY = point.y;
        event.preventDefault?.();
        return;
      }
      const dx = point.x - lastX;
      const dy = point.y - lastY;
      lastX = point.x;
      lastY = point.y;
      applyRotationDelta(dx, dy);
      event.preventDefault?.();
    }
  }

  function onPointerUp(event) {
    if (!pointers.has(event.pointerId)) return;
    const wasRotateArmed = rotateArmed;
    const wasPinchUsed = pinchUsed;
    const tapX = downClientX;
    const tapY = downClientY;
    pointers.delete(event.pointerId);
    try {
      domElement.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    // After pinch→one finger, continue rotating without re-arming the threshold.
    syncModeFromPointers({ armRotateImmediately: pointers.size === 1 });

    // Tap: single pointer, never armed a drag, never pinched.
    if (
      pointers.size === 0 &&
      !wasRotateArmed &&
      !wasPinchUsed &&
      typeof onTap === "function" &&
      isEnabled()
    ) {
      onTap({ clientX: tapX, clientY: tapY });
    }
    if (pointers.size === 0) {
      pinchUsed = false;
    }
  }

  function onPointerCancel(event) {
    onPointerUp(event);
  }

  function reset() {
    pointers.clear();
    mode = "idle";
    rotateArmed = false;
    interaction.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
    interaction.scale.setScalar(initialScale);
  }

  const listenerOpts = { passive: false };
  domElement.addEventListener("pointerdown", onPointerDown, listenerOpts);
  domElement.addEventListener("pointermove", onPointerMove, listenerOpts);
  domElement.addEventListener("pointerup", onPointerUp, listenerOpts);
  domElement.addEventListener("pointercancel", onPointerCancel, listenerOpts);
  domElement.addEventListener("lostpointercapture", onPointerUp, listenerOpts);

  // iOS Safari: block page pinch/scroll/text-selection while touching the AR view.
  const prevTouchAction = domElement.style.touchAction;
  const prevUserSelect = domElement.style.userSelect;
  const prevWebkitUserSelect = domElement.style.webkitUserSelect;
  domElement.style.touchAction = "none";
  domElement.style.userSelect = "none";
  domElement.style.webkitUserSelect = "none";

  return {
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      pointers.clear();
      mode = "idle";
      rotateArmed = false;
      domElement.removeEventListener("pointerdown", onPointerDown, listenerOpts);
      domElement.removeEventListener("pointermove", onPointerMove, listenerOpts);
      domElement.removeEventListener("pointerup", onPointerUp, listenerOpts);
      domElement.removeEventListener("pointercancel", onPointerCancel, listenerOpts);
      domElement.removeEventListener("lostpointercapture", onPointerUp, listenerOpts);
      domElement.style.touchAction = prevTouchAction;
      domElement.style.userSelect = prevUserSelect;
      domElement.style.webkitUserSelect = prevWebkitUserSelect;
    },
    /** @internal */
    getState: () => ({
      mode,
      rotateArmed,
      pointerCount: pointers.size,
      rotationX: interaction.rotation.x,
      rotationY: interaction.rotation.y,
      scale: interaction.scale.x,
      config,
    }),
  };
}
