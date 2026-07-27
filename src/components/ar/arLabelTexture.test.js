import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  LABEL_DPR_CAP,
  createLabelCanvas,
  createLabelMesh,
  resolveLabelDevicePixelRatio,
} from "./arLabelTexture";

/** Document-plane label sizing used by createLabelMesh max-width enforcement. */
const LABEL_HEIGHT = 0.042;
const LABEL_MAX_WIDTH = 0.22;

describe("arLabelTexture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps device pixel ratio for lightweight canvas sizing", () => {
    expect(resolveLabelDevicePixelRatio(1)).toBe(1);
    expect(resolveLabelDevicePixelRatio(4)).toBe(LABEL_DPR_CAP);
  });

  it("prefers compact multi-line wrapping for long labels", () => {
    const canvas = createLabelCanvas("Operational Resilience", {
      devicePixelRatio: 2,
      preferTwoLine: true,
    });
    expect(Number(canvas.dataset.lineCount)).toBeGreaterThanOrEqual(2);
    expect(canvas.width).toBe(Math.round(Number(canvas.dataset.logicalWidth) * 2));
  });

  it("enforces max world width on document-oriented plane meshes", () => {
    const mesh = createLabelMesh(THREE, "Operational Resilience", {
      worldHeight: LABEL_HEIGHT,
      maxWorldWidth: LABEL_MAX_WIDTH,
      devicePixelRatio: 2,
      preferTwoLine: true,
    });

    expect(mesh.isMesh).toBe(true);
    expect(mesh.isSprite).toBeFalsy();
    expect(mesh.userData.worldWidth).toBeLessThanOrEqual(LABEL_MAX_WIDTH + 1e-6);
    expect(mesh.geometry.parameters.width).toBeLessThanOrEqual(LABEL_MAX_WIDTH + 1e-6);

    mesh.userData.disposables.forEach((d) => d.dispose?.());
  });
});
