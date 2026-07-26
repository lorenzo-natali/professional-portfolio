import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import { createLabelMesh, disposeObject3DResources } from "./arLabelTexture";
import {
  PROFESSIONAL_EVOLUTION_COPY,
  PROFESSIONAL_EVOLUTION_LAYOUT,
  PROFESSIONAL_EVOLUTION_ORIGIN,
  PROFESSIONAL_EVOLUTION_STAGES,
} from "./professionalEvolutionConfig";

/**
 * @param {import("three").Material} material
 * @param {number} opacity
 */
function setMaterialOpacity(material, opacity) {
  if (!material || !("opacity" in material)) return;
  const base = material.userData?.baseOpacity ?? 1;
  material.transparent = true;
  material.opacity = Math.min(1, Math.max(0, opacity)) * base;
  material.depthWrite = false;
  material.needsUpdate = true;
}

/**
 * Build Layer 2 — Professional Evolution as tracked document-plane content.
 *
 * Live hierarchy under MindAR (no extra wrapper):
 *   presentation → placement → entrance → content
 *
 * `group` aliases `placement` so visibility/lifecycle APIs stay stable.
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   origin?: typeof PROFESSIONAL_EVOLUTION_ORIGIN,
 *   layout?: typeof PROFESSIONAL_EVOLUTION_LAYOUT,
 *   stages?: typeof PROFESSIONAL_EVOLUTION_STAGES,
 *   copy?: typeof PROFESSIONAL_EVOLUTION_COPY,
 * }} [options]
 */
