import { getInterestObjectCard } from "./interestObjectsContent";
import {
  INTEREST_TAP_MOVE_THRESHOLD_PX,
  INTEREST_VISITOR_ROTATION_SENSITIVITY,
  applyVisitorRotationToGroup,
  computeVisitorRotationFromDrag,
  normalizeYaw,
} from "./interestObjectsVisitorRotation";

const CLOSE_MS = 140;

/**
 * Find interest root from a raycast hit object.
 * @param {import("three").Object3D | null | undefined} object
 * @returns {{ id: string, root: import("three").Object3D } | null}
 */
export function findInterestRootFromObject(object) {
  let node = object;
  while (node) {
    const id = node.userData?.interestId;
    if (typeof id === "string" && id) {
      return { id, root: node };
    }
    node = node.parent;
  }
  return null;
}

/**
 * Unified interest interaction: short-tap info card + visitor drag-to-rotate.
 * Single Pointer Events owner on the AR hit layer (no second listener controller).
 *
 * Card invariant during rotation: an already-open card is left unchanged;
 * rotation never opens, closes, or toggles a card.
 *
 * @param {{
 *   THREE: typeof import("three"),
 *   layer: ReturnType<typeof import("./createInterestObjectsLayer").createInterestObjectsLayer>,
 *   camera: import("three").Camera,
 *   domElement: HTMLElement,
 *   container?: HTMLElement | null,
 *   shell?: HTMLElement | null,
 *   moveThresholdPx?: number,
 *   rotationSensitivity?: number,
 * }} options
 */
