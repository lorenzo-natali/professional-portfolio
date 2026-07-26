import { INTEREST_OBJECTS } from "./interestObjectsConfig";
import {
  createDocumentPlane,
  DOCUMENT_HEIGHT,
  DOCUMENT_WIDTH,
} from "./arDocumentPlane";

/**
 * Dev-only layout debugger for interest miniatures.
 * Enabled when import.meta.env.DEV and `?arInterestsDebug=1` (or AR_INTERESTS_DEBUG).
 *
 * Visual overlays (when THREE + hierarchy provided):
 *   - exact CV/marker rectangle
 *   - local XYZ axes
 *   - per-object AABB + pivot
 *   - hierarchy / matrix dump via window.__arInterestsDebug
 *
 * Controls:
 *   1–6     select object
 *   arrows  nudge position x/y
 *   [ ]     nudge position z
 *   q/e     rotate Y
 *   r/f     rotate X
 *   t/g     rotate Z
 *   z/x     scale target height down/up
 *   p       print selected config to console
 *   o       print all configs to console
 *   m       print live anchor/presentation matrices
 *
 * @param {ReturnType<typeof import("./createInterestObjectsLayer").createInterestObjectsLayer>} layer
 * @param {{
 *   enabled?: boolean,
 *   ids?: string[],
 *   THREE?: typeof import("three"),
 *   rawAnchor?: import("three").Object3D,
 *   presentation?: import("three").Object3D,
 *   poseStabilizer?: { getState?: () => object },
 * }} [options]
 */
