import { createDocumentPlane } from "./arDocumentPlane";
import { createAnchorProofObject } from "./createAnchorProofObject";
import {
  applyInterestLayoutToLayer,
  buildInterestLayoutFromLayer,
  getProductionInterestLayout,
  loadInterestLayoutFromStorage,
  saveInterestLayoutToStorage,
} from "./interestObjectsCalibrateStorage";
import {
  CALIBRATE_DRAG_THRESHOLD_PX,
  clientToNdc,
  displayYawFromTwist,
  findInterestRootFromObject,
  intersectPlacementDocument,
  placementFromHitWithOffset,
  pointerAngle,
  pointerDistance,
  softClampPlacementUv,
  targetSizeFromPinch,
  touchOffsetFromHit,
} from "./interestObjectsCalibrateMath";

export {
  AR_INTEREST_FINAL_LAYOUT_STORAGE_KEY,
  isInterestObjectsCalibrateEnabled,
  getProductionInterestLayout,
  buildInterestLayoutFromLayer,
  loadInterestLayoutFromStorage,
  saveInterestLayoutToStorage,
} from "./interestObjectsCalibrateStorage";

export {
  findInterestRootFromObject,
  placementFromHitWithOffset,
  targetSizeFromPinch,
  displayYawFromTwist,
  softClampPlacementUv,
  touchOffsetFromHit,
} from "./interestObjectsCalibrateMath";

/**
 * DEV touch calibration for interest miniatures on the CV.
 * Enable with `?arInterestsCalibrate=1`. Does not affect normal runtime.
 *
 * @param {{
 *   THREE: typeof import("three"),
 *   layer: ReturnType<typeof import("./createInterestObjectsLayer").createInterestObjectsLayer>,
 *   camera: import("three").Camera,
 *   domElement: HTMLElement,
 *   shell?: HTMLElement | null,
 *   presentation?: import("three").Object3D | null,
 * }} options
 */
