import { createDocumentPlane } from "./arDocumentPlane";
import {
  DEFAULT_LENS_ID,
  LABEL_HEIGHT,
  LABEL_MAX_WIDTH,
  LENS_REVEAL,
  LENS_Z,
  LENS_Z_LABEL,
  LENS_Z_LINE,
  MAX_SIMULTANEOUS_ANNOTATIONS,
  NODE_RADIUS,
  RETIRED_GOVERNANCE_LABELS,
  getLensById,
} from "./lensCatalog";
import { resolveLensLayout, validateLensLayout } from "./lensLayout";
import { createLabelMesh, disposeObject3DResources } from "./arLabelTexture";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setOpacity(object, opacity) {
  object?.traverse((node) => {
    if (node.material && "opacity" in node.material) {
      node.material.transparent = true;
      node.material.opacity = opacity;
      node.material.needsUpdate = true;
    }
  });
}

function createLine(THREE, points, color, opacity = 0) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.userData.disposables = [geometry, material];
  line.userData.kind = "ar-leader";
  return line;
}

function createNodeMarker(THREE, color, radius = NODE_RADIUS) {
  const geometry = new THREE.CircleGeometry(radius, 24);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.disposables = [geometry, material];
  mesh.userData.kind = "ar-node-marker";
  mesh.userData.nodeDiameter = radius * 2;
  return mesh;
}

/**
 * Config-driven AR Lens layer attached to MindAR `anchor.group`.
 *
 * @param {typeof import("three")} THREE
 * @param {{ lensId?: string, reducedMotion?: boolean }} [options]
 */
