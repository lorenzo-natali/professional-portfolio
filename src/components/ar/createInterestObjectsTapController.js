import { getInterestObjectCard } from "./interestObjectsContent";

const TAP_MOVE_THRESHOLD_PX = 10;
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
 * Single reusable glass info card + tap picking for interest miniatures.
 *
 * @param {{
 *   THREE: typeof import("three"),
 *   layer: ReturnType<typeof import("./createInterestObjectsLayer").createInterestObjectsLayer>,
 *   camera: import("three").Camera,
 *   domElement: HTMLElement,
 *   container?: HTMLElement | null,
 *   shell?: HTMLElement | null,
 *   onInterestOpen?: (interestId: string) => void,
 * }} options
 */
export function createInterestObjectsTapController(options) {
  const THREE = options.THREE;
  const layer = options.layer;
  const camera = options.camera;
  const domElement = options.domElement;
  const onInterestOpen = options.onInterestOpen;
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
  /** @type {{ id: number, x: number, y: number } | null} */
  let pendingPointer = null;

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

  function pickInterest(clientX, clientY) {
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
    // Force layout so open transition runs from closed styles.
    void card.offsetWidth;
    card.classList.add("is-open");
    syncOpenCardPosition();
    try {
      onInterestOpen?.(id);
    } catch {
      // UI callbacks must not break picking.
    }
    // Second pass after content width settles.
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

  function onPointerDown(event) {
    if (disposed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.isPrimary === false) return;
    pendingPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      hitLayer.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(event) {
    if (!pendingPointer || pendingPointer.id !== event.pointerId) return;
    const dx = event.clientX - pendingPointer.x;
    const dy = event.clientY - pendingPointer.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
      pendingPointer = null;
    }
  }

  function onPointerUp(event) {
    if (!pendingPointer || pendingPointer.id !== event.pointerId) {
      pendingPointer = null;
      return;
    }
    const { x, y } = pendingPointer;
    pendingPointer = null;
    try {
      hitLayer.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    handleTap(x, y);
  }

  function onPointerCancel(event) {
    if (pendingPointer?.id === event.pointerId) pendingPointer = null;
    try {
      hitLayer.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  }

  const listenerOpts = { passive: true };
  hitLayer.addEventListener("pointerdown", onPointerDown, listenerOpts);
  hitLayer.addEventListener("pointermove", onPointerMove, listenerOpts);
  hitLayer.addEventListener("pointerup", onPointerUp, listenerOpts);
  hitLayer.addEventListener("pointercancel", onPointerCancel, listenerOpts);

  if (domElement) {
    domElement.style.touchAction = "none";
  }

  return {
    hitLayer,
    getOpenId: () => openId,
    open: openCard,
    close: closeCard,
    update: syncOpenCardPosition,
    handleTap,
    dispose() {
      if (disposed) return;
      disposed = true;
      clearCloseTimer();
      pendingPointer = null;
      hitLayer.removeEventListener("pointerdown", onPointerDown, listenerOpts);
      hitLayer.removeEventListener("pointermove", onPointerMove, listenerOpts);
      hitLayer.removeEventListener("pointerup", onPointerUp, listenerOpts);
      hitLayer.removeEventListener("pointercancel", onPointerCancel, listenerOpts);
      hitLayer.remove();
      card.remove();
      if (container?.dataset?.arInterestInteractive) {
        delete container.dataset.arInterestInteractive;
      }
      openId = null;
    },
  };
}

export { CLOSE_MS };
