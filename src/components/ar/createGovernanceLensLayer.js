import { createDocumentPlane } from "./arDocumentPlane";
import { resolveZonePoint } from "./cvSemanticZones";
import {
  ACTIVATION_CUE,
  CALLOUT_MARK_RADIUS,
  IDENTITY_PATH,
  LENS_COLORS,
  LENS_SEQUENCE,
  LENS_Z,
  LENS_Z_LABEL,
  LENS_Z_LINE,
  MAX_GOVERNANCE_NODES,
  MAX_INTERPRETATION_CALLOUTS,
  MAX_VISIBLE_LABELS,
  NODE_RADIUS,
  getGovernanceNodes,
  getInterpretationCallouts,
} from "./governanceLensConfig";
import { createLabelMesh, disposeObject3DResources } from "./arLabelTexture";

/** Labels with opacity at or above this count as "visible" for the production cap. */
export const VISIBLE_LABEL_OPACITY = 0.4;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Single placement flow:
 * semantic zone → additive normalized offset → document-plane conversion → world position.
 */
function zoneToWorld(plane, zoneId, offset, z) {
  const { u, vTop } = resolveZonePoint(zoneId, offset ?? { u: 0, vTop: 0 });
  return { ...plane.toWorldFromTopLeft(u, vTop, z), u, vTop };
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

function createLine(THREE, points, color = LENS_COLORS.cyan, opacity = 0) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.userData.disposables = [geometry, material];
  return line;
}