export function createInterestObjectsDebug(layer, options = {}) {
  const enabled = Boolean(options.enabled);
  if (!enabled) {
    return {
      enabled: false,
      dispose() {},
      getSelectedId: () => null,
      printSelected() {},
      printAll() {},
    };
  }

  const THREE = options.THREE ?? null;
  const rawAnchor = options.rawAnchor ?? null;
  const presentation = options.presentation ?? null;
  const poseStabilizer = options.poseStabilizer ?? null;
  const plane = layer.plane ?? createDocumentPlane();

  const ids =
    options.ids ??
    layer.entries.map((entry) => entry.id) ??
    INTEREST_OBJECTS.map((item) => item.id);

  let selectedIndex = 0;
  const stepPos = 0.008;
  const stepRot = 0.05;
  const stepHeight = 0.004;

  /** @type {import("three").Object3D[]} */
  const helpers = [];
  /** @type {Map<string, import("three").Box3Helper>} */
  const bboxHelpers = new Map();
  /** @type {Map<string, import("three").Object3D>} */
  const pivotHelpers = new Map();
  let raf = 0;

  function selectedId() {
    return ids[selectedIndex] ?? null;
  }

  function selectByIndex(index) {
    if (index < 0 || index >= ids.length) return;
    selectedIndex = index;
    const id = selectedId();
    console.info(`[ar-interests-debug] selected ${id} (${selectedIndex + 1}/${ids.length})`);
  }

  function printSelected() {
    const snap = layer.getConfigSnapshot(selectedId());
    console.info("[ar-interests-debug] selected config:\n", JSON.stringify(snap, null, 2));
  }

  function printAll() {
    const snaps = ids.map((id) => layer.getConfigSnapshot(id)).filter(Boolean);
    console.info("[ar-interests-debug] all configs:\n", JSON.stringify(snaps, null, 2));
  }

  function matrixSummary(object) {
    if (!object) return null;
    const e = object.matrix.elements;
    return {
      name: object.name,
      parent: object.parent?.name ?? null,
      matrixAutoUpdate: object.matrixAutoUpdate,
      m: e.map((v) => Number(v.toFixed(4))),
    };
  }

  function printHierarchy() {
    const payload = {
      documentPlane: {
        width: DOCUMENT_WIDTH,
        height: DOCUMENT_HEIGHT,
        left: plane.left,
        right: plane.right,
        top: plane.top,
        bottom: plane.bottom,
      },
      hierarchy: [
        "MindAR anchor.group (raw)",
        "→ ar-interest-objects-presentation",
        "→ ar-interest-objects-placement",
        "→ ar-interest:<id> → entrance → content",
      ],
      rawAnchor: matrixSummary(rawAnchor),
      presentation: matrixSummary(presentation),
      placementParent: layer.placement?.parent?.name ?? null,
      stabilizer: poseStabilizer?.getState?.() ?? null,
      objects: ids.map((id) => {
        const entry = layer.getEntry?.(id);
        const snap = layer.getConfigSnapshot(id);
        if (!entry || !THREE) return snap;
        entry.root.updateMatrixWorld(true);
        const box = new THREE.Box3();
        if (entry.content) box.setFromObject(entry.content);
        else box.setFromObject(entry.root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const uv = plane.toTopLeftFromWorld(entry.root.position.x, entry.root.position.y);
        return {
          ...snap,
          localRoot: {
            x: Number(entry.root.position.x.toFixed(4)),
            y: Number(entry.root.position.y.toFixed(4)),
            z: Number(entry.root.position.z.toFixed(4)),
          },
          uv,
          bbox: {
            min: box.min.toArray().map((v) => Number(v.toFixed(4))),
            max: box.max.toArray().map((v) => Number(v.toFixed(4))),
            size: size.toArray().map((v) => Number(v.toFixed(4))),
            center: center.toArray().map((v) => Number(v.toFixed(4))),
          },
          outsidePlane:
            box.min.x < plane.left - 1e-3 ||
            box.max.x > plane.right + 1e-3 ||
            box.min.y < plane.bottom - 1e-3 ||
            box.max.y > plane.top + 1e-3,
        };
      }),
    };
    console.info("[ar-interests-debug] hierarchy / matrices:\n", payload);
    return payload;
  }

  function mountVisualHelpers() {
    if (!THREE || !layer.placement) return;

    const frameGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(plane.left, plane.bottom, 0.001),
      new THREE.Vector3(plane.right, plane.bottom, 0.001),
      new THREE.Vector3(plane.right, plane.top, 0.001),
      new THREE.Vector3(plane.left, plane.top, 0.001),
      new THREE.Vector3(plane.left, plane.bottom, 0.001),
    ]);
    const frame = new THREE.Line(
      frameGeo,
      new THREE.LineBasicMaterial({ color: 0x5ec8d6, depth: 0.95 }),
    );
    frame.name = "ar-interest-debug-cv-frame";
    frame.renderOrder = 20;
    layer.placement.add(frame);
    helpers.push(frame);

    const axes = new THREE.AxesHelper(0.18);
    axes.name = "ar-interest-debug-axes";
    axes.position.set(plane.left + 0.02, plane.bottom + 0.02, 0.02);
    layer.placement.add(axes);
    helpers.push(axes);

    const originDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffcc66 }),
    );
    originDot.name = "ar-interest-debug-origin";
    originDot.position.set(0, 0, 0.02);
    layer.placement.add(originDot);
    helpers.push(originDot);

    ids.forEach((id) => {
      const entry = layer.getEntry?.(id);
      if (!entry) return;

      const box = new THREE.Box3(new THREE.Vector3(-0.01, -0.01, 0), new THREE.Vector3(0.01, 0.01, 0.02));
      const helper = new THREE.Box3Helper(box, 0xf59e0b);
      helper.name = `ar-interest-debug-bbox:${id}`;
      helper.visible = false;
      layer.placement.add(helper);
      bboxHelpers.set(id, helper);
      helpers.push(helper);

      const pivot = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff6b6b }),
      );
      pivot.name = `ar-interest-debug-pivot:${id}`;
      entry.root.add(pivot);
      pivotHelpers.set(id, pivot);
      helpers.push(pivot);
    });
  }

  function refreshVisualHelpers() {
    if (!THREE) return;
    ids.forEach((id) => {
      const entry = layer.getEntry?.(id);
      const helper = bboxHelpers.get(id);
      if (!entry || !helper) return;
      if (!entry.content) {
        helper.visible = false;
        return;
      }
      entry.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(entry.content);
      helper.box.copy(box);
      helper.visible = true;
      helper.updateMatrixWorld(true);
    });
  }

  function tick() {
    refreshVisualHelpers();
    raf = requestAnimationFrame(tick);
  }

  function onKeyDown(event) {
    if (!enabled) return;
    const key = event.key;

    if (key >= "1" && key <= "9") {
      selectByIndex(Number(key) - 1);
      event.preventDefault();
      return;
    }

    if (key === "m") {
      printHierarchy();
      event.preventDefault();
      return;
    }

    const id = selectedId();
    if (!id) return;
    const snap = layer.getConfigSnapshot(id);
    if (!snap) return;

    switch (key) {
      case "ArrowLeft":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, x: snap.position.x - stepPos },
        });
        event.preventDefault();
        break;
      case "ArrowRight":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, x: snap.position.x + stepPos },
        });
        event.preventDefault();
        break;
      case "ArrowUp":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, y: snap.position.y + stepPos },
        });
        event.preventDefault();
        break;
      case "ArrowDown":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, y: snap.position.y - stepPos },
        });
        event.preventDefault();
        break;
      case "[":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, z: snap.position.z - stepPos },
        });
        event.preventDefault();
        break;
      case "]":
        layer.applyPoseEdit(id, {
          position: { ...snap.position, z: snap.position.z + stepPos },
        });
        event.preventDefault();
        break;
      case "q":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, y: snap.rotation.y + stepRot },
        });
        break;
      case "e":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, y: snap.rotation.y - stepRot },
        });
        break;
      case "r":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, x: snap.rotation.x + stepRot },
        });
        break;
      case "f":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, x: snap.rotation.x - stepRot },
        });
        break;
      case "t":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, z: snap.rotation.z + stepRot },
        });
        break;
      case "g":
        layer.applyPoseEdit(id, {
          rotation: { ...snap.rotation, z: snap.rotation.z - stepRot },
        });
        break;
      case "z":
        layer.applyPoseEdit(id, {
          targetSize: Math.max(0.02, (snap.targetSize ?? snap.targetHeight) - stepHeight),
        });
        break;
      case "x":
        layer.applyPoseEdit(id, {
          targetSize: (snap.targetSize ?? snap.targetHeight) + stepHeight,
        });
        break;
      case "p":
        printSelected();
        break;
      case "o":
        printAll();
        break;
      default:
        break;
    }
  }

  mountVisualHelpers();
  window.addEventListener("keydown", onKeyDown);
  raf = requestAnimationFrame(tick);

  window.__arInterestsDebug = {
    select: (idOrIndex) => {
      if (typeof idOrIndex === "number") {
        selectByIndex(idOrIndex);
        return;
      }
      const idx = ids.indexOf(idOrIndex);
      if (idx >= 0) selectByIndex(idx);
    },
    print: printSelected,
    printAll,
    printHierarchy,
    setPosition: (patch) => layer.applyPoseEdit(selectedId(), { position: patch }),
    setRotation: (patch) => layer.applyPoseEdit(selectedId(), { rotation: patch }),
    setOrigin: (patch) => layer.applyPoseEdit(selectedId(), { origin: patch }),
    setTargetHeight: (value) => layer.applyPoseEdit(selectedId(), { targetSize: value }),
    setTargetSize: (value) => layer.applyPoseEdit(selectedId(), { targetSize: value }),
    getSelected: () => layer.getConfigSnapshot(selectedId()),
    getAll: () => ids.map((id) => layer.getConfigSnapshot(id)),
    getHierarchy: printHierarchy,
  };

  console.info(
    [
      "[ar-interests-debug] enabled",
      "Keys: 1–6 select · arrows/[ ] position · q/e/r/f/t/g rotate · z/x scale · p/o print · m hierarchy",
      "API: window.__arInterestsDebug",
    ].join("\n"),
  );
  selectByIndex(0);
  printHierarchy();

  return {
    enabled: true,
    getSelectedId: selectedId,
    printSelected,
    printAll,
    printHierarchy,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      helpers.forEach((helper) => {
        helper.removeFromParent?.();
        helper.geometry?.dispose?.();
        if (Array.isArray(helper.material)) helper.material.forEach((m) => m.dispose?.());
        else helper.material?.dispose?.();
      });
      helpers.length = 0;
      bboxHelpers.clear();
      pivotHelpers.clear();
      if (window.__arInterestsDebug) {
        delete window.__arInterestsDebug;
      }
    },
  };
}

/**
 * True only in Vite DEV when the debug query/flag is set.
 * Tree-shaken away from production when callers gate on import.meta.env.DEV.
 */
export function isInterestObjectsDebugEnabled({
  search = typeof window !== "undefined" ? window.location.search : "",
  forceFlag = false,
} = {}) {
  if (forceFlag) return true;
  try {
    const params = new URLSearchParams(search);
    return params.get("arInterestsDebug") === "1";
  } catch {
    return false;
  }
}