export function createInterestObjectsTapController(options) {
  const THREE = options.THREE;
  const layer = options.layer;
  const camera = options.camera;
  const domElement = options.domElement;
  const moveThresholdPx = options.moveThresholdPx ?? INTEREST_TAP_MOVE_THRESHOLD_PX;
  const rotationSensitivity =
    options.rotationSensitivity ?? INTEREST_VISITOR_ROTATION_SENSITIVITY;
  const container =
    options.container ??
    (domElement?.closest?.(".ar-tracking-container") || domElement?.parentElement || null);
  const shell =
    options.shell ??
    container?.closest?.("[data-ar-viewport-shell='true']") ??
    null;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const worldPoint = new THREE.Vector3();

  let disposed = false;
  /** @type {string | null} */
  let openId = null;
  let closeTimer = 0;

  /** @type {"idle" | "pending" | "rotating"} */
  let gestureMode = "idle";
  /**
   * @type {{
   *   pointerId: number,
   *   interestId: string | null,
   *   startX: number,
   *   startY: number,
   *   startYaw: number,
   *   startPitch: number,
   * } | null}
   */
  let activeGesture = null;

  /** @type {Map<string, { yaw: number, pitch: number }>} */
  const visitorAngles = new Map();

  // Transparent hit surface — iOS Safari is unreliable on WebGL canvas alone.
  const hitLayer = document.createElement("div");
  hitLayer.setAttribute("data-ar-interest-hit", "true");
  hitLayer.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:8",
    "pointer-events:auto",
    "touch-action:none",
    "background:transparent",
    "-webkit-user-select:none",
    "user-select:none",
  ].join(";");

  if (container) {
    container.dataset.arInterestInteractive = "true";
    container.style.pointerEvents = "auto";
    container.style.touchAction = "none";
    container.appendChild(hitLayer);
  } else {
    document.body.appendChild(hitLayer);
  }

  // Single reused card (never recreate).
  const card = document.createElement("div");
  card.setAttribute("data-ar-interest-info-card", "true");
  card.className = "ar-interest-info-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "false");
  card.setAttribute("aria-hidden", "true");
  card.style.pointerEvents = "none";

  const titleEl = document.createElement("h3");
  titleEl.className = "ar-interest-info-card__title";
  const bodyEl = document.createElement("p");
  bodyEl.className = "ar-interest-info-card__body";
  card.appendChild(titleEl);
  card.appendChild(bodyEl);

  const host =
    shell ||
    (typeof document !== "undefined"
      ? document.querySelector("[data-ar-portal-host='true']")
      : null) ||
    container ||
    document.body;
  host.appendChild(card);

  function interactionRect() {
    return hitLayer.getBoundingClientRect();
  }

  function measureSafeInsets() {
    const fallback = { top: 8, right: 10, bottom: 56, left: 10 };
    try {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:env(safe-area-inset-top);right:env(safe-area-inset-right);bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left);visibility:hidden;pointer-events:none;";
      document.documentElement.appendChild(probe);
      const cs = getComputedStyle(probe);
      const top = Number.parseFloat(cs.top) || 0;
      const right = Number.parseFloat(cs.right) || 0;
      const bottom = Number.parseFloat(cs.bottom) || 0;
      const left = Number.parseFloat(cs.left) || 0;
      probe.remove();
      return {
        top: Math.max(fallback.top, top),
        right: Math.max(fallback.right, right),
        bottom: Math.max(fallback.bottom, bottom + 8),
        left: Math.max(fallback.left, left),
      };
    } catch {
      return fallback;
    }
  }

  const insets = measureSafeInsets();

  function getVisitorAngles(id) {
    return visitorAngles.get(id) ?? { yaw: 0, pitch: 0 };
  }

  function pickInterest(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const rect = interactionRect();
    if (rect.width < 1 || rect.height < 1) return null;
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const meshes = [];
    layer.entries.forEach((entry) => {
      if (!entry.content || !entry.revealed) return;
      entry.content.traverse((node) => {
        if (node.isMesh) meshes.push(node);
      });
    });
    if (!meshes.length) return null;
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;
    return findInterestRootFromObject(hits[0].object);
  }

  function projectEntryAnchor(entry) {
    if (!entry?.root) return null;
    entry.root.updateMatrixWorld(true);
    worldPoint.setFromMatrixPosition(entry.root.matrixWorld);
    worldPoint.project(camera);
    if (!Number.isFinite(worldPoint.x) || !Number.isFinite(worldPoint.y)) return null;
    if (worldPoint.z > 1) return null;

    const rect = interactionRect();
    const x = (worldPoint.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-worldPoint.y * 0.5 + 0.5) * rect.height + rect.top;
    return { x, y };
  }

  function placeCardNear(anchor) {
    const vv = window.visualViewport;
    const viewLeft = vv?.offsetLeft ?? 0;
    const viewTop = vv?.offsetTop ?? 0;
    const viewW = vv?.width ?? window.innerWidth;
    const viewH = vv?.height ?? window.innerHeight;

    const cardW = Math.min(card.offsetWidth || 280, viewW - insets.left - insets.right);
    const cardH = card.offsetHeight || 96;

    let left = anchor.x - cardW / 2;
    let top = anchor.y - cardH - 18;
    if (top < viewTop + insets.top) {
      top = anchor.y + 18;
    }

    const minL = viewLeft + insets.left;
    const maxL = viewLeft + viewW - insets.right - cardW;
    const minT = viewTop + insets.top;
    const maxT = viewTop + viewH - insets.bottom - cardH;

    left = Math.min(Math.max(left, minL), Math.max(minL, maxL));
    top = Math.min(Math.max(top, minT), Math.max(minT, maxT));

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.style.width = `${Math.round(cardW)}px`;
  }

  function syncOpenCardPosition() {
    if (!openId || disposed) return;
    const entry = layer.getEntry(openId);
    const anchor = projectEntryAnchor(entry);
    if (anchor) placeCardNear(anchor);
  }

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    }
  }

  function setCardContent(id) {
    const copy = getInterestObjectCard(id);
    if (!copy) return false;
    titleEl.textContent = copy.title;
    bodyEl.textContent = copy.body;
    card.setAttribute("aria-label", copy.title);
    return true;
  }

  function openCard(id) {
    if (!setCardContent(id)) return;
    clearCloseTimer();
    openId = id;
    card.classList.remove("is-closing");
    card.setAttribute("aria-hidden", "false");
    void card.offsetWidth;
    card.classList.add("is-open");
    syncOpenCardPosition();
    requestAnimationFrame(() => {
      if (!disposed && openId === id) syncOpenCardPosition();
    });
  }

  function closeCard({ animate = true } = {}) {
    if (!openId && !card.classList.contains("is-open")) return;
    openId = null;
    card.setAttribute("aria-hidden", "true");
    if (!animate) {
      clearCloseTimer();
      card.classList.remove("is-open", "is-closing");
      return;
    }
    card.classList.add("is-closing");
    card.classList.remove("is-open");
    clearCloseTimer();
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      if (disposed) return;
      card.classList.remove("is-closing");
    }, CLOSE_MS);
  }

  function handleTap(clientX, clientY) {
    if (disposed) return;
    const hit = pickInterest(clientX, clientY);
    if (!hit) {
      closeCard({ animate: true });
      return;
    }
    if (openId === hit.id) {
      closeCard({ animate: true });
      return;
    }
    openCard(hit.id);
  }

  function releaseCapture(pointerId) {
    if (pointerId == null) return;
    try {
      hitLayer.releasePointerCapture?.(pointerId);
    } catch {
      // ignore
    }
  }

  /**
   * Cancel pending/rotating gesture without tap. Keeps last valid visitor angles.
   */
  function cancelActiveGesture() {
    const pointerId = activeGesture?.pointerId;
    activeGesture = null;
    gestureMode = "idle";
    releaseCapture(pointerId);
  }

  function applyRotationForGesture(clientX, clientY) {
    if (!activeGesture?.interestId) return false;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      cancelActiveGesture();
      return false;
    }

    const entry = layer.getEntry(activeGesture.interestId);
    if (!entry?.userRotation || !entry.revealed) {
      cancelActiveGesture();
      return false;
    }

    const deltaX = clientX - activeGesture.startX;
    const deltaY = clientY - activeGesture.startY;
    const next = computeVisitorRotationFromDrag({
      startYaw: activeGesture.startYaw,
      startPitch: activeGesture.startPitch,
      deltaX,
      deltaY,
      sensitivity: rotationSensitivity,
    });
    if (!next) {
      cancelActiveGesture();
      return false;
    }

    const applied = applyVisitorRotationToGroup(
      THREE,
      entry.userRotation,
      next.yaw,
      next.pitch,
    );
    if (!applied) {
      cancelActiveGesture();
      return false;
    }

    visitorAngles.set(activeGesture.interestId, {
      yaw: next.yaw,
      pitch: next.pitch,
    });
    return true;
  }

  function finishGestureNormalize() {
    if (!activeGesture?.interestId) return;
    const id = activeGesture.interestId;
    const angles = visitorAngles.get(id);
    if (!angles) return;
    const yaw = normalizeYaw(angles.yaw);
    const pitch = angles.pitch;
    visitorAngles.set(id, { yaw, pitch });
    const entry = layer.getEntry(id);
    if (entry?.userRotation) {
      applyVisitorRotationToGroup(THREE, entry.userRotation, yaw, pitch);
    }
  }

  function onPointerDown(event) {
    if (disposed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.isPrimary === false) return;
    // One active pointer only — ignore additional pointers while a gesture is live.
    if (gestureMode !== "idle") return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

    const hit = pickInterest(event.clientX, event.clientY);
    const interestId = hit?.id ?? null;
    const angles = interestId ? getVisitorAngles(interestId) : { yaw: 0, pitch: 0 };

    activeGesture = {
      pointerId: event.pointerId,
      interestId,
      startX: event.clientX,
      startY: event.clientY,
      startYaw: angles.yaw,
      startPitch: angles.pitch,
    };
    gestureMode = "pending";

    try {
      hitLayer.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;
    if (gestureMode === "idle") return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      cancelActiveGesture();
      return;
    }

    const dx = event.clientX - activeGesture.startX;
    const dy = event.clientY - activeGesture.startY;
    const distance = Math.hypot(dx, dy);

    if (gestureMode === "pending") {
      if (distance < moveThresholdPx) return;
      // Lock as rotating only when a revealed interest was hit on pointerdown.
      if (!activeGesture.interestId) {
        // Drag on empty space: suppress tap, do not close/open cards.
        cancelActiveGesture();
        return;
      }
      gestureMode = "rotating";
      applyRotationForGesture(event.clientX, event.clientY);
      return;
    }

    if (gestureMode === "rotating") {
      applyRotationForGesture(event.clientX, event.clientY);
    }
  }

  function onPointerUp(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;

    const mode = gestureMode;
    const startX = activeGesture.startX;
    const startY = activeGesture.startY;
    const pointerId = activeGesture.pointerId;

    if (mode === "rotating") {
      finishGestureNormalize();
      activeGesture = null;
      gestureMode = "idle";
      releaseCapture(pointerId);
      return;
    }

    // pending → tap (existing card semantics). Never tap after rotating.
    activeGesture = null;
    gestureMode = "idle";
    releaseCapture(pointerId);
    if (mode === "pending") {
      handleTap(startX, startY);
    }
  }

  function onPointerCancel(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;
    cancelActiveGesture();
  }

  function onLostPointerCapture(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;
    if (gestureMode === "rotating") {
      finishGestureNormalize();
    }
    activeGesture = null;
    gestureMode = "idle";
  }

  const listenerOpts = { passive: true };
  hitLayer.addEventListener("pointerdown", onPointerDown, listenerOpts);
  hitLayer.addEventListener("pointermove", onPointerMove, listenerOpts);
  hitLayer.addEventListener("pointerup", onPointerUp, listenerOpts);
  hitLayer.addEventListener("pointercancel", onPointerCancel, listenerOpts);
  hitLayer.addEventListener("lostpointercapture", onLostPointerCapture, listenerOpts);

  if (domElement) {
    domElement.style.touchAction = "none";
  }

  return {
    hitLayer,
    getOpenId: () => openId,
    getGestureMode: () => gestureMode,
    getVisitorAngles: (id) => {
      const angles = getVisitorAngles(id);
      return { yaw: angles.yaw, pitch: angles.pitch };
    },
    open: openCard,
    close: closeCard,
    update: syncOpenCardPosition,
    handleTap,
    cancelActiveGesture,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelActiveGesture();
      clearCloseTimer();
      visitorAngles.clear();
      hitLayer.removeEventListener("pointerdown", onPointerDown, listenerOpts);
      hitLayer.removeEventListener("pointermove", onPointerMove, listenerOpts);
      hitLayer.removeEventListener("pointerup", onPointerUp, listenerOpts);
      hitLayer.removeEventListener("pointercancel", onPointerCancel, listenerOpts);
      hitLayer.removeEventListener("lostpointercapture", onLostPointerCapture, listenerOpts);
      hitLayer.remove();
      card.remove();
      if (container?.dataset?.arInterestInteractive) {
        delete container.dataset.arInterestInteractive;
      }
      openId = null;
    },
  };
}

export { CLOSE_MS, INTEREST_TAP_MOVE_THRESHOLD_PX as TAP_MOVE_THRESHOLD_PX };
