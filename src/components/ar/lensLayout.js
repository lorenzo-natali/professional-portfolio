import { createDocumentPlane } from "./arDocumentPlane";
import {
  isInsideQrAvoidZone,
  resolveEvidenceAnchor,
} from "./cvEvidenceAnchors";
import {
  LABEL_HEIGHT,
  LABEL_MAX_WIDTH,
  MAX_SIMULTANEOUS_ANNOTATIONS,
  PAGE_SAFE_MARGIN,
  getLensAnnotations,
} from "./lensCatalog";

/**
 * @typedef {{ uMin: number, uMax: number, vTopMin: number, vTopMax: number }} NormAABB
 * @typedef {{
 *   id: string,
 *   text: string,
 *   evidence: { u: number, vTop: number, x: number, y: number, z: number },
 *   label: { u: number, vTop: number, x: number, y: number, z: number, halfW: number, halfH: number },
 *   leaderEnd: { x: number, y: number, z: number },
 *   worldWidth: number,
 *   worldHeight: number,
 *   aabb: NormAABB,
 * }} ResolvedAnnotation
 */

export function aabbOverlap(a, b) {
  return !(a.uMax <= b.uMin || a.uMin >= b.uMax || a.vTopMax <= b.vTopMin || a.vTopMin >= b.vTopMax);
}

export function makeAabb(u, vTop, halfW, halfH, plane) {
  const du = halfW / plane.width;
  const dv = halfH / plane.height;
  return {
    uMin: u - du,
    uMax: u + du,
    vTopMin: vTop - dv,
    vTopMax: vTop + dv,
  };
}

export function clampLabelCenter(u, vTop, halfW, halfH, plane, margin = PAGE_SAFE_MARGIN) {
  const du = halfW / plane.width;
  const dv = halfH / plane.height;
  const uMin = margin + du;
  const uMax = 1 - margin - du;
  const vMin = margin + dv;
  const vMax = 1 - margin - dv;
  return {
    u: Math.min(uMax, Math.max(uMin, u)),
    vTop: Math.min(vMax, Math.max(vMin, vTop)),
  };
}

/** Nearest plate-edge point from label center toward the evidence (leader terminus). */
export function leaderEndOnPlateEdge(evidence, labelCenter, halfW, halfH, z) {
  const dx = evidence.x - labelCenter.x;
  const dy = evidence.y - labelCenter.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return { x: labelCenter.x - halfW, y: labelCenter.y, z };
  }
  const tX = Math.abs(dx) < 1e-9 ? Infinity : halfW / Math.abs(dx);
  const tY = Math.abs(dy) < 1e-9 ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(tX, tY);
  return {
    x: labelCenter.x + dx * t,
    y: labelCenter.y + dy * t,
    z,
  };
}

function aabbHitsQr(aabb) {
  const samples = [
    [aabb.uMin, aabb.vTopMin],
    [aabb.uMax, aabb.vTopMin],
    [aabb.uMin, aabb.vTopMax],
    [aabb.uMax, aabb.vTopMax],
    [(aabb.uMin + aabb.uMax) / 2, (aabb.vTopMin + aabb.vTopMax) / 2],
  ];
  return samples.some(([u, v]) => isInsideQrAvoidZone(u, v));
}

function pushOutOfQr(u, vTop, halfW, halfH, plane) {
  let next = { u, vTop };
  let guard = 0;
  while (guard < 12) {
    const aabb = makeAabb(next.u, next.vTop, halfW, halfH, plane);
    if (!aabbHitsQr(aabb)) break;
    // Deterministic: slide left and slightly down, away from upper-right QR.
    next = clampLabelCenter(next.u - 0.03, next.vTop + 0.015, halfW, halfH, plane);
    guard += 1;
  }
  return next;
}

/**
 * Estimate plate size for layout before mesh creation.
 * Prefers compact two-line wrapping under LABEL_MAX_WIDTH.
 */
export function estimateLabelPlate(text, {
  worldHeight = LABEL_HEIGHT,
  maxWorldWidth = LABEL_MAX_WIDTH,
} = {}) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines =
    words.length >= 2
      ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
      : [text];
  // Approximate glyph metrics for layout (Safari-safe bias toward wider plates).
  const fontSize = 42;
  const padX = 18;
  const padY = 12;
  const lineHeight = Math.ceil(fontSize * 1.2);
  const charW = fontSize * 0.56;
  const textW = Math.max(...lines.map((line) => line.length * charW));
  const logicalW = textW + padX * 2;
  const logicalH = lineHeight * lines.length + padY * 2;
  let aspect = logicalW / Math.max(1, logicalH);
  let width = worldHeight * aspect;
  let height = worldHeight;
  if (width > maxWorldWidth) {
    width = maxWorldWidth;
    height = width / aspect;
    // Keep height in the readable band when possible.
    if (height < 0.035) {
      height = 0.035;
      width = Math.min(maxWorldWidth, height * aspect);
    }
  }
  return {
    lines,
    worldWidth: width,
    worldHeight: height,
    halfW: width / 2,
    halfH: height / 2,
  };
}