export function createProfessionalEvolutionLayer(THREE, options = {}) {
  const origin = options.origin ?? PROFESSIONAL_EVOLUTION_ORIGIN;
  const layout = options.layout ?? PROFESSIONAL_EVOLUTION_LAYOUT;
  const stages = options.stages ?? PROFESSIONAL_EVOLUTION_STAGES;
  const copy = options.copy ?? PROFESSIONAL_EVOLUTION_COPY;
  const plane = createDocumentPlane();
  const worldOrigin = plane.toWorldFromTopLeft(origin.u, origin.vTop, DOCUMENT_PLANE_Z);

  // Placement is the content root attached under presentation (no wrapper group).
  const placement = new THREE.Group();
  placement.name = "ar-professional-evolution-placement";
  placement.userData.kind = "ar-professional-evolution";
  placement.userData.documentPlane = plane;
  placement.userData.calibration = { origin, layout };
  placement.userData.riseAxis = "z";
  placement.visible = false;
  placement.position.set(
    worldOrigin.x + layout.offset.x,
    worldOrigin.y + layout.offset.y,
    worldOrigin.z + layout.offset.z,
  );
  placement.rotation.set(layout.rotation.x, layout.rotation.y, layout.rotation.z);

  const entrance = new THREE.Group();
  entrance.name = "ar-professional-evolution-entrance";
  placement.add(entrance);

  const content = new THREE.Group();
  content.name = "ar-professional-evolution-content";
  entrance.add(content);

  const topY = layout.height * 0.42;

  const heading = createLabelMesh(THREE, copy.heading, {
    worldHeight: layout.typography.headingWorldHeight,
    maxWorldWidth: layout.typography.maxHeadingWidth,
    color: layout.colors.heading,
    background: layout.colors.plate,
    preferTwoLine: false,
  });
  heading.name = "ar-pe-heading";
  heading.position.set(0, topY, 0.001);
  heading.material.userData.baseOpacity = 1;
  setMaterialOpacity(heading.material, 0);
  content.add(heading);

  /** @type {import("three").Mesh | null} */
  let supporting = null;
  if (copy.supporting) {
    supporting = createLabelMesh(THREE, copy.supporting, {
      worldHeight: layout.typography.supportingWorldHeight,
      maxWorldWidth: layout.typography.maxSupportingWidth,
      color: layout.colors.supporting,
      background: null,
      preferTwoLine: false,
    });
    supporting.name = "ar-pe-supporting";
    supporting.position.set(0, topY - layout.spacing.headingToSupport, 0.001);
    supporting.material.userData.baseOpacity = 1;
    setMaterialOpacity(supporting.material, 0);
    content.add(supporting);
  }

  const lineY =
    topY -
    layout.spacing.headingToSupport -
    (supporting ? layout.spacing.supportToLine : layout.spacing.headingToSupport * 0.35);
  const lineWidth = layout.width * 0.92;
  const lineGeom = new THREE.PlaneGeometry(lineWidth, 0.0018);
  const lineMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(layout.colors.line),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  lineMat.userData.baseOpacity = 0.85;
  const line = new THREE.Mesh(lineGeom, lineMat);
  line.name = "ar-pe-trajectory-line";
  line.position.set(0, lineY, 0);
  // Scale from left origin for progressive draw.
  line.geometry.translate(lineWidth / 2, 0, 0);
  line.position.x = -lineWidth / 2;
  line.scale.x = 0.0001;
  content.add(line);

  const stageY = lineY - layout.spacing.lineToStages;
  const count = stages.length;
  const span = lineWidth * (1 - layout.spacing.stageGapRatio * 0.15);
  const startX = -span / 2;

  const stageNodes = stages.map((stage, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const x = startX + t * span;
    const stageGroup = new THREE.Group();
    stageGroup.name = `ar-pe-stage:${stage.id}`;
    stageGroup.position.set(x, stageY, 0.001);
    stageGroup.userData.stageId = stage.id;
    stageGroup.userData.emphasis = Boolean(stage.emphasis);
    stageGroup.userData.direction = Boolean(stage.direction);

    // Direction stage: slightly larger node, still restrained (not seniority scale).
    const nodeRadius = stage.emphasis ? 0.0056 : 0.005;
    const nodeGeom = new THREE.CircleGeometry(nodeRadius, 24);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(stage.emphasis ? layout.colors.nodeEmphasis : layout.colors.node),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    nodeMat.userData.baseOpacity = 1;
    const node = new THREE.Mesh(nodeGeom, nodeMat);
    node.name = `ar-pe-node:${stage.id}`;
    node.position.z = 0.001;
    stageGroup.add(node);

    const label = createLabelMesh(THREE, stage.label, {
      worldHeight: layout.typography.stageWorldHeight,
      maxWorldWidth: layout.typography.maxStageWidth,
      color: stage.emphasis ? layout.colors.stageEmphasis : layout.colors.stage,
      // Completed stages: no plate. Direction stage: light violet wash only.
      background: stage.emphasis ? layout.colors.plateEmphasis : null,
      preferTwoLine: true,
    });
    label.name = `ar-pe-label:${stage.id}`;
    label.position.set(0, -0.028, 0.001);
    label.material.userData.baseOpacity = 1;
    setMaterialOpacity(label.material, 0);
    stageGroup.add(label);

    content.add(stageGroup);
    return {
      id: stage.id,
      group: stageGroup,
      node,
      label,
      emphasis: Boolean(stage.emphasis),
      direction: Boolean(stage.direction),
    };
  });

  function setOpacity(opacity) {
    const value = Math.min(Math.max(opacity, 0), 1);
    setMaterialOpacity(heading.material, value);
    if (supporting) setMaterialOpacity(supporting.material, value);
    setMaterialOpacity(line.material, value);
    stageNodes.forEach((stage) => {
      setMaterialOpacity(stage.node.material, value);
      setMaterialOpacity(stage.label.material, value);
    });
  }

  function getOpacity() {
    const base = heading.material.userData?.baseOpacity ?? 1;
    return base > 0 ? heading.material.opacity / base : 0;
  }

  /**
   * Drive entrance progress (0…1 maps across configured timing via animation controller).
   * @param {{
   *   heading?: number,
   *   line?: number,
   *   stages?: number[],
   *   emphasis?: number,
   * }} progress
   */
  function applyProgress(progress = {}) {
    const headingOpacity = progress.heading ?? 0;
    setMaterialOpacity(heading.material, headingOpacity);
    if (supporting) setMaterialOpacity(supporting.material, headingOpacity * 0.92);

    const lineProgress = Math.min(1, Math.max(0.0001, progress.line ?? 0));
    line.scale.x = lineProgress;
    setMaterialOpacity(line.material, Math.min(1, lineProgress * 1.2));

    const stageProgress = progress.stages ?? [];
    stageNodes.forEach((stage, index) => {
      const p = stageProgress[index] ?? 0;
      setMaterialOpacity(stage.node.material, p);
      setMaterialOpacity(stage.label.material, p);
      const emphasis = progress.emphasis ?? 0;
      if (stage.emphasis && emphasis > 0) {
        // Soft direction cue — colour carries the signal more than scale.
        const boost = 1 + emphasis * 0.035;
        stage.label.scale.setScalar(boost);
        stage.node.scale.setScalar(1 + emphasis * 0.08);
        setMaterialOpacity(stage.label.material, Math.min(1, p + emphasis * 0.06));
      } else {
        stage.label.scale.setScalar(1);
        stage.node.scale.setScalar(1);
      }
    });
  }

  function resetVisualState() {
    applyProgress({
      heading: 0,
      line: 0,
      stages: stageNodes.map(() => 0),
      emphasis: 0,
    });
    entrance.position.set(0, 0, 0);
    placement.visible = false;
  }

  resetVisualState();

  return {
    /** Alias of placement — visibility root under presentation. */
    group: placement,
    root: placement,
    placement,
    interaction: entrance,
    anim: entrance,
    content,
    heading,
    supporting,
    line,
    stageNodes,
    stages: stageNodes.map((s) => ({ id: s.id, label: s.label.userData.labelText })),
    riseHeight: layout.riseHeight,
    riseAxis: "z",
    initialRotation: { ...layout.rotation },
    initialScale: 1,
    setOpacity,
    getOpacity,
    applyProgress,
    resetVisualState,
    resetInteractionPose() {
      // No gesture ownership — kept for animation lifecycle compatibility.
    },
    dispose() {
      placement.removeFromParent?.();
      disposeObject3DResources(placement);
    },
  };
}
