import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import { disposeObject3DResources } from "./arLabelTexture";
import {
  INTEREST_OBJECTS,
  INTEREST_ENTRANCE,
} from "./interestObjectsConfig";
import {
  loadInterestGlb,
  seatInterestContent,
  setInterestOpacity,
} from "./loadInterestGlb";

/**
 * Sync mount of interest placeholders + background sequential GLB loading.
 *
 * Hierarchy per object:
 *   root (UV + position on document plane)
 *     └─ entrance (fade / grow / rise along Z)
 *          └─ content (oriented, scaled, seated min Z = 0)
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   items?: typeof INTEREST_OBJECTS,
 *   onItemLoaded?: (id: string) => void,
 *   onProgress?: (loaded: number, total: number, id: string) => void,
 * }} [options]
 */
export function createInterestObjectsLayer(THREE, options = {}) {
  const items = options.items ?? INTEREST_OBJECTS;
  const plane = createDocumentPlane();
  let disposed = false;
  let loadGeneration = 0;
  /** @type {Promise<void> | null} */
  let loadPromise = null;

  const placement = new THREE.Group();
  placement.name = "ar-interest-objects-placement";
  placement.userData.kind = "ar-interest-objects";
  placement.userData.documentPlane = plane;
  placement.visible = false;

  /** @type {Array<{
   *   id: string,
   *   config: (typeof INTEREST_OBJECTS)[number],
   *   root: import("three").Group,
   *   entrance: import("three").Group,
   *   content: import("three").Object3D | null,
   *   bounds: object | null,
   *   baseTargetSize: number,
   *   loaded: boolean,
   *   revealed: boolean,
   * }>} */
  const entries = [];

  for (const source of items) {
    const config = {
      ...source,
      origin: { ...source.origin },
      position: { ...source.position },
      rotation: { ...source.rotation },
      upright: { ...source.upright },
    };

    const world = plane.toWorldFromTopLeft(
      config.origin.u,
      config.origin.vTop,
      DOCUMENT_PLANE_Z + config.position.z,
    );

    const root = new THREE.Group();
    root.name = `ar-interest:${config.id}`;
    root.userData.interestId = config.id;
    root.userData.group = config.group;
    root.position.set(
      world.x + config.position.x,
      world.y + config.position.y,
      world.z,
    );
    placement.add(root);

    const entrance = new THREE.Group();
    entrance.name = `ar-interest-entrance:${config.id}`;
    entrance.position.z = INTEREST_ENTRANCE.riseFromZ;
    entrance.scale.setScalar(INTEREST_ENTRANCE.startScale);
    root.add(entrance);

    entries.push({
      id: config.id,
      config,
      root,
      entrance,
      content: null,
      bounds: null,
      baseTargetSize: config.targetSize,
      loaded: false,
      revealed: false,
    });
  }

  function syncRootPosition(entry) {
    const world = plane.toWorldFromTopLeft(
      entry.config.origin.u,
      entry.config.origin.vTop,
      DOCUMENT_PLANE_Z + entry.config.position.z,
    );
    entry.root.position.set(
      world.x + entry.config.position.x,
      world.y + entry.config.position.y,
      world.z,
    );
  }

  function setVisible(visible) {
    placement.visible = Boolean(visible);
  }

  function applyEntranceProgress(id, progress) {
    const entry = entries.find((item) => item.id === id);
    if (!entry?.content) return;
    const t = Math.min(1, Math.max(0, progress));
    const eased = 1 - (1 - t) ** 3;
    const { riseFromZ, startScale, endScale } = INTEREST_ENTRANCE;
    entry.entrance.position.z = riseFromZ * (1 - eased);
    entry.entrance.position.y = 0;
    entry.entrance.scale.setScalar(startScale + (endScale - startScale) * eased);
    setInterestOpacity(entry.content, eased);
    if (t >= 1) entry.revealed = true;
  }

  function resetVisualState() {
    entries.forEach((entry) => {
      entry.entrance.position.z = INTEREST_ENTRANCE.riseFromZ;
      entry.entrance.position.y = 0;
      entry.entrance.scale.setScalar(INTEREST_ENTRANCE.startScale);
      entry.revealed = false;
      if (entry.content) setInterestOpacity(entry.content, 0);
    });
    placement.visible = false;
  }

  function applyPoseEdit(id, patch = {}) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return null;

    if (patch.position) {
      entry.config.position = { ...entry.config.position, ...patch.position };
      syncRootPosition(entry);
    }
    if (patch.origin) {
      entry.config.origin = { ...entry.config.origin, ...patch.origin };
      syncRootPosition(entry);
    }
    if (patch.rotation && entry.content) {
      entry.config.rotation = { ...entry.config.rotation, ...patch.rotation };
      entry.content.rotation.set(
        entry.config.rotation.x,
        entry.config.rotation.y,
        entry.config.rotation.z,
      );
      seatInterestContent(THREE, entry.content);
    }
    if (typeof patch.targetSize === "number" && patch.targetSize > 0 && entry.content) {
      const ratio = patch.targetSize / entry.baseTargetSize;
      entry.config.targetSize = patch.targetSize;
      entry.content.scale.setScalar(ratio);
      seatInterestContent(THREE, entry.content);
    }
    // Back-compat alias used by debug.
    if (typeof patch.targetHeight === "number" && patch.targetHeight > 0) {
      return applyPoseEdit(id, { targetSize: patch.targetHeight });
    }
    return getConfigSnapshot(id);
  }

  function getConfigSnapshot(id) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return null;
    return {
      id: entry.id,
      group: entry.config.group,
      src: entry.config.src,
      origin: { ...entry.config.origin },
      position: { ...entry.config.position },
      rotation: { ...entry.config.rotation },
      upright: { ...entry.config.upright },
      scaleAxis: entry.config.scaleAxis,
      targetSize: entry.config.targetSize,
      appearanceDelayMs: entry.config.appearanceDelayMs,
      loaded: entry.loaded,
    };
  }

  /**
   * Background sequential load. Safe to call once; late results ignored after dispose.
   */
  function startLoading() {
    if (loadPromise) return loadPromise;
    const generation = loadGeneration;

    loadPromise = (async () => {
      let loadedCount = 0;
      for (const entry of entries) {
        if (disposed || generation !== loadGeneration) return;
        try {
          const loaded = await loadInterestGlb(THREE, entry.config.src, {
            targetSize: entry.config.targetSize,
            scaleAxis: entry.config.scaleAxis,
            upright: entry.config.upright,
            rotation: entry.config.rotation,
          });
          if (disposed || generation !== loadGeneration) {
            disposeObject3DResources(loaded.model);
            return;
          }
          entry.entrance.add(loaded.model);
          entry.content = loaded.model;
          entry.bounds = loaded.bounds;
          entry.loaded = true;
          setInterestOpacity(loaded.model, 0);
          loadedCount += 1;
          options.onProgress?.(loadedCount, entries.length, entry.id);
          options.onItemLoaded?.(entry.id);
        } catch (error) {
          console.warn(`[interest-objects] failed to load ${entry.id}`, error);
        }
      }
    })();

    return loadPromise;
  }

  resetVisualState();

  return {
    placement,
    group: placement,
    plane,
    entries,
    get items() {
      return entries.filter((entry) => entry.loaded).map((entry) => getConfigSnapshot(entry.id));
    },
    setVisible,
    applyEntranceProgress,
    resetVisualState,
    applyPoseEdit,
    getConfigSnapshot,
    startLoading,
    getEntry(id) {
      return entries.find((entry) => entry.id === id) ?? null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loadGeneration += 1;
      disposeObject3DResources(placement);
      placement.removeFromParent?.();
      entries.length = 0;
      loadPromise = null;
    },
  };
}
