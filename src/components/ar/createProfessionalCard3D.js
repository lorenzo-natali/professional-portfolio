import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";
import { resolveLabelDevicePixelRatio } from "./arLabelTexture";
import {
  PROFESSIONAL_CARD_COLORS,
  PROFESSIONAL_CARD_CONTENT,
  PROFESSIONAL_CARD_INTERACTION,
  PROFESSIONAL_CARD_ORIGIN,
  PROFESSIONAL_CARD_SIZE,
  PROFESSIONAL_CARD_TRANSFORM,
} from "./professionalCardConfig";

/** Base CSS-pixel face size; multiplied by a capped DPR for Retina sharpness. */
const FACE_TEXTURE_CSS_WIDTH = 512;
const FACE_TEXTURE_CSS_HEIGHT = 300;
const FACE_TEXTURE_DPR_CAP = 2;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} radius
 */
function roundRectPath(ctx, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
}

/**
 * @param {"front" | "back"} face
 * @param {{ devicePixelRatio?: number }} [options]
 * @returns {HTMLCanvasElement}
 */
export function createProfessionalCardFaceCanvas(face, options = {}) {
  const dpr = Math.min(
    resolveLabelDevicePixelRatio(options.devicePixelRatio),
    FACE_TEXTURE_DPR_CAP,
  );
  const cssW = FACE_TEXTURE_CSS_WIDTH;
  const cssH = FACE_TEXTURE_CSS_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cssW;
  const h = cssH;
  const radius = Math.min(w, h) * 0.055;

  roundRectPath(ctx, w, h, radius);
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(0.55, PROFESSIONAL_CARD_COLORS.surface);
  gradient.addColorStop(1, "#071019");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Subtle top sheen — not a glow bloom.
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  sheen.addColorStop(0, "rgba(148, 163, 184, 0.10)");
  sheen.addColorStop(1, "rgba(148, 163, 184, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.45);

  // Thin cyan edge inset on the face plate (decorative; solid sides use mesh material).
  ctx.strokeStyle = PROFESSIONAL_CARD_COLORS.cyanSoft;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, w, h, radius);
  ctx.stroke();

  ctx.fillStyle = PROFESSIONAL_CARD_COLORS.cyan;
  ctx.fillRect(w * 0.08, h * 0.14, w * 0.08, 1.5);

  if (face === "front") {
    const { name, title, detail } = PROFESSIONAL_CARD_CONTENT.front;
    ctx.fillStyle = PROFESSIONAL_CARD_COLORS.text;
    ctx.font = '600 36px "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(name, w * 0.08, h * 0.22);

    ctx.fillStyle = PROFESSIONAL_CARD_COLORS.textMuted;
    ctx.font = '500 17px "Segoe UI", system-ui, -apple-system, sans-serif';
    wrapFillText(ctx, title, w * 0.08, h * 0.42, w * 0.84, 22);

    ctx.fillStyle = PROFESSIONAL_CARD_COLORS.cyan;
    ctx.font = '500 13px "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.fillText(detail, w * 0.08, h * 0.78);
  } else {
    const { lines, footer } = PROFESSIONAL_CARD_CONTENT.back;
    ctx.fillStyle = PROFESSIONAL_CARD_COLORS.text;
    ctx.font = '600 22px "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.textBaseline = "top";
    lines.forEach((line, index) => {
      ctx.fillText(line, w * 0.08, h * 0.22 + index * 36);
    });

    ctx.fillStyle = PROFESSIONAL_CARD_COLORS.textMuted;
    ctx.font = '500 15px "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.fillText(footer, w * 0.08, h * 0.78);
  }

  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 */
function wrapFillText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let line = "";
  let cursorY = y;
  for (let i = 0; i < words.length; i += 1) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

/**
 * @param {typeof import("three")} THREE
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function createRoundedRectShape(THREE, width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/**
 * @param {typeof import("three")} THREE
 * @param {import("three").CanvasTexture} texture
 */
function configureFaceTexture(THREE, texture) {
  if ("SRGBColorSpace" in THREE) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ("sRGBEncoding" in THREE) {
    texture.encoding = THREE.sRGBEncoding;
  }
  // Sharper close-up text on mobile; card stays near constant size so mipmaps add little.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
}

/**
 * Build a genuine shallow 3D professional card (body + front/back faces + outline).
 *
 * Coordinate system (MindAR image anchor / document plane):
 * - X: left → right on the CV
 * - Y: bottom → top on the CV
 * - Z: document-local normal (out of the page)
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   origin?: { u: number, vTop: number },
 *   transform?: typeof PROFESSIONAL_CARD_TRANSFORM,
 *   size?: typeof PROFESSIONAL_CARD_SIZE,
 * }} [options]
 */
export function createProfessionalCard3D(THREE, options = {}) {
  const origin = options.origin ?? PROFESSIONAL_CARD_ORIGIN;
  const transform = options.transform ?? PROFESSIONAL_CARD_TRANSFORM;
  const interactionConfig = options.interaction ?? PROFESSIONAL_CARD_INTERACTION;
  const size = options.size ?? PROFESSIONAL_CARD_SIZE;
  const plane = createDocumentPlane();
  const worldOrigin = plane.toWorldFromTopLeft(origin.u, origin.vTop, DOCUMENT_PLANE_Z);

  const disposables = [];
  const group = new THREE.Group();
  group.name = "ar-professional-card";
  group.userData.kind = "ar-professional-card";
  group.userData.documentPlane = plane;
  group.userData.calibration = { origin, transform, size, interaction: interactionConfig };
  group.userData.riseAxis = "z";

  // Centered placement on the CV — target-local, not screen-space.
  const placement = new THREE.Group();
  placement.name = "ar-professional-card-placement";
  placement.position.set(
    worldOrigin.x + transform.position.x,
    worldOrigin.y + transform.position.y,
    worldOrigin.z + transform.position.z,
  );
  group.add(placement);

  // Sole writer of user rotation / scale (gesture controller).
  const interaction = new THREE.Group();
  interaction.name = "ar-professional-card-interaction";
  interaction.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  interaction.scale.setScalar(transform.scale);
  placement.add(interaction);

  // Sole writer of entrance rise / fade pose (animation controller).
  const anim = new THREE.Group();
  anim.name = "ar-professional-card-anim";
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

  const shape = createRoundedRectShape(THREE, size.width, size.height, size.cornerRadius);
  const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: size.thickness,
    bevelEnabled: false,
    curveSegments: 10,
  });
  // Center thickness on local Z so faces sit at ±thickness/2 along the document normal.
  bodyGeometry.translate(0, 0, -size.thickness / 2);
  disposables.push(bodyGeometry);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PROFESSIONAL_CARD_COLORS.surfaceEdge),
    metalness: 0.35,
    roughness: 0.55,
    transparent: true,
    opacity: 1,
  });
  bodyMaterial.userData.baseOpacity = 1;
  disposables.push(bodyMaterial);

  // Solid side walls (ExtrudeGeometry materialIndex 0) — cyan edge of the volume.
  const edgeAccentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PROFESSIONAL_CARD_COLORS.cyan),
    metalness: 0.2,
    roughness: 0.4,
    transparent: true,
    opacity: 0.55,
    emissive: new THREE.Color(PROFESSIONAL_CARD_COLORS.cyan),
    emissiveIntensity: 0.08,
  });
  edgeAccentMaterial.userData.baseOpacity = 0.55;
  disposables.push(edgeAccentMaterial);

  const body = new THREE.Mesh(bodyGeometry, [edgeAccentMaterial, bodyMaterial]);
  body.name = "ar-professional-card-body";
  body.castShadow = false;
  body.receiveShadow = false;
  anim.add(body);

  const frontCanvas = createProfessionalCardFaceCanvas("front");
  const backCanvas = createProfessionalCardFaceCanvas("back");
  const frontTexture = new THREE.CanvasTexture(frontCanvas);
  const backTexture = new THREE.CanvasTexture(backCanvas);
  configureFaceTexture(THREE, frontTexture);
  configureFaceTexture(THREE, backTexture);
  disposables.push(frontTexture, backTexture);

  const faceGeometry = new THREE.PlaneGeometry(size.width * 0.985, size.height * 0.985);
  disposables.push(faceGeometry);

  // Slight lift off the extruded caps avoids z-fighting while keeping faces on the solid.
  const faceLift = Math.max(size.thickness * 0.04, 0.0006);

  const frontMaterial = new THREE.MeshBasicMaterial({
    map: frontTexture,
    transparent: true,
    opacity: 1,
    toneMapped: false,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  frontMaterial.userData.baseOpacity = 1;
  const backMaterial = new THREE.MeshBasicMaterial({
    map: backTexture,
    transparent: true,
    opacity: 1,
    toneMapped: false,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  backMaterial.userData.baseOpacity = 1;
  disposables.push(frontMaterial, backMaterial);

  const frontFace = new THREE.Mesh(faceGeometry, frontMaterial);
  frontFace.name = "ar-professional-card-front";
  frontFace.position.z = size.thickness / 2 + faceLift;
  anim.add(frontFace);

  const backFace = new THREE.Mesh(faceGeometry, backMaterial);
  backFace.name = "ar-professional-card-back";
  backFace.rotation.y = Math.PI;
  backFace.position.z = -(size.thickness / 2 + faceLift);
  anim.add(backFace);

  const outlineGeometry = new THREE.EdgesGeometry(bodyGeometry);
  disposables.push(outlineGeometry);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(PROFESSIONAL_CARD_COLORS.outline),
    transparent: true,
    opacity: 0,
    depthTest: true,
  });
  disposables.push(outlineMaterial);
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  outline.name = "ar-professional-card-outline";
  outline.renderOrder = 2;
  anim.add(outline);

  // Start invisible — animation controller drives reveal.
  setCardOpacity(group, 0);
  outlineMaterial.opacity = 0;
  group.visible = false;

  return {
    group,
    /** @deprecated use placement — kept as alias for older tests */
    root: placement,
    placement,
    interaction,
    anim,
    body,
    frontFace,
    backFace,
    outline,
    outlineMaterial,
    size,
    riseHeight: transform.riseHeight,
    initialRotation: { ...transform.rotation },
    initialScale: transform.scale,
    interactionConfig,
    /** Document-local normal axis used for rise. */
    riseAxis: "z",
    resetInteractionPose,
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

/**
 * @param {import("three").Object3D} object
 * @param {number} opacity
 */
export function setCardOpacity(object, opacity) {
  const value = Math.min(Math.max(opacity, 0), 1);
  object?.traverse((node) => {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material || !("opacity" in material)) return;
      if (node.name === "ar-professional-card-outline") return;
      material.transparent = true;
      material.opacity = value * (material.userData?.baseOpacity ?? 1);
      material.depthWrite = value > 0.92;
      material.needsUpdate = true;
    });
  });
}

/**
 * Read current card surface opacity (0–1), accounting for baseOpacity.
 * @param {ReturnType<typeof createProfessionalCard3D>} card
 */
export function getCardOpacity(card) {
  const material = card?.frontFace?.material;
  if (!material || !("opacity" in material)) return 0;
  const base = material.userData?.baseOpacity ?? 1;
  return base > 0 ? material.opacity / base : 0;
}
