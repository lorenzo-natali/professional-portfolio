import { INTEREST_OBJECTS } from "./interestObjectsConfig";

/**
 * Dev-only layout debugger for interest miniatures.
 * Enabled when import.meta.env.DEV and `?arInterestsDebug=1` (or AR_INTERESTS_DEBUG).
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
 *   0       show all at full opacity (already default in debug)
 *
 * @param {Awaited<ReturnType<import("./createInterestObjectsLayer").createInterestObjectsLayer>>} layer
 * @param {{ enabled?: boolean, ids?: string[] }} [options]
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

  const ids =
    options.ids ??
    layer.entries.map((entry) => entry.id) ??
    INTEREST_OBJECTS.map((item) => item.id);

  let selectedIndex = 0;
  const stepPos = 0.008;
  const stepRot = 0.05;
  const stepHeight = 0.004;

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

  function onKeyDown(event) {
    if (!enabled) return;
    const key = event.key;

    if (key >= "1" && key <= "9") {
      selectByIndex(Number(key) - 1);
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

  window.addEventListener("keydown", onKeyDown);
  // Expose a tiny console API for transferring values into config.
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
    setPosition: (patch) => layer.applyPoseEdit(selectedId(), { position: patch }),
    setRotation: (patch) => layer.applyPoseEdit(selectedId(), { rotation: patch }),
    setOrigin: (patch) => layer.applyPoseEdit(selectedId(), { origin: patch }),
    setTargetHeight: (value) => layer.applyPoseEdit(selectedId(), { targetSize: value }),
    setTargetSize: (value) => layer.applyPoseEdit(selectedId(), { targetSize: value }),
    getSelected: () => layer.getConfigSnapshot(selectedId()),
    getAll: () => ids.map((id) => layer.getConfigSnapshot(id)),
  };

  console.info(
    [
      "[ar-interests-debug] enabled",
      "Keys: 1–6 select · arrows/[ ] position · q/e/r/f/t/g rotate · z/x scale · p/o print",
      "API: window.__arInterestsDebug",
    ].join("\n"),
  );
  selectByIndex(0);

  return {
    enabled: true,
    getSelectedId: selectedId,
    printSelected,
    printAll,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
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