export function createLensLayer(THREE, options = {}) {
  const lensId = options.lensId ?? DEFAULT_LENS_ID;
  const lens = getLensById(lensId);
  if (!lens) throw new Error(`Unknown lens: ${lensId}`);

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const plane = createDocumentPlane();
  const layout = resolveLensLayout(lensId, {
    plane,
    labelZ: LENS_Z_LABEL,
    evidenceZ: LENS_Z,
  });

  if (layout.length > MAX_SIMULTANEOUS_ANNOTATIONS) {
    throw new Error("Lens annotation limit exceeded");
  }

  const validation = validateLensLayout(layout, plane);
  if (!validation.ok) {
    // Deterministic layout should already satisfy constraints; surface in tests/dev.
    console.warn("[createLensLayer] layout validation:", validation.errors);
  }

  const group = new THREE.Group();
  group.name = "ar-lens-layer";
  group.userData.kind = "ar-lens-layer";
  group.userData.lensId = lensId;
  group.userData.documentPlane = plane;

  const timers = [];
  let phase = "idle"; // idle | playing | complete | paused
  let disposed = false;
  let hasCompleted = false;
  let progress = 0;

  const plateBg = "rgba(10, 18, 24, 0.58)";
  /** @type {Array<{ id: string, marker: import('three').Mesh, leader: import('three').Line, label: import('three').Mesh, layout: (typeof layout)[number] }>} */
  const items = [];

  if (lens.enabled) {
    layout.forEach((entry) => {
      const marker = createNodeMarker(THREE, lens.accentHex, NODE_RADIUS);
      marker.name = `ar-lens-node:${entry.id}`;
      marker.position.set(entry.evidence.x, entry.evidence.y, entry.evidence.z);
      marker.userData.uv = { u: entry.evidence.u, vTop: entry.evidence.vTop };
      marker.userData.evidenceAnchor = entry.id;

      const label = createLabelMesh(THREE, entry.text, {
        worldHeight: entry.worldHeight || LABEL_HEIGHT,
        maxWorldWidth: LABEL_MAX_WIDTH,
        background: plateBg,
        color: "#ffffff",
        preferTwoLine: true,
      });
      label.name = `ar-lens-label:${entry.id}`;
      label.position.set(entry.label.x, entry.label.y, entry.label.z);
      label.userData.uv = { u: entry.label.u, vTop: entry.label.vTop };
      label.userData.annotationId = entry.id;
      // Sync half-extents from actual mesh (may differ slightly from estimate).
      const halfW = label.geometry.parameters.width / 2;
      const halfH = label.geometry.parameters.height / 2;
      const leaderEnd = {
        x: entry.leaderEnd.x,
        y: entry.leaderEnd.y,
        z: LENS_Z_LINE,
      };
      // Recompute edge terminus from actual plate size.
      {
        const dx = entry.evidence.x - entry.label.x;
        const dy = entry.evidence.y - entry.label.y;
        const tX = Math.abs(dx) < 1e-9 ? Infinity : halfW / Math.abs(dx);
        const tY = Math.abs(dy) < 1e-9 ? Infinity : halfH / Math.abs(dy);
        const t = Math.min(tX, tY);
        leaderEnd.x = entry.label.x + dx * t;
        leaderEnd.y = entry.label.y + dy * t;
      }
      label.userData.halfW = halfW;
      label.userData.halfH = halfH;
      label.userData.leaderEnd = { ...leaderEnd };

      const leader = createLine(
        THREE,
        [
          new THREE.Vector3(entry.evidence.x, entry.evidence.y, LENS_Z_LINE),
          new THREE.Vector3(leaderEnd.x, leaderEnd.y, LENS_Z_LINE),
        ],
        lens.accentHex,
        0,
      );
      leader.name = `ar-lens-leader:${entry.id}`;
      leader.userData.annotationId = entry.id;

      group.add(marker);
      group.add(leader);
      group.add(label);
      items.push({ id: entry.id, marker, leader, label, layout: entry });
    });
  }

  function clearTimers() {
    while (timers.length) {
      clearTimeout(timers.pop());
    }
  }

  function schedule(ms, fn) {
    if (reducedMotion) {
      fn();
      return;
    }
    const id = setTimeout(() => {
      if (!disposed && phase !== "paused") fn();
    }, ms);
    timers.push(id);
  }

  function applyFinalComposition() {
    items.forEach(({ marker, leader, label }) => {
      setOpacity(marker, 0.92);
      setOpacity(leader, 0.88);
      setOpacity(label, 0.92);
    });
    progress = 1;
    phase = "complete";
    hasCompleted = true;
  }

  function applyProgressState(value) {
    items.forEach((item, index) => {
      const threshold = (index + 0.5) / Math.max(items.length, 1);
      const visible = value >= threshold;
      setOpacity(item.marker, visible ? 0.92 : 0);
      setOpacity(item.leader, visible ? 0.88 : 0);
      setOpacity(item.label, visible ? 0.92 : 0);
    });
  }

  function playSequence() {
    clearTimers();
    phase = "playing";

    if (reducedMotion || hasCompleted || items.length === 0) {
      applyFinalComposition();
      return;
    }

    if (progress === 0) {
      items.forEach(({ marker, leader, label }) => {
        setOpacity(marker, 0);
        setOpacity(leader, 0);
        setOpacity(label, 0);
      });
    }

    items.forEach((item, index) => {
      schedule(LENS_REVEAL.firstAnnotation + index * LENS_REVEAL.stagger, () => {
        setOpacity(item.marker, 0.92);
        setOpacity(item.leader, 0.88);
        setOpacity(item.label, 0.92);
        progress = Math.max(progress, (index + 1) / items.length);
        if (index === items.length - 1) {
          phase = "complete";
          hasCompleted = true;
          progress = 1;
        }
      });
    });
  }

  function onTargetFound() {
    if (disposed) return;
    if (phase === "paused") {
      if (hasCompleted || progress >= 0.75) {
        applyFinalComposition();
      } else {
        applyProgressState(Math.max(progress, 0.5));
        phase = "complete";
        hasCompleted = true;
      }
      return;
    }
    if (phase === "complete" || hasCompleted) {
      applyFinalComposition();
      return;
    }
    playSequence();
  }

  function onTargetLost() {
    if (disposed) return;
    clearTimers();
    if (phase === "playing" || phase === "complete") {
      phase = "paused";
    }
  }

  function dispose() {
    disposed = true;
    clearTimers();
    disposeObject3DResources(group);
    group.clear();
    phase = "idle";
  }

  return {
    group,
    lensId,
    onTargetFound,
    onTargetLost,
    dispose,
    getPhase: () => phase,
    getProgress: () => progress,
    isReducedMotion: () => reducedMotion,
    getAnnotationCount: () => items.length,
    getMaxAnnotationCount: () => MAX_SIMULTANEOUS_ANNOTATIONS,
    getLayout: () => layout,
    getItems: () => items,
    collectLabelMeshes: () => items.map((item) => item.label),
    applyFinalComposition,
    getRetiredLabels: () => RETIRED_GOVERNANCE_LABELS,
  };
}

/** @deprecated Use createLensLayer — kept as a thin alias during migration. */
export function createGovernanceLensLayer(THREE, options = {}) {
  return createLensLayer(THREE, { ...options, lensId: options.lensId ?? DEFAULT_LENS_ID });
}

export function isLensLayerDescendant(object, anchorGroup) {
  if (!object || !anchorGroup) return false;
  let current = object;
  let underLens = false;
  while (current) {
    if (current.name === "ar-lens-layer" || current.name === "ar-governance-lens") underLens = true;
    if (current === anchorGroup) return underLens;
    current = current.parent;
  }
  return false;
}

export const isGovernanceLensDescendant = isLensLayerDescendant;