/**
 * Resolve configured annotations into validated world placements.
 * @param {string} lensId
 * @param {{ plane?: ReturnType<typeof createDocumentPlane>, labelZ?: number, evidenceZ?: number }} [options]
 * @returns {ResolvedAnnotation[]}
 */
export function resolveLensLayout(lensId, options = {}) {
  const plane = options.plane ?? createDocumentPlane();
  const labelZ = options.labelZ ?? 0.011;
  const evidenceZ = options.evidenceZ ?? 0.01;
  const configured = getLensAnnotations(lensId).slice(0, MAX_SIMULTANEOUS_ANNOTATIONS);

  /** @type {ResolvedAnnotation[]} */
  const resolved = [];

  configured.forEach((annotation) => {
    const evidenceUv = resolveEvidenceAnchor(annotation.evidenceAnchorId);
    const evidenceWorld = plane.toWorldFromTopLeft(evidenceUv.u, evidenceUv.vTop, evidenceZ);
    const plate = estimateLabelPlate(annotation.text);
    let labelUv = clampLabelCenter(
      annotation.labelUv.u,
      annotation.labelUv.vTop,
      plate.halfW,
      plate.halfH,
      plane,
    );
    labelUv = pushOutOfQr(labelUv.u, labelUv.vTop, plate.halfW, plate.halfH, plane);

    // Deterministic collision correction against already placed labels.
    let aabb = makeAabb(labelUv.u, labelUv.vTop, plate.halfW, plate.halfH, plane);
    let attempts = 0;
    while (attempts < 10 && resolved.some((item) => aabbOverlap(aabb, item.aabb))) {
      labelUv = clampLabelCenter(labelUv.u, labelUv.vTop + 0.022, plate.halfW, plate.halfH, plane);
      labelUv = pushOutOfQr(labelUv.u, labelUv.vTop, plate.halfW, plate.halfH, plane);
      aabb = makeAabb(labelUv.u, labelUv.vTop, plate.halfW, plate.halfH, plane);
      attempts += 1;
    }

    const labelWorld = plane.toWorldFromTopLeft(labelUv.u, labelUv.vTop, labelZ);
    const leaderEnd = leaderEndOnPlateEdge(
      evidenceWorld,
      labelWorld,
      plate.halfW,
      plate.halfH,
      labelZ,
    );

    resolved.push({
      id: annotation.id,
      text: annotation.text,
      evidence: {
        u: evidenceUv.u,
        vTop: evidenceUv.vTop,
        x: evidenceWorld.x,
        y: evidenceWorld.y,
        z: evidenceZ,
      },
      label: {
        u: labelUv.u,
        vTop: labelUv.vTop,
        x: labelWorld.x,
        y: labelWorld.y,
        z: labelZ,
        halfW: plate.halfW,
        halfH: plate.halfH,
      },
      leaderEnd,
      worldWidth: plate.worldWidth,
      worldHeight: plate.worldHeight,
      aabb,
    });
  });

  return resolved;
}

export function validateLensLayout(resolved, plane = createDocumentPlane(), margin = PAGE_SAFE_MARGIN) {
  const errors = [];
  if (resolved.length > MAX_SIMULTANEOUS_ANNOTATIONS) {
    errors.push(`annotation count ${resolved.length} exceeds ${MAX_SIMULTANEOUS_ANNOTATIONS}`);
  }
  resolved.forEach((item) => {
    if (item.worldWidth > LABEL_MAX_WIDTH + 1e-6) {
      errors.push(`${item.id} width ${item.worldWidth} exceeds max`);
    }
    if (item.aabb.uMin < margin - 1e-6 || item.aabb.uMax > 1 - margin + 1e-6) {
      errors.push(`${item.id} leaves horizontal safe area`);
    }
    if (item.aabb.vTopMin < margin - 1e-6 || item.aabb.vTopMax > 1 - margin + 1e-6) {
      errors.push(`${item.id} leaves vertical safe area`);
    }
    if (aabbHitsQr(item.aabb)) {
      errors.push(`${item.id} intersects QR avoid zone`);
    }
    // Leader must land on plate edge (distance from center ≈ half-extent along axis).
    const dx = Math.abs(item.leaderEnd.x - item.label.x);
    const dy = Math.abs(item.leaderEnd.y - item.label.y);
    const onVerticalEdge = Math.abs(dx - item.label.halfW) < 1e-4 && dy <= item.label.halfH + 1e-4;
    const onHorizontalEdge = Math.abs(dy - item.label.halfH) < 1e-4 && dx <= item.label.halfW + 1e-4;
    if (!onVerticalEdge && !onHorizontalEdge) {
      errors.push(`${item.id} leader does not terminate on plate edge`);
    }
  });
  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      if (aabbOverlap(resolved[i].aabb, resolved[j].aabb)) {
        errors.push(`${resolved[i].id} overlaps ${resolved[j].id}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, plane };
}