function createNodeMarker(THREE, radius = NODE_RADIUS) {
  const geometry = new THREE.CircleGeometry(radius, 24);
  const material = new THREE.MeshBasicMaterial({
    color: LENS_COLORS.cyan,
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
 * CV-anchored Governance Lens content layer.
 * Attach `group` to MindAR `anchor.group`.
 *
 * @param {typeof import("three")} THREE
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function createGovernanceLensLayer(THREE, options = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const plane = createDocumentPlane();
  const nodesConfig = getGovernanceNodes();
  const calloutsConfig = getInterpretationCallouts();

  if (nodesConfig.length > MAX_GOVERNANCE_NODES) {
    throw new Error("Governance node limit exceeded");
  }
  if (calloutsConfig.length > MAX_INTERPRETATION_CALLOUTS) {
    throw new Error("Interpretation callout limit exceeded");
  }

  const group = new THREE.Group();
  group.name = "ar-governance-lens";
  group.userData.kind = "governance-lens";
  group.userData.documentPlane = plane;

  const timers = [];
  let phase = "idle"; // idle | playing | complete | paused
  let disposed = false;
  let hasCompleted = false;
  let progress = 0; // 0..1 composition reveal progress for restore

  const labelPlate = "rgba(10, 18, 24, 0.62)";
  const labelColor = "#ffffff";

  // --- Activation cue ---
  const activation = createLabelMesh(THREE, ACTIVATION_CUE.text, {
    worldHeight: ACTIVATION_CUE.labelHeight,
    background: labelPlate,
    color: labelColor,
  });
  activation.name = "ar-lens-activation";
  {
    const p = zoneToWorld(plane, ACTIVATION_CUE.zoneId, ACTIVATION_CUE.offset, LENS_Z_LABEL);
    activation.position.set(p.x, p.y, p.z);
    activation.userData.uv = { u: p.u, vTop: p.vTop };
  }
  group.add(activation);

  // --- Identity path (photo → name → headline) ---
  const identityPoints = IDENTITY_PATH.points.map((pt) => {
    const w = zoneToWorld(plane, pt.zoneId, pt.offset, LENS_Z_LINE);
    return new THREE.Vector3(w.x, w.y, w.z);
  });
  const identityLine = createLine(THREE, identityPoints, LENS_COLORS.cyan, 0);
  identityLine.name = "ar-lens-identity-path";
  group.add(identityLine);

  const identityLabel = createLabelMesh(THREE, IDENTITY_PATH.labelText, {
    worldHeight: IDENTITY_PATH.labelHeight,
    background: labelPlate,
    color: labelColor,
  });
  identityLabel.name = "ar-lens-identity-label";
  {
    const w = zoneToWorld(plane, IDENTITY_PATH.labelZoneId, IDENTITY_PATH.labelOffset, LENS_Z_LABEL);
    identityLabel.position.set(w.x, w.y, w.z);
    identityLabel.userData.uv = { u: w.u, vTop: w.vTop };
  }
  group.add(identityLabel);

  // --- Governance nodes (no trajectory edges; no Technology Risk / Emerging Specialization) ---
  const nodeMeshes = new Map();
  nodesConfig.forEach((node) => {
    const marker = createNodeMarker(THREE, NODE_RADIUS);
    marker.name = `ar-lens-node:${node.id}`;
    const label = createLabelMesh(THREE, node.text, {
      worldHeight: node.labelHeight,
      background: labelPlate,
      color: labelColor,
    });
    label.name = `ar-lens-node-label:${node.id}`;

    const markerWorld = zoneToWorld(plane, node.zoneId, node.offset, LENS_Z);
    const labelWorld = zoneToWorld(plane, node.zoneId, node.labelOffset, LENS_Z_LABEL);
    marker.position.set(markerWorld.x, markerWorld.y, markerWorld.z);
    label.position.set(labelWorld.x, labelWorld.y, labelWorld.z);
    marker.userData.uv = { u: markerWorld.u, vTop: markerWorld.vTop };
    label.userData.uv = { u: labelWorld.u, vTop: labelWorld.vTop };

    group.add(marker);
    group.add(label);
    nodeMeshes.set(node.id, { marker, label, world: markerWorld });
  });

  // --- Interpretation callouts (leaders from evidence → gutter labels) ---
  const calloutItems = calloutsConfig.map((callout) => {
    const label = createLabelMesh(THREE, callout.text, {
      worldHeight: callout.labelHeight,
      background: labelPlate,
      color: labelColor,
    });
    label.name = `ar-lens-callout:${callout.id}`;

    const evidence = zoneToWorld(plane, callout.zoneId, callout.evidenceOffset, LENS_Z);
    const tip = zoneToWorld(plane, callout.zoneId, callout.labelOffset, LENS_Z_LABEL);

    label.position.set(tip.x, tip.y, tip.z);
    label.userData.uv = { u: tip.u, vTop: tip.vTop };

    const leader = createLine(
      THREE,
      [
        new THREE.Vector3(evidence.x, evidence.y, LENS_Z_LINE),
        new THREE.Vector3(tip.x, tip.y, LENS_Z_LINE),
      ],
      LENS_COLORS.cyan,
      0,
    );
    leader.name = `ar-lens-callout-leader:${callout.id}`;

    const mark = createNodeMarker(THREE, CALLOUT_MARK_RADIUS);
    mark.name = `ar-lens-callout-mark:${callout.id}`;
    mark.position.set(evidence.x, evidence.y, LENS_Z);
    mark.userData.uv = { u: evidence.u, vTop: evidence.vTop };

    group.add(mark);
    group.add(leader);
    group.add(label);
    return { label, leader, mark };
  });

  function clearTimers() {
    while (timers.length) {
      const id = timers.pop();
      clearTimeout(id);
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

  function collectLabelMeshes() {
    const labels = [];
    group.traverse((node) => {
      if (node.userData?.kind === "ar-label") labels.push(node);
    });
    return labels;
  }

  function countVisibleLabels(threshold = VISIBLE_LABEL_OPACITY) {
    return collectLabelMeshes().filter((mesh) => (mesh.material?.opacity ?? 0) >= threshold).length;
  }

  function applyFinalComposition() {
    // Cue settles faint so readable labels stay within MAX_VISIBLE_LABELS.
    setOpacity(activation, ACTIVATION_CUE.settledOpacity);
    setOpacity(identityLine, 0.65);
    setOpacity(identityLabel, 0.9);
    nodeMeshes.forEach(({ marker, label }) => {
      setOpacity(marker, 0.9);
      setOpacity(label, 0.9);
    });
    calloutItems.forEach(({ label, leader, mark }) => {
      setOpacity(label, 0.9);
      setOpacity(leader, 0.55);
      setOpacity(mark, 0.8);
    });
    progress = 1;
    phase = "complete";
    hasCompleted = true;
  }

  /** Restore opacities for the furthest stage already reached (no replay). */
  function applyProgressState(value) {
    setOpacity(
      activation,
      value >= 0.25
        ? ACTIVATION_CUE.settledOpacity
        : value >= 0.15
          ? ACTIVATION_CUE.activeOpacity
          : 0,
    );
    setOpacity(identityLine, value >= 0.4 ? 0.65 : 0);
    setOpacity(identityLabel, value >= 0.4 ? 0.9 : 0);
    nodesConfig.forEach((node, index) => {
      const shown = value >= 0.45 + index * 0.08;
      const entry = nodeMeshes.get(node.id);
      if (!entry) return;
      setOpacity(entry.marker, shown ? 0.9 : 0);
      setOpacity(entry.label, shown ? 0.9 : 0);
    });
    calloutItems.forEach((item, index) => {
      const shown = value >= 0.75 + index * 0.06;
      setOpacity(item.mark, shown ? 0.8 : 0);
      setOpacity(item.leader, shown ? 0.55 : 0);
      setOpacity(item.label, shown ? 0.9 : 0);
    });
  }

  function playSequence() {
    clearTimers();
    phase = "playing";

    if (reducedMotion || hasCompleted) {
      applyFinalComposition();
      return;
    }

    if (progress === 0) {
      setOpacity(activation, 0);
      setOpacity(identityLine, 0);
      setOpacity(identityLabel, 0);
      nodeMeshes.forEach(({ marker, label }) => {
        setOpacity(marker, 0);
        setOpacity(label, 0);
      });
      calloutItems.forEach(({ label, leader, mark }) => {
        setOpacity(label, 0);
        setOpacity(leader, 0);
        setOpacity(mark, 0);
      });
    }

    schedule(LENS_SEQUENCE.activationIn, () => {
      setOpacity(activation, ACTIVATION_CUE.activeOpacity);
      progress = Math.max(progress, 0.15);
    });

    schedule(LENS_SEQUENCE.activationSettle, () => {
      setOpacity(activation, ACTIVATION_CUE.settledOpacity);
      progress = Math.max(progress, 0.25);
    });

    schedule(LENS_SEQUENCE.identityPath, () => {
      setOpacity(identityLine, 0.65);
      setOpacity(identityLabel, 0.9);
      progress = Math.max(progress, 0.4);
    });

    nodesConfig.forEach((node, index) => {
      schedule(LENS_SEQUENCE.nodesStart + index * LENS_SEQUENCE.nodeStagger, () => {
        const entry = nodeMeshes.get(node.id);
        if (!entry) return;
        setOpacity(entry.marker, 0.9);
        setOpacity(entry.label, 0.9);
        progress = Math.max(progress, 0.45 + index * 0.08);
      });
    });

    calloutsConfig.forEach((callout, index) => {
      schedule(LENS_SEQUENCE.calloutsStart + index * LENS_SEQUENCE.calloutStagger, () => {
        const item = calloutItems[index];
        if (!item) return;
        setOpacity(item.mark, 0.8);
        setOpacity(item.leader, 0.55);
        setOpacity(item.label, 0.9);
        progress = Math.max(progress, 0.75 + index * 0.06);
        if (index === calloutsConfig.length - 1) {
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
      // Restore calmly: keep composition, do not replay the staged intro.
      if (hasCompleted || progress >= 0.7) {
        applyFinalComposition();
      } else {
        applyProgressState(Math.max(progress, 0.4));
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
    // Anchor visibility is handled by MindAR; we only pause timers / sequence.
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
    onTargetFound,
    onTargetLost,
    dispose,
    /** @internal test helpers */
    getPhase: () => phase,
    getProgress: () => progress,
    isReducedMotion: () => reducedMotion,
    getNodeCount: () => nodeMeshes.size,
    getCalloutCount: () => calloutItems.length,
    getMaxNodeCount: () => MAX_GOVERNANCE_NODES,
    getMaxCalloutCount: () => MAX_INTERPRETATION_CALLOUTS,
    getMaxVisibleLabels: () => MAX_VISIBLE_LABELS,
    countVisibleLabels,
    collectLabelMeshes,
    applyFinalComposition,
  };
}

/** True when an Object3D is under the governance lens group attached to an anchor. */
export function isGovernanceLensDescendant(object, anchorGroup) {
  if (!object || !anchorGroup) return false;
  let current = object;
  let underLens = false;
  while (current) {
    if (current.name === "ar-governance-lens") underLens = true;
    if (current === anchorGroup) return underLens;
    current = current.parent;
  }
  return false;
}
