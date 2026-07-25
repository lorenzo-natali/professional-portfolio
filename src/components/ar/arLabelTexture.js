/**
 * Lightweight canvas labels for AR document-plane meshes (not sprites).
 * CanvasTextures are rendered at devicePixelRatio-aware resolution for crisp text.
 */

export const LABEL_DPR_CAP = 3;

/**
 * Resolve a capped device pixel ratio for canvas rasterization.
 * @param {number} [override]
 */
export function resolveLabelDevicePixelRatio(override) {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.min(override, LABEL_DPR_CAP);
  }
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 1), LABEL_DPR_CAP);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {{ preferTwoLine?: boolean }} [options]
 */
export function wrapLabelLines(ctx, text, maxWidth, options = {}) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];

  if (options.preferTwoLine && words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    const candidate = [
      words.slice(0, mid).join(" "),
      words.slice(mid).join(" "),
    ];
    if (candidate.every((line) => ctx.measureText(line).width <= maxWidth)) {
      return candidate;
    }
  }

  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/**
 * @param {string} text
 * @param {{
 *   fontSize?: number,
 *   color?: string,
 *   paddingX?: number,
 *   paddingY?: number,
 *   background?: string | null,
 *   devicePixelRatio?: number,
 *   maxTextWidth?: number,
 *   preferTwoLine?: boolean,
 * }} [options]
 */
export function createLabelCanvas(text, options = {}) {
  const fontSize = options.fontSize ?? 42;
  const color = options.color ?? "#ffffff";
  const paddingX = options.paddingX ?? 16;
  const paddingY = options.paddingY ?? 11;
  const background = options.background ?? "rgba(10, 18, 24, 0.58)";
  const dpr = resolveLabelDevicePixelRatio(options.devicePixelRatio);
  const preferTwoLine = options.preferTwoLine ?? true;
  // Prefer compact plates: default wrap width ~9em.
  let maxTextWidth = options.maxTextWidth ?? Math.round(fontSize * 9);

  const measure = document.createElement("canvas");
  const measureCtx = measure.getContext("2d");
  if (!measureCtx) throw new Error("Canvas 2D unavailable");

  const font = `500 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  measureCtx.font = font;

  let lines = wrapLabelLines(measureCtx, text, maxTextWidth, { preferTwoLine });
  // Tighten wrap until plate aspect stays moderate.
  let guard = 0;
  while (guard < 6) {
    const textW = Math.ceil(Math.max(...lines.map((line) => measureCtx.measureText(line).width)));
    const textH = Math.ceil(fontSize * 1.2) * lines.length;
    const aspect = (textW + paddingX * 2) / Math.max(1, textH + paddingY * 2);
    if (aspect <= 3.2 || maxTextWidth < fontSize * 4) break;
    maxTextWidth = Math.round(maxTextWidth * 0.82);
    lines = wrapLabelLines(measureCtx, text, maxTextWidth, { preferTwoLine });
    guard += 1;
  }

  const lineHeight = Math.ceil(fontSize * 1.2);
  const textW = Math.ceil(Math.max(...lines.map((line) => measureCtx.measureText(line).width)));
  const textH = lineHeight * lines.length;
  const logicalW = textW + paddingX * 2;
  const logicalH = textH + paddingY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(logicalW * dpr));
  canvas.height = Math.max(1, Math.round(logicalH * dpr));
  canvas.style.width = `${logicalW}px`;
  canvas.style.height = `${logicalH}px`;
  canvas.dataset.logicalWidth = String(logicalW);
  canvas.dataset.logicalHeight = String(logicalH);
  canvas.dataset.devicePixelRatio = String(dpr);
  canvas.dataset.lineCount = String(lines.length);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (background) {
    const r = 6;
    roundRect(ctx, 0, 0, logicalW, logicalH, r);
    ctx.fillStyle = background;
    ctx.fill();
  }

  ctx.fillStyle = color;
  const startY = logicalH / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, logicalW / 2, startY + index * lineHeight + 1);
  });
  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * @param {typeof import("three")} THREE
 * @param {string} text
 * @param {{
 *   worldHeight?: number,
 *   maxWorldWidth?: number,
 *   color?: string,
 *   background?: string | null,
 *   devicePixelRatio?: number,
 *   preferTwoLine?: boolean,
 * }} [options]
 */
export function createLabelMesh(THREE, text, options = {}) {
  let worldHeight = options.worldHeight ?? 0.042;
  const maxWorldWidth = options.maxWorldWidth ?? 0.22;
  const canvas = createLabelCanvas(text, {
    color: options.color,
    background: options.background,
    devicePixelRatio: options.devicePixelRatio,
    preferTwoLine: options.preferTwoLine ?? true,
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace ?? texture.colorSpace;
  }
  const dpr = Number(canvas.dataset.devicePixelRatio || 1);
  if (Number.isInteger(dpr)) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
  }

  const logicalW = Number(canvas.dataset.logicalWidth) || canvas.width;
  const logicalH = Number(canvas.dataset.logicalHeight) || canvas.height;
  let aspect = logicalW / Math.max(1, logicalH);
  let worldWidth = worldHeight * aspect;
  if (worldWidth > maxWorldWidth) {
    worldWidth = maxWorldWidth;
    worldHeight = worldWidth / aspect;
  }

  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ar-label:${text}`;
  mesh.userData.kind = "ar-label";
  mesh.userData.labelText = text;
  mesh.userData.worldHeight = worldHeight;
  mesh.userData.worldWidth = worldWidth;
  mesh.userData.disposables = [geometry, material, texture];
  return mesh;
}

/** Dispose label mesh resources. */
export function disposeObject3DResources(object) {
  if (!object) return;
  object.traverse((node) => {
    const extras = node.userData?.disposables;
    if (Array.isArray(extras)) {
      extras.forEach((item) => item?.dispose?.());
      node.userData.disposables = [];
    }
    if (node.geometry) node.geometry.dispose?.();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((mat) => {
        mat.map?.dispose?.();
        mat.dispose?.();
      });
    }
  });
}
