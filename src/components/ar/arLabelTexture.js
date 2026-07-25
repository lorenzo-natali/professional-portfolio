/**
 * Lightweight canvas labels for AR meshes (no external font assets).
 */

/**
 * @param {string} text
 * @param {{ fontSize?: number, color?: string, paddingX?: number, paddingY?: number, background?: string | null }} [options]
 */
export function createLabelCanvas(text, options = {}) {
  const fontSize = options.fontSize ?? 42;
  const color = options.color ?? "#ecfeff";
  const paddingX = options.paddingX ?? 18;
  const paddingY = options.paddingY ?? 12;
  const background = options.background ?? "rgba(2, 6, 23, 0.55)";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const font = `500 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textW = Math.ceil(metrics.width);
  const textH = Math.ceil(fontSize * 1.2);

  canvas.width = textW + paddingX * 2;
  canvas.height = textH + paddingY * 2;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (background) {
    const r = 10;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, r);
    ctx.fillStyle = background;
    ctx.fill();
  }

  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
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
 * @param {{ worldHeight?: number, color?: string, background?: string | null }} [options]
 */
export function createLabelMesh(THREE, text, options = {}) {
  const worldHeight = options.worldHeight ?? 0.032;
  const canvas = createLabelCanvas(text, {
    color: options.color,
    background: options.background,
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace ?? texture.colorSpace;
  }

  const aspect = canvas.width / Math.max(1, canvas.height);
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