export function createInterestObjectsCalibrate(options) {
  const THREE = options.THREE;
  const layer = options.layer;
  const camera = options.camera;
  const domElement = options.domElement;
  const shell = options.shell ?? null;

  const plane = layer.plane ?? createDocumentPlane();
  const raycaster = new THREE.Raycaster();
  const scratchPlane = new THREE.Plane();
  const scratchHit = new THREE.Vector3();
  const ndc = new THREE.Vector2();

  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();
  /** @type {"idle"|"pending"|"drag"|"pinch"} */
  let mode = "idle";
  let selectedId = /** @type {string | null} */ (null);
  let disposed = false;
  let uiHidden = false;
  let dragOffset = { u: 0, vTop: 0 };
  let downX = 0;
  let downY = 0;
  let pinchStartDistance = 1;
  let pinchStartSize = 0.1;
  let twistStartAngle = 0;
  let twistStartYaw = 0;
  let saveFlashTimer = 0;
  let overflow = false;

  /** @type {import("three").Object3D | null} */
  let cvFrame = null;
  /** @type {import("three").Box3Helper | null} */
  let selectionHelper = null;
  const selectionBox = new THREE.Box3();

  // Restore DEV layout (does not run in normal runtime — only when this factory is called).
  const stored = loadInterestLayoutFromStorage();
  if (stored) applyInterestLayoutToLayer(layer, stored);

  // CV border under the interest placement (local document space).
  cvFrame = createAnchorProofObject(THREE);
  cvFrame.name = "ar-interest-calibrate-cv-frame";
  layer.placement.add(cvFrame);

  selectionHelper = new THREE.Box3Helper(selectionBox, 0xfbbf24);
  selectionHelper.name = "ar-interest-calibrate-selection";
  selectionHelper.visible = false;
  layer.placement.add(selectionHelper);

  // --- HUD -----------------------------------------------------------------
  const hud = document.createElement("div");
  hud.dataset.arInterestsCalibrateUi = "true";
  hud.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:40",
    "pointer-events:none",
    "font:12px/1.35 ui-sans-serif, system-ui, -apple-system, sans-serif",
    "color:#f8fafc",
  ].join(";");

  const topBar = document.createElement("div");
  topBar.style.cssText =
    "position:absolute;left:0;right:0;top:0;padding:max(0.55rem,env(safe-area-inset-top)) 0.75rem 0.4rem;display:flex;flex-direction:column;align-items:center;gap:0.25rem;";
  const selectedLabel = document.createElement("div");
  selectedLabel.style.cssText =
    "pointer-events:none;padding:0.3rem 0.65rem;border-radius:999px;background:rgba(2,6,23,0.55);backdrop-filter:blur(6px);font-weight:600;letter-spacing:0.04em;";
  selectedLabel.textContent = "Nessun oggetto selezionato";
  const hint = document.createElement("div");
  hint.style.cssText =
    "pointer-events:none;max-width:22rem;text-align:center;padding:0.25rem 0.5rem;color:#cbd5e1;font-size:11px;";
  hint.textContent = "Tap to select · Drag to move · Pinch to resize · Twist to rotate";
  topBar.appendChild(selectedLabel);
  topBar.appendChild(hint);
  hud.appendChild(topBar);

  const bottomBar = document.createElement("div");
  bottomBar.style.cssText = [
    "position:absolute",
    "left:0",
    "right:0",
    // Sit above the normal Close chip so it stays tappable.
    "bottom:calc(3.1rem + env(safe-area-inset-bottom))",
    "padding:0.5rem 0.75rem",
    "display:flex",
    "flex-wrap:wrap",
    "justify-content:center",
    "gap:0.45rem",
    "pointer-events:none",
  ].join(";");

  function makeButton(label, primary = false) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = [
      "pointer-events:auto",
      "border:1px solid rgba(148,163,184,0.45)",
      "border-radius:999px",
      "padding:0.55rem 0.85rem",
      "background:" + (primary ? "rgba(14,116,144,0.92)" : "rgba(2,6,23,0.62)"),
      "color:#f8fafc",
      "font:inherit",
      "font-weight:600",
      "backdrop-filter:blur(6px)",
    ].join(";");
    return btn;
  }

  const resetSelectedBtn = makeButton("Reset selected");
  const resetAllBtn = makeButton("Reset all");
  const saveBtn = makeButton("Save final layout", true);
  const hideUiBtn = makeButton("Hide UI");
  const status = document.createElement("div");
  status.style.cssText =
    "width:100%;text-align:center;pointer-events:none;min-height:1.1rem;color:#86efac;font-size:11px;";
  bottomBar.appendChild(resetSelectedBtn);
  bottomBar.appendChild(resetAllBtn);
  bottomBar.appendChild(saveBtn);
  bottomBar.appendChild(hideUiBtn);
  bottomBar.appendChild(status);
  hud.appendChild(bottomBar);

  const host = shell || domElement.parentElement || document.body;
  host.appendChild(hud);

  function setStatus(message, ms = 2200) {
    status.textContent = message;
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    if (ms > 0) {
      saveFlashTimer = window.setTimeout(() => {
        status.textContent = "";
      }, ms);
    }
  }

  function updateSelectedLabel() {
    selectedLabel.textContent = selectedId
      ? selectedId
      : "Nessun oggetto selezionato";
    if (cvFrame) {
      const mat = /** @type {any} */ (
        cvFrame.getObjectByName("ar-anchor-proof-frame")?.material
      );
      if (mat) mat.color?.setHex?.(overflow ? 0xf87171 : 0x67e8f9);
    }
  }

  function refreshSelectionHelper() {
    if (!selectionHelper) return;
    if (!selectedId) {
      selectionHelper.visible = false;
      return;
    }
    const entry = layer.getEntry(selectedId);
    if (!entry?.root) {
      selectionHelper.visible = false;
      return;
    }
    entry.root.updateMatrixWorld(true);
    layer.placement.updateMatrixWorld(true);
    selectionBox.setFromObject(entry.root);
    selectionHelper.box.copy(selectionBox);
    selectionHelper.updateMatrixWorld(true);
    selectionHelper.visible = true;

    // Soft overflow signal in placement/document local space.
    const inv = new THREE.Matrix4().copy(layer.placement.matrixWorld).invert();
    const localBox = selectionBox.clone().applyMatrix4(inv);
    overflow =
      localBox.min.x < plane.left - 0.02 ||
      localBox.max.x > plane.right + 0.02 ||
      localBox.min.y < plane.bottom - 0.02 ||
      localBox.max.y > plane.top + 0.02;
    updateSelectedLabel();
  }

  function persistDraft() {
    const layout = buildInterestLayoutFromLayer(layer);
    saveInterestLayoutToStorage(layout);
    return layout;
  }

  function raycastInterest(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    const coords = clientToNdc(clientX, clientY, rect);
    ndc.set(coords.x, coords.y);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    layer.entries.forEach((entry) => {
      if (!entry.content) return;
      entry.content.traverse((node) => {
        if (node.isMesh) meshes.push(node);
      });
    });
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;
    return findInterestRootFromObject(hits[0].object);
  }

  function documentUvAtClient(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    const coords = clientToNdc(clientX, clientY, rect);
    ndc.set(coords.x, coords.y);
    raycaster.setFromCamera(ndc, camera);
    layer.placement.updateMatrixWorld(true);
    const local = intersectPlacementDocument(
      THREE,
      raycaster,
      layer.placement,
      scratchPlane,
      scratchHit,
    );
    if (!local) return null;
    return plane.toTopLeftFromWorldUnclamped(local.x, local.y);
  }

  function selectInterest(id) {
    selectedId = id;
    updateSelectedLabel();
    refreshSelectionHelper();
  }

  function clearSelection() {
    selectedId = null;
    overflow = false;
    updateSelectedLabel();
    refreshSelectionHelper();
  }

  function applyOrigin(id, u, vTop) {
    layer.applyPoseEdit(id, { origin: { u, vTop } });
    // Clear legacy paper nudge so UV is the sole placement authority.
    layer.applyPoseEdit(id, { position: { x: 0, y: 0 } });
  }

  // --- Pointer gestures ----------------------------------------------------
  function onPointerDown(event) {
    if (disposed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      domElement.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }

    if (pointers.size === 1) {
      mode = "pending";
      downX = event.clientX;
      downY = event.clientY;
      return;
    }

    if (pointers.size >= 2) {
      beginPinchTwist();
    }
  }

  function beginPinchTwist() {
    if (!selectedId) {
      mode = "idle";
      return;
    }
    const pts = [...pointers.values()];
    if (pts.length < 2) return;
    mode = "pinch";
    const [a, b] = pts;
    pinchStartDistance = Math.max(pointerDistance(a, b), 1);
    twistStartAngle = pointerAngle(a, b);
    const snap = layer.getConfigSnapshot(selectedId);
    pinchStartSize = snap?.targetSize ?? 0.1;
    twistStartYaw = snap?.displayYaw ?? 0;
  }

  function onPointerMove(event) {
    if (disposed || !pointers.has(event.pointerId)) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      if (mode !== "pinch") beginPinchTwist();
      if (mode === "pinch" && selectedId) {
        const [a, b] = [...pointers.values()];
        const dist = pointerDistance(a, b);
        const angle = pointerAngle(a, b);
        const nextSize = targetSizeFromPinch(pinchStartDistance, dist, pinchStartSize);
        const nextYaw = displayYawFromTwist(twistStartAngle, angle, twistStartYaw);
        layer.applyPoseEdit(selectedId, { targetSize: nextSize, displayYaw: nextYaw });
        refreshSelectionHelper();
      }
      return;
    }

    if (pointers.size === 1 && (mode === "pending" || mode === "drag")) {
      const point = pointers.get(event.pointerId);
      if (!point) return;
      const moved = Math.hypot(point.x - downX, point.y - downY);
      if (mode === "pending" && moved >= CALIBRATE_DRAG_THRESHOLD_PX) {
        if (!selectedId) {
          mode = "idle";
          return;
        }
        const hitUv = documentUvAtClient(point.x, point.y);
        const snap = layer.getConfigSnapshot(selectedId);
        if (!hitUv || !snap) {
          mode = "idle";
          return;
        }
        dragOffset = touchOffsetFromHit(
          { u: snap.origin.u, vTop: snap.origin.vTop },
          hitUv,
        );
        mode = "drag";
      }
      if (mode === "drag" && selectedId) {
        const hitUv = documentUvAtClient(point.x, point.y);
        if (!hitUv) return;
        const next = placementFromHitWithOffset(hitUv, dragOffset);
        applyOrigin(selectedId, next.u, next.vTop);
        refreshSelectionHelper();
      }
    }
  }

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const wasPending = mode === "pending" && pointers.size === 1;
    const wasDrag = mode === "drag";
    pointers.delete(event.pointerId);
    try {
      domElement.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }

    if (wasPending && pointers.size === 0) {
      const hit = raycastInterest(event.clientX, event.clientY);
      if (hit) selectInterest(hit.id);
      else clearSelection();
      mode = "idle";
      persistDraft();
      return;
    }

    if (wasDrag && selectedId && pointers.size === 0) {
      const snap = layer.getConfigSnapshot(selectedId);
      if (snap) {
        const clamped = softClampPlacementUv({
          u: snap.origin.u,
          vTop: snap.origin.vTop,
        });
        applyOrigin(selectedId, clamped.u, clamped.vTop);
        refreshSelectionHelper();
      }
      persistDraft();
      mode = "idle";
      return;
    }

    if (pointers.size >= 2) {
      beginPinchTwist();
      return;
    }

    if (pointers.size === 1) {
      // Transition 2→1: stop pinch; do not auto-resume drag.
      mode = "idle";
      persistDraft();
      return;
    }

    if (mode === "pinch") {
      persistDraft();
    }
    mode = "idle";
  }

  function onPointerCancel(event) {
    pointers.delete(event.pointerId);
    mode = "idle";
    try {
      domElement.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    persistDraft();
  }

  const listenerOpts = { passive: false };
  domElement.addEventListener("pointerdown", onPointerDown, listenerOpts);
  domElement.addEventListener("pointermove", onPointerMove, listenerOpts);
  domElement.addEventListener("pointerup", endPointer, listenerOpts);
  domElement.addEventListener("pointercancel", onPointerCancel, listenerOpts);
  domElement.addEventListener("lostpointercapture", endPointer, listenerOpts);
  domElement.style.touchAction = "none";
  domElement.style.pointerEvents = "auto";

  // Re-apply layout size when late models finish loading.
  const onItemLoaded = (id) => {
    const layout = loadInterestLayoutFromStorage();
    if (!layout?.[id]) return;
    layer.applyPoseEdit(id, {
      origin: { u: layout[id].placement.u, vTop: layout[id].placement.v },
      displayYaw: layout[id].displayYaw,
      targetSize: layout[id].targetSize,
      displayTilt: layout[id].displayTilt,
      groundOffset: layout[id].groundOffset,
    });
    if (id === selectedId) refreshSelectionHelper();
  };

  resetSelectedBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedId) return;
    const item = getProductionInterestLayout()[selectedId];
    layer.applyPoseEdit(selectedId, {
      origin: { u: item.placement.u, vTop: item.placement.v },
      displayYaw: item.displayYaw,
      targetSize: item.targetSize,
      displayTilt: item.displayTilt,
      groundOffset: item.groundOffset,
    });
    persistDraft();
    refreshSelectionHelper();
    setStatus(`Reset ${selectedId}`);
  });

  resetAllBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyInterestLayoutToLayer(layer, getProductionInterestLayout());
    persistDraft();
    clearSelection();
    setStatus("Reset all");
  });

  saveBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const layout = persistDraft();
    const text = JSON.stringify(layout, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Layout salvato e configurazione copiata", 3200);
    } catch {
      console.info("[ar-interests-calibrate] final layout\n", text);
      setStatus("Layout salvato (copia manuale: vedi console)", 3200);
    }
    window.__arInterestsCalibrateLayout = layout;
  });

  hideUiBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    uiHidden = !uiHidden;
    topBar.style.display = uiHidden ? "none" : "flex";
    resetSelectedBtn.style.display = uiHidden ? "none" : "";
    resetAllBtn.style.display = uiHidden ? "none" : "";
    saveBtn.style.display = uiHidden ? "none" : "";
    hideUiBtn.textContent = uiHidden ? "Show UI" : "Hide UI";
  });

  let raf = 0;
  const tick = () => {
    if (disposed) return;
    refreshSelectionHelper();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  updateSelectedLabel();
  window.__arInterestsCalibrate = {
    select: selectInterest,
    clearSelection,
    getSelectedId: () => selectedId,
    persist: persistDraft,
    exportLayout: () => buildInterestLayoutFromLayer(layer),
    onItemLoaded,
  };

  return {
    enabled: true,
    onItemLoaded,
    getSelectedId: () => selectedId,
    persistDraft,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      if (saveFlashTimer) clearTimeout(saveFlashTimer);
      domElement.removeEventListener("pointerdown", onPointerDown, listenerOpts);
      domElement.removeEventListener("pointermove", onPointerMove, listenerOpts);
      domElement.removeEventListener("pointerup", endPointer, listenerOpts);
      domElement.removeEventListener("pointercancel", onPointerCancel, listenerOpts);
      domElement.removeEventListener("lostpointercapture", endPointer, listenerOpts);
      pointers.clear();
      hud.remove();
      selectionHelper?.removeFromParent?.();
      selectionHelper?.geometry?.dispose?.();
      selectionHelper?.material?.dispose?.();
      selectionHelper = null;
      cvFrame?.removeFromParent?.();
      cvFrame?.traverse?.((node) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose?.());
        else node.material?.dispose?.();
      });
      cvFrame = null;
      if (window.__arInterestsCalibrate) delete window.__arInterestsCalibrate;
    },
  };
}
