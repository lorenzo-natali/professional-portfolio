import { createDocumentPlane } from "./arDocumentPlane";
import { resolveZonePoint } from "./cvSemanticZones";
import {
  ACTIVATION_CUE,
  IDENTITY_PATH,
  LENS_SEQUENCE,
  LENS_Z,
  LENS_Z_LABEL,
  LENS_Z_LINE,
  MAX_GOVERNANCE_NODES,
  MAX_INTERPRETATION_CALLOUTS,
  TRAJECTORY_EDGES,
  getGovernanceNodes,
  getInterpretationCallouts,
} from "./governanceLensConfig";
import { createLabelMesh, disposeObject3DResources } from "./arLabelTexture";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function zoneToWorld(plane, zoneId, offset, z) {
  const { u, vTop } = resolveZonePoint(zoneId, offset);
  return plane.toWorldFromTopLeft(u, vTop, z);
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

function createLine(THREE, points, color = 0xa5f3fc, opacity = 0) {
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

function createNodeMarker(THREE) {
  const geometry = new THREE.CircleGeometry(0.012, 20);
  const material = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.disposables = [geometry, material];
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

  // --- Activation cue ---
  const activation = createLabelMesh(THREE, ACTIVATION_CUE.text, {
    worldHeight: 0.03,
    background: "rgba(2, 6, 23, 0.5)",
  });
  activation.name = "ar-lens-activation";
  {
    const p = zoneToWorld(plane, ACTIVATION_CUE.zoneId, ACTIVATION_CUE.offset, LENS_Z_LABEL);
    activation.position.set(p.x, p.y, p.z);
  }
  group.add(activation);

  // --- Identity path ---
  const identityPoints = IDENTITY_PATH.points.map((pt) => {
    const w = zoneToWorld(plane, pt.zoneId, pt.offset, LENS_Z_LINE);
    return new THREE.Vector3(w.x, w.y, w.z);
  });
  const identityLine = createLine(THREE, identityPoints, 0xa5f3fc, 0);
  identityLine.name = "ar-lens-identity-path";
  group.add(identityLine);

  const identityLabel = createLabelMesh(THREE, IDENTITY_PATH.label, {
    worldHeight: 0.028,
    background: "rgba(2, 6, 23, 0.45)",
  });
  identityLabel.name = "ar-lens-identity-label";
  {
    const mid = identityPoints[1] || identityPoints[0];
    const offset = IDENTITY_PATH.labelOffset;
    const w = zoneToWorld(plane, "header", offset, LENS_Z_LABEL);
    identityLabel.position.set(w.x, mid.y + 0.02, w.z);
  }
  group.add(identityLabel);

  // --- Governance nodes ---
  const nodeMeshes = new Map();
  nodesConfig.forEach((node) => {
    const marker = createNodeMarker(THREE);
    marker.name = `ar-lens-node:${node.id}`;
    const label = createLabelMesh(THREE, node.label, {
      worldHeight: 0.026,
      background: "rgba(2, 6, 23, 0.5)",
    });
    label.name = `ar-lens-node-label:${node.id}`;
    const w = zoneToWorld(plane, node.zoneId, node.offset, LENS_Z);
    marker.position.set(w.x, w.y, w.z);
    label.position.set(w.x + 0.04, w.y + 0.018, LENS_Z_LABEL);
    group.add(marker);
    group.add(label);
    nodeMeshes.set(node.id, { marker, label, world: w });
  });

  // --- Trajectory edges ---
  const trajectoryLines = TRAJECTORY_EDGES.map(([fromId, toId], index) => {
    const from = nodeMeshes.get(fromId)?.world;
    const to = nodeMeshes.get(toId)?.world;
    if (!from || !to) return null;
    const line = createLine(
      THREE,
      [new THREE.Vector3(from.x, from.y, LENS_Z_LINE), new THREE.Vector3(to.x, to.y, LENS_Z_LINE)],
      0x67e8f9,
      0,
    );
    line.name = `ar-lens-trajectory:${index}`;
    group.add(line);
    return line;
  }).filter(Boolean);

  // --- Interpretation callouts ---
  const calloutItems = calloutsConfig.map((callout) => {
    const label = createLabelMesh(THREE, callout.label, {
      worldHeight: 0.024,
      background: "rgba(2, 6, 23, 0.48)",
    });
    label.name = `ar-lens-callout:${callout.id}`;
    const tip = zoneToWorld(plane, callout.zoneId, callout.offset, LENS_Z_LABEL);
    const anchor = zoneToWorld(plane, callout.zoneId, callout.anchorOffset, LENS_Z_LINE);
    label.position.set(tip.x, tip.y, tip.z);
    const leader = createLine(
      THREE,
      [new THREE.Vector3(anchor.x, anchor.y, LENS_Z_LINE), new THREE.Vector3(tip.x, tip.y, LENS_Z_LINE)],
      0x94a3b8,
      0,
    );
    leader.name = `ar-lens-callout-leader:${callout.id}`;
    const mark = createNodeMarker(THREE);
    mark.scale.setScalar(0.55);
    mark.name = `ar-lens-callout-mark:${callout.id}`;
    mark.position.set(anchor.x, anchor.y, LENS_Z);
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

  function applyFinalComposition() {
    setOpacity(activation, ACTIVATION_CUE.settledOpacity);
    setOpacity(identityLine, 0.7);
    setOpacity(identityLabel, 0.85);
    nodeMeshes.forEach(({ marker, label }) => {
      setOpacity(marker, 0.9);
      setOpacity(label, 0.88);
    });
    trajectoryLines.forEach((line) => setOpacity(line, 0.55));
    calloutItems.forEach(({ label, leader, mark }) => {
      setOpacity(label, 0.86);
      setOpacity(leader, 0.5);
      setOpacity(mark, 0.75);
    });
    progress = 1;
    phase = "complete";
    hasCompleted = true;
  }

  /** Restore opacities for the furthest stage already reached (no replay). */
  function applyProgressState(value) {
    setOpacity(activation, value >= 0.25 ? ACTIVATION_CUE.settledOpacity : value >= 0.15 ? ACTIVATION_CUE.activeOpacity : 0);
    setOpacity(identityLine, value >= 0.4 ? 0.7 : 0);
    setOpacity(identityLabel, value >= 0.4 ? 0.85 : 0);
    nodesConfig.forEach((node, index) => {
      const shown = value >= 0.45 + index * 0.08;
      const entry = nodeMeshes.get(node.id);
      if (!entry) return;
      setOpacity(entry.marker, shown ? 0.9 : 0);
      setOpacity(entry.label, shown ? 0.88 : 0);
    });
    trajectoryLines.forEach((line) => setOpacity(line, value >= 0.75 ? 0.55 : 0));
    calloutItems.forEach((item, index) => {
      const shown = value >= 0.8 + index * 0.05;
      setOpacity(item.mark, shown ? 0.75 : 0);
      setOpacity(item.leader, shown ? 0.5 : 0);
      setOpacity(item.label, shown ? 0.86 : 0);
    });
  }

  function playSequence() {
    clearTimers();
    phase = "playing";

    if (reducedMotion || hasCompleted) {
      applyFinalComposition();
      return;
    }

    // Reset to invisible before staging (first play only).
    if (progress === 0) {
      setOpacity(activation, 0);
      setOpacity(identityLine, 0);
      setOpacity(identityLabel, 0);
      nodeMeshes.forEach(({ marker, label }) => {
        setOpacity(marker, 0);
        setOpacity(label, 0);
      });
      trajectoryLines.forEach((line) => setOpacity(line, 0));
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
      setOpacity(identityLine, 0.7);
      setOpacity(identityLabel, 0.85);
      progress = Math.max(progress, 0.4);
    });

    nodesConfig.forEach((node, index) => {
      schedule(LENS_SEQUENCE.nodesStart + index * LENS_SEQUENCE.nodeStagger, () => {
        const entry = nodeMeshes.get(node.id);
        if (!entry) return;
        setOpacity(entry.marker, 0.9);
        setOpacity(entry.label, 0.88);
        progress = Math.max(progress, 0.45 + index * 0.08);
      });
    });

    schedule(LENS_SEQUENCE.trajectory, () => {
      trajectoryLines.forEach((line) => setOpacity(line, 0.55));
      progress = Math.max(progress, 0.75);
    });

    calloutsConfig.forEach((callout, index) => {
      schedule(LENS_SEQUENCE.calloutsStart + index * LENS_SEQUENCE.calloutStagger, () => {
        const item = calloutItems[index];
        if (!item) return;
        setOpacity(item.mark, 0.75);
        setOpacity(item.leader, 0.5);
        setOpacity(item.label, 0.86);
        progress = Math.max(progress, 0.8 + index * 0.05);
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
      if (hasCompleted || progress >= 0.75) {
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
    // Visibility of anchor.group is handled by MindAR; we only pause timers.
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
