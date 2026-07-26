import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import {
  DECISION_CORE_GLOW,
  DECISION_CORE_MATERIALS,
  DECISION_CORE_SIZE,
  DECISION_CORE_STAGES,
} from "./decisionCoreConfig";
import {
  PROFESSIONAL_CARD_INTERACTION,
  PROFESSIONAL_CARD_ORIGIN,
  PROFESSIONAL_CARD_TRANSFORM,
} from "./professionalCardConfig";

/**
 * @param {typeof import("three")} THREE
 * @param {string} text
 * @param {{
 *   width?: number,
 *   height?: number,
 *   fontSize?: number,
 *   color?: string,
 *   background?: string,
 *   weight?: string,
 * }} [options]
 */
export function createDecisionCoreLabelCanvas(text, options = {}) {
  const width = options.width ?? 256;
  const height = options.height ?? 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.clearRect(0, 0, width, height);
  const radius = Math.min(height * 0.45, 18);
  ctx.fillStyle = options.background ?? DECISION_CORE_MATERIALS.labelBg;
  roundRect(ctx, 4, 4, width - 8, height - 8, radius);
  ctx.fill();

  ctx.fillStyle = options.color ?? DECISION_CORE_MATERIALS.labelText;
  ctx.font = `${options.weight ?? "600"} ${options.fontSize ?? 28}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(text), width / 2, height / 2);
  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Shared blade profile — one geometry instance for all six segments.
 * Local +X points radially outward once parented under a yawed carrier.
 * @param {typeof import("three")} THREE
 * @param {typeof DECISION_CORE_SIZE} size
 */
function createBladeGeometry(THREE, size) {
  // Rounded petal / segment: wider at the hub, gently tapering outward.
  const halfWRoot = size.bladeWidth * 0.5;
  const halfWTip = size.bladeWidth * 0.32;
  const halfT = size.bladeThickness * 0.5;
  const len = size.bladeLength;

  const shape = new THREE.Shape();
  shape.moveTo(0, -halfWRoot * 0.92);
  shape.lineTo(len * 0.78, -halfWTip);
  shape.quadraticCurveTo(len, -halfWTip * 0.35, len, 0);
  shape.quadraticCurveTo(len, halfWTip * 0.35, len * 0.78, halfWTip);
  shape.lineTo(0, halfWRoot * 0.92);
  shape.quadraticCurveTo(-len * 0.04, 0, 0, -halfWRoot * 0.92);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: size.bladeThickness,
    bevelEnabled: true,
    bevelThickness: halfT * 0.45,
    bevelSize: Math.min(halfT, halfWTip) * 0.55,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // Lay flat in XY with length along +X (radial), thickness along Z.
  geometry.translate(0, 0, -size.bladeThickness * 0.5);
  return geometry;
}
/**
 * @param {typeof import("three")} THREE
 * @param {import("three").CanvasTexture} texture
 */
function configureLabelTexture(THREE, texture) {
  if ("SRGBColorSpace" in THREE) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ("sRGBEncoding" in THREE) {
    texture.encoding = THREE.sRGBEncoding;
  }
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

/**
 * Build the Decision Core artifact.
 *
 * Hierarchy (preserved architecture):
 * group → placement → interaction → anim → core + segments
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   origin?: { u: number, vTop: number },
 *   transform?: typeof PROFESSIONAL_CARD_TRANSFORM,
 *   size?: typeof DECISION_CORE_SIZE,
 * }} [options]
 */
export function createDecisionCore3D(THREE, options = {}) {
  const origin = options.origin ?? PROFESSIONAL_CARD_ORIGIN;
  const transform = options.transform ?? PROFESSIONAL_CARD_TRANSFORM;
  const size = { ...DECISION_CORE_SIZE, ...options.size };
  const interactionConfig = PROFESSIONAL_CARD_INTERACTION;
  const plane = createDocumentPlane();
  const worldOrigin = plane.toWorldFromTopLeft(origin.u, origin.vTop, DOCUMENT_PLANE_Z);

  const disposables = [];
  const group = new THREE.Group();
  group.name = "ar-decision-core";
  group.userData.kind = "ar-decision-core";
  group.userData.documentPlane = plane;
  group.userData.calibration = { origin, transform, size };
  group.userData.riseAxis = "z";

  const placement = new THREE.Group();
  placement.name = "ar-decision-core-placement";
  placement.position.set(
    worldOrigin.x + transform.position.x,
    worldOrigin.y + transform.position.y,
    worldOrigin.z + transform.position.z,
  );
  group.add(placement);

  const interaction = new THREE.Group();
  interaction.name = "ar-decision-core-interaction";
  interaction.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  interaction.scale.setScalar(transform.scale);
  placement.add(interaction);

  const anim = new THREE.Group();
  anim.name = "ar-decision-core-anim";
  interaction.add(anim);

  const initialInteraction = {
    rotation: { ...transform.rotation },
    scale: transform.scale,
  };

  function resetInteractionPose() {
    interaction.rotation.set(
      initialInteraction.rotation.x,
      initialInteraction.rotation.y,
      initialInteraction.rotation.z,
    );
    interaction.scale.setScalar(initialInteraction.scale);
  }

  // --- Materials (one family, shared) ---
  const graphiteMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DECISION_CORE_MATERIALS.graphite),
    metalness: 0.72,
    roughness: 0.42,
    transparent: true,
    opacity: 1,
  });
  graphiteMaterial.userData.baseOpacity = 1;
  disposables.push(graphiteMaterial);

  const aluminiumMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DECISION_CORE_MATERIALS.aluminium),
    metalness: 0.88,
    roughness: 0.26,
    transparent: true,
    opacity: 1,
  });
  aluminiumMaterial.userData.baseOpacity = 1;
  disposables.push(aluminiumMaterial);

  const Physical =
    "MeshPhysicalMaterial" in THREE ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const glassMaterial = new Physical({
    color: new THREE.Color(DECISION_CORE_MATERIALS.glass),
    metalness: 0.05,
    roughness: 0.12,
    transparent: true,
    opacity: 0.28,
    ...(Physical === THREE.MeshPhysicalMaterial
      ? { transmission: 0.55, thickness: 0.35, ior: 1.4 }
      : {}),
  });
  glassMaterial.userData.baseOpacity = glassMaterial.opacity;
  disposables.push(glassMaterial);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DECISION_CORE_MATERIALS.cyanDeep),
    emissive: new THREE.Color(DECISION_CORE_MATERIALS.cyan),
    emissiveIntensity: DECISION_CORE_GLOW.idle,
    metalness: 0.35,
    roughness: 0.35,
    transparent: true,
    opacity: 1,
  });
  coreMaterial.userData.baseOpacity = 1;
  coreMaterial.userData.baseEmissive = DECISION_CORE_GLOW.idle;
  disposables.push(coreMaterial);

  const edgeAccentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DECISION_CORE_MATERIALS.cyan),
    emissive: new THREE.Color(DECISION_CORE_MATERIALS.cyan),
    emissiveIntensity: 0.12,
    metalness: 0.4,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  edgeAccentMaterial.userData.baseOpacity = 0.85;
  disposables.push(edgeAccentMaterial);

  // --- Core assembly ---
  const coreGroup = new THREE.Group();
  coreGroup.name = "ar-decision-core-hub";
  anim.add(coreGroup);

  const innerCoreGeom = new THREE.SphereGeometry(size.coreRadius, 24, 18);
  disposables.push(innerCoreGeom);
  const innerCore = new THREE.Mesh(innerCoreGeom, coreMaterial);
  innerCore.name = "ar-decision-core-inner";
  coreGroup.add(innerCore);

  const shellGeom = new THREE.SphereGeometry(size.coreShellRadius, 24, 18);
  disposables.push(shellGeom);
  const shell = new THREE.Mesh(shellGeom, glassMaterial);
  shell.name = "ar-decision-core-shell";
  coreGroup.add(shell);

  const hubGeom = new THREE.TorusGeometry(size.hubRadius, size.hubTube, 10, 36);
  disposables.push(hubGeom);
  const hub = new THREE.Mesh(hubGeom, aluminiumMaterial);
  hub.name = "ar-decision-core-ring";
  hub.rotation.x = Math.PI / 2;
  coreGroup.add(hub);

  // Thin equatorial accent ring
  const accentGeom = new THREE.TorusGeometry(size.hubRadius + 0.01, size.hubTube * 0.35, 8, 36);
  disposables.push(accentGeom);
  const accent = new THREE.Mesh(accentGeom, edgeAccentMaterial);
  accent.rotation.x = Math.PI / 2;
  coreGroup.add(accent);

  // --- Six blades (shared geometry) ---
  const bladeGeometry = createBladeGeometry(THREE, size);
  disposables.push(bladeGeometry);

  /** @type {Array<ReturnType<typeof createSegment>>} */
  const segments = [];

  function createSegment(stage, index) {
    const angle = (index / DECISION_CORE_STAGES.length) * Math.PI * 2 - Math.PI / 2;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);

    const segment = new THREE.Group();
    segment.name = `ar-decision-core-segment-${stage.id}`;
    segment.userData.kind = "ar-decision-core-segment";
    segment.userData.stageId = stage.id;
    segment.userData.stageIndex = index;

    const restRadius = size.hubRadius + 0.012;
    const expandRadius = restRadius + size.expandDistance;

    const carrier = new THREE.Group();
    carrier.name = `ar-decision-core-carrier-${stage.id}`;
    carrier.position.copy(dir.clone().multiplyScalar(restRadius));
    carrier.position.z = size.bladeLift;
    // Face the blade tip outward.
    carrier.rotation.z = angle;
    segment.add(carrier);

    const blade = new THREE.Mesh(bladeGeometry, graphiteMaterial);
    blade.name = `ar-decision-core-blade-${stage.id}`;
    blade.userData.stageId = stage.id;
    blade.castShadow = false;
    blade.receiveShadow = false;
    carrier.add(blade);

    // Aluminium inlay ridge for a precision-machined read
    const inlayGeom = new THREE.BoxGeometry(
      size.bladeLength * 0.48,
      size.bladeWidth * 0.16,
      size.bladeThickness * 0.28,
    );
    disposables.push(inlayGeom);
    const inlay = new THREE.Mesh(inlayGeom, aluminiumMaterial);
    inlay.position.set(size.bladeLength * 0.42, 0, size.bladeThickness * 0.42);
    carrier.add(inlay);

    // Label plane (hidden)
    const labelCanvas = createDecisionCoreLabelCanvas(stage.label, {
      width: 256,
      height: 64,
      fontSize: 30,
    });
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    configureLabelTexture(THREE, labelTexture);
    disposables.push(labelTexture);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    labelMat.userData.baseOpacity = 1;
    disposables.push(labelMat);
    const labelGeom = new THREE.PlaneGeometry(0.11, 0.028);
    disposables.push(labelGeom);
    const label = new THREE.Mesh(labelGeom, labelMat);
    label.name = `ar-decision-core-label-${stage.id}`;
    label.position.copy(dir.clone().multiplyScalar(size.labelOffset));
    label.position.z = 0.03;
    label.visible = false;
    segment.add(label);

    // Framework tokens (hidden)
    const tokens = stage.tokens.map((tokenText, tokenIndex) => {
      const canvas = createDecisionCoreLabelCanvas(tokenText, {
        width: 220,
        height: 48,
        fontSize: 18,
        weight: "500",
        color: DECISION_CORE_MATERIALS.tokenText,
        background: DECISION_CORE_MATERIALS.tokenBg,
      });
      const texture = new THREE.CanvasTexture(canvas);
      configureLabelTexture(THREE, texture);
      disposables.push(texture);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      mat.userData.baseOpacity = 1;
      disposables.push(mat);
      const geom = new THREE.PlaneGeometry(0.092, 0.02);
      disposables.push(geom);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `ar-decision-core-token-${stage.id}-${tokenIndex}`;
      const spread = (tokenIndex - (stage.tokens.length - 1) / 2) * 0.028;
      const tangential = new THREE.Vector3(-dir.y, dir.x, 0);
      mesh.position
        .copy(dir.clone().multiplyScalar(size.tokenRadius))
        .add(tangential.multiplyScalar(spread));
      mesh.position.z = 0.034;
      mesh.visible = false;
      segment.add(mesh);
      return mesh;
    });

    anim.add(segment);

    return {
      id: stage.id,
      stageLabel: stage.label,
      tokens: stage.tokens,
      group: segment,
      carrier,
      blade,
      label,
      tokenMeshes: tokens,
      dir,
      restRadius,
      expandRadius,
      expanded: false,
      tokensOpen: false,
    };
  }

  DECISION_CORE_STAGES.forEach((stage, index) => {
    segments.push(createSegment(stage, index));
  });

  function setCoreGlow(intensity) {
    const value = Math.max(0, intensity);
    coreMaterial.emissiveIntensity = value;
    coreMaterial.needsUpdate = true;
  }

  function setObjectOpacity(opacity) {
    const value = Math.min(Math.max(opacity, 0), 1);
    group.traverse((node) => {
      if (!node.material) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material || !("opacity" in material)) return;
        material.transparent = true;
        const base = material.userData?.baseOpacity ?? 1;
        // Labels/tokens keep their own reveal opacity unless fully hidden by parent fade.
        if (node.name?.includes("-label-") || node.name?.includes("-token-")) {
          if (value < 0.05) {
            material.opacity = 0;
          }
          return;
        }
        material.opacity = value * base;
        material.depthWrite = value > 0.9 || !material.transparent;
        material.needsUpdate = true;
      });
    });
  }

  function getOpacity() {
    const base = coreMaterial.userData?.baseOpacity ?? 1;
    return base > 0 ? coreMaterial.opacity / base : 0;
  }

  setObjectOpacity(0);
  group.visible = false;

  return {
    group,
    root: placement,
    placement,
    interaction,
    anim,
    coreMaterial,
    segments,
    size,
    riseHeight: transform.riseHeight,
    initialRotation: { ...transform.rotation },
    initialScale: transform.scale,
    interactionConfig,
    riseAxis: "z",
    resetInteractionPose,
    setCoreGlow,
    setOpacity: setObjectOpacity,
    getOpacity,
    /** Alias for animation helper compatibility */
    outlineMaterial: null,
    dispose() {
      group.removeFromParent?.();
      disposables.forEach((item) => {
        try {
          item.dispose?.();
        } catch {
          // ignore
        }
      });
      disposables.length = 0;
    },
  };
}

/** @param {ReturnType<typeof createDecisionCore3D>} artifact */
export function setDecisionCoreOpacity(artifact, opacity) {
  artifact.setOpacity(opacity);
}

/** @param {ReturnType<typeof createDecisionCore3D>} artifact */
export function getDecisionCoreOpacity(artifact) {
  if (typeof artifact?.getOpacity === "function") return artifact.getOpacity();
  const material = artifact?.coreMaterial;
  if (!material || !("opacity" in material)) return 0;
  const base = material.userData?.baseOpacity ?? 1;
  return base > 0 ? material.opacity / base : 0;
}
