import { describe, expect, it, vi, afterEach } from "vitest";
import * as THREE from "three";
import {
  LABEL_DPR_CAP,
  createLabelCanvas,
  createLabelMesh,
  resolveLabelDevicePixelRatio,
} from "./arLabelTexture";
import { LABEL_HEIGHT_STANDARD } from "./governanceLensConfig";

describe("arLabelTexture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps device pixel ratio for lightweight canvas sizing", () => {
    expect(resolveLabelDevicePixelRatio(1)).toBe(1);
    expect(resolveLabelDevicePixelRatio(2)).toBe(2);
    expect(resolveLabelDevicePixelRatio(4)).toBe(LABEL_DPR_CAP);
    expect(LABEL_DPR_CAP).toBeLessThanOrEqual(3);
  });

  it("renders canvases at DPR-aware resolution while preserving logical aspect", () => {
    const canvas = createLabelCanvas("Governance Lens Active", { devicePixelRatio: 2 });
    const logicalW = Number(canvas.dataset.logicalWidth);
    const logicalH = Number(canvas.dataset.logicalHeight);

    expect(canvas.width).toBe(Math.round(logicalW * 2));
    expect(canvas.height).toBe(Math.round(logicalH * 2));
    expect(logicalW).toBeGreaterThan(100);
    expect(logicalH).toBeGreaterThan(40);
  });

  it("creates document-oriented plane meshes (not sprites) at configured height", () => {
    const mesh = createLabelMesh(THREE, "Internal Audit", {
      worldHeight: LABEL_HEIGHT_STANDARD,
      devicePixelRatio: 2,
    });

    expect(mesh.isMesh).toBe(true);
    expect(mesh.isSprite).toBeFalsy();
    expect(mesh.geometry.type).toBe("PlaneGeometry");
    expect(mesh.userData.worldHeight).toBe(LABEL_HEIGHT_STANDARD);

    const params = mesh.geometry.parameters;
    expect(params.height).toBeCloseTo(LABEL_HEIGHT_STANDARD, 5);
    expect(params.width).toBeGreaterThan(params.height);

    mesh.userData.disposables.forEach((d) => d.dispose?.());
  });
});
