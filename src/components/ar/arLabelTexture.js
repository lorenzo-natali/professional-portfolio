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
 * Wrap label copy so document-plane plates stay compact enough for iPhone framing.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 */
function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];
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
 * }} [options]
 */
export function createLabelCanvas(text, options = {}) {
  const fontSize = options.fontSize ?? 48;
  const color = options.color ?? "#ffffff";
  const paddingX = options.paddingX ?? 22;
  const paddingY = options.paddingY ?? 16;
  const background = options.background ?? "rgba(10, 18, 24, 0.62)";
  const dpr = resolveLabelDevicePixelRatio(options.devicePixelRatio);
  const maxTextWidth = options.maxTextWidth ?? Math.round(fontSize * 12);

  const measure = document.createElement("canvas");
  const measureCtx = measure.getContext("2d");
  if (!measureCtx) throw new Error("Canvas 2D unavailable");

  const font = `500 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  measureCtx.font = font;
  const lines = wrapLines(measureCtx, text, maxTextWidth);
  const lineHeight = Math.ceil(fontSize * 1.2);
  const textW = Math.ceil(Math.max(...lines.map((line) => measureCtx.measureText(line).width)));
  const textH = lineHeight * lines.length;

  const logicalW = textW + paddingX * 2;
  const logicalH = textH + paddingY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(logicalW * dpr));
  canvas.height = Math.max(1, Math.round(logicalH * dpr));
  // Preserve CSS/logical size metadata for aspect math and tests.
  canvas.style.width = `${logicalW}px`;
  canvas.style.height = `${logicalH}px`;
  canvas.dataset.logicalWidth = String(logicalW);
  canvas.dataset.logicalHeight = String(logicalH);
  canvas.dataset.devicePixelRatio = String(dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (background) {
    const r = 8;
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
 *   color?: string,
 *   background?: string | null,
 *   devicePixelRatio?: number,
 * }} [options]
 */
export function createLabelMesh(THREE, text, options = {}) {
  const worldHeight = options.worldHeight ?? 0.08;
  const canvas = createLabelCanvas(text, {
    color: options.color,
    background: options.background,
    devicePixelRatio: options.devicePixelRatio,
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace ?? texture.colorSpace;
  }
  // Prefer nearest-neighbor when DPR is integer for sharper type; linear otherwise.
  const dpr = Number(canvas.dataset.devicePixelRatio || 1);
  if (Number.isInteger(dpr)) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
  }

  const logicalW = Number(canvas.dataset.logicalWidth) || canvas.width;
  const logicalH = Number(canvas.dataset.logicalHeight) || canvas.height;
  const aspect = logicalW / Math.max(1, logicalH);
  const geometry = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
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
