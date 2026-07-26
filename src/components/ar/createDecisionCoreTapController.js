import { DECISION_CORE_GLOW, DECISION_CORE_TIMING } from "./decisionCoreConfig";

/**
 * Tap semantics for Decision Core segments.
 * First tap: expand + short label. Second tap: framework tokens. Outside: collapse.
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   artifact: ReturnType<import("./createDecisionCore3D").createDecisionCore3D>,
 *   camera: import("three").Camera,
 *   domElement: HTMLElement,
 *   timing?: typeof DECISION_CORE_TIMING,
 *   isEnabled?: () => boolean,
 *   now?: () => number,
 * }} options
 */
export function createDecisionCoreTapController(THREE, options) {
  const artifact = options.artifact;
  const camera = options.camera;
  const domElement = options.domElement;
  const timing = { ...DECISION_CORE_TIMING, ...options.timing };
  const isEnabled = options.isEnabled ?? (() => true);
  const now = options.now ?? (() => performance.now());

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let disposed = false;
  let activeStageId = null;
  let labelTimer = 0;
  /** @type {number[]} */
  let expandRafs = [];

  function clearLabelTimer() {
    if (labelTimer) {
      clearTimeout(labelTimer);
      labelTimer = 0;
    }
  }

  function clearExpandRafs() {
    expandRafs.forEach((id) => cancelAnimationFrame(id));
    expandRafs = [];
  }

  function setLabelVisible(segment, visible) {
    segment.label.visible = visible;
    segment.label.material.opacity = visible ? 1 : 0;
    segment.label.material.needsUpdate = true;
  }

  function setTokensVisible(segment, visible) {
    segment.tokenMeshes.forEach((mesh) => {
      mesh.visible = visible;
      mesh.material.opacity = visible ? 1 : 0;
      mesh.material.needsUpdate = true;
    });
    segment.tokensOpen = visible;
  }

  function animateCarrierRadius(segment, toRadius, durationMs, onDone) {
    const from = segment.carrier.position.length();
    const start = now();
    const dir = segment.dir;

    const tick = (frameTime) => {
      if (disposed) return;
      const tNow = typeof frameTime === "number" ? frameTime : now();
      const t = Math.min(1, (tNow - start) / Math.max(1, durationMs));
      const eased = 1 - (1 - t) ** 3;
      const radius = from + (toRadius - from) * eased;
      segment.carrier.position.set(dir.x * radius, dir.y * radius, segment.carrier.position.z);
      if (t < 1) {
        const id = requestAnimationFrame(tick);
        expandRafs.push(id);
        return;
      }
      onDone?.();
    };
    const id = requestAnimationFrame(tick);
    expandRafs.push(id);
  }

  function collapseSegment(segment, { animate = true } = {}) {
    clearLabelTimer();
    setLabelVisible(segment, false);
    setTokensVisible(segment, false);
    segment.expanded = false;
    if (animate) {
      animateCarrierRadius(segment, segment.restRadius, timing.collapseMs);
    } else {
      segment.carrier.position.set(
        segment.dir.x * segment.restRadius,
        segment.dir.y * segment.restRadius,
        segment.carrier.position.z,
      );
    }
  }

  function collapseAll({ animate = true } = {}) {
    activeStageId = null;
    artifact.setCoreGlow(DECISION_CORE_GLOW.idle);
    artifact.segments.forEach((segment) => collapseSegment(segment, { animate }));
  }

  function findSegmentByObject(object) {
    let node = object;
    while (node) {
      const stageId = node.userData?.stageId;
      if (stageId) {
        return artifact.segments.find((entry) => entry.id === stageId) ?? null;
      }
      node = node.parent;
    }
    return null;
  }

  function pickSegment(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = artifact.segments.flatMap((segment) => [
      segment.blade,
      ...segment.carrier.children,
    ]);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return findSegmentByObject(hits[0].object);
  }

  function revealLabel(segment) {
    clearLabelTimer();
    setLabelVisible(segment, true);
    labelTimer = window.setTimeout(() => {
      labelTimer = 0;
      if (disposed) return;
      // Keep tokens if open; only auto-hide the stage label.
      if (!segment.tokensOpen) {
        setLabelVisible(segment, false);
      }
    }, timing.labelVisibleMs);
  }

  /**
   * @param {{ clientX: number, clientY: number }} point
   */
  function handleTap(point) {
    if (disposed || !isEnabled()) return;
    const segment = pickSegment(point.clientX, point.clientY);

    if (!segment) {
      collapseAll({ animate: true });
      return;
    }

    if (activeStageId && activeStageId !== segment.id) {
      const previous = artifact.segments.find((entry) => entry.id === activeStageId);
      if (previous) collapseSegment(previous, { animate: true });
    }

    activeStageId = segment.id;
    artifact.setCoreGlow(DECISION_CORE_GLOW.highlight);

    if (!segment.expanded) {
      segment.expanded = true;
      animateCarrierRadius(segment, segment.expandRadius, timing.expandMs);
      setTokensVisible(segment, false);
      revealLabel(segment);
      return;
    }

    if (!segment.tokensOpen) {
      setTokensVisible(segment, true);
      setLabelVisible(segment, true);
      clearLabelTimer();
      return;
    }

    // Third tap on open tokens collapses that segment.
    collapseSegment(segment, { animate: true });
    activeStageId = null;
    artifact.setCoreGlow(DECISION_CORE_GLOW.idle);
  }

  return {
    handleTap,
    collapseAll,
    dispose() {
      disposed = true;
      clearLabelTimer();
      clearExpandRafs();
      collapseAll({ animate: false });
    },
    /** @internal */
    getState: () => ({
      activeStageId,
      segments: artifact.segments.map((segment) => ({
        id: segment.id,
        expanded: segment.expanded,
        tokensOpen: segment.tokensOpen,
        labelVisible: segment.label.visible,
      })),
    }),
  };
}
