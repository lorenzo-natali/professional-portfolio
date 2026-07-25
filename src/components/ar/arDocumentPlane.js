/** Pixel size of the compiled CV page-1 MindAR source image. */
export const CV_PAGE1_PIXEL_WIDTH = 1820;
export const CV_PAGE1_PIXEL_HEIGHT = 2574;

/** MindAR world units: target width = 1; height preserves source aspect. */
export const DOCUMENT_WIDTH = 1;
export const DOCUMENT_HEIGHT = CV_PAGE1_PIXEL_HEIGHT / CV_PAGE1_PIXEL_WIDTH;

/** Slight lift above the tracked plane to avoid z-fighting with the paper. */
export const DOCUMENT_PLANE_Z = 0.006;

/**
 * Document-plane coordinate system for content attached to the MindAR image anchor.
 *
 * Normalized coordinates (u, v):
 * - u: 0 at left edge → 1 at right edge
 * - v: 0 at bottom edge → 1 at top edge (Three.js Y-up)
 *
 * @param {{ width?: number, height?: number, margin?: number }} [options]
 * margin is a fraction of width/height inset from each edge (0–0.45).
 */
export function createDocumentPlane({
  width = DOCUMENT_WIDTH,
  height = DOCUMENT_HEIGHT,
  margin = 0,
} = {}) {
  const clampedMargin = Math.min(Math.max(margin, 0), 0.45);
  const halfW = width / 2;
  const halfH = height / 2;
  const mx = width * clampedMargin;
  const my = height * clampedMargin;
  const contentWidth = width - 2 * mx;
  const contentHeight = height - 2 * my;

  return {
    width,
    height,
    margin: clampedMargin,
    left: -halfW,
    right: halfW,
    top: halfH,
    bottom: -halfH,
    contentLeft: -halfW + mx,
    contentRight: halfW - mx,
    contentTop: halfH - my,
    contentBottom: -halfH + my,
    contentWidth,
    contentHeight,

    /**
     * Convert normalized document coordinates to Three.js local/world offset on the anchor.
     * @param {number} u 0…1 left→right
     * @param {number} v 0…1 bottom→top
     * @param {number} [z]
     */
    toWorld(u, v, z = 0) {
      const uu = Math.min(Math.max(u, 0), 1);
      const vv = Math.min(Math.max(v, 0), 1);
      return {
        x: -halfW + mx + uu * contentWidth,
        y: -halfH + my + vv * contentHeight,
        z,
      };
    },

    /** Same as toWorld but with v measured from the top edge (design-tool style). */
    toWorldFromTopLeft(u, v, z = 0) {
      return this.toWorld(u, 1 - v, z);
    },

    /**
     * Inverse of toWorldFromTopLeft for calibration / overlap tests.
     * @param {number} x
     * @param {number} y
     */
    toTopLeftFromWorld(x, y) {
      const u = (x - (-halfW + mx)) / contentWidth;
      const vBottom = (y - (-halfH + my)) / contentHeight;
      return {
        u: Math.min(Math.max(u, 0), 1),
        vTop: Math.min(Math.max(1 - vBottom, 0), 1),
      };
    },
  };
}

export const DEFAULT_DOCUMENT_PLANE = createDocumentPlane();
