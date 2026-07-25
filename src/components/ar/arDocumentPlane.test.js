import { describe, expect, it } from "vitest";
import {
  CV_PAGE1_PIXEL_HEIGHT,
  CV_PAGE1_PIXEL_WIDTH,
  DOCUMENT_HEIGHT,
  DOCUMENT_PLANE_Z,
  DOCUMENT_WIDTH,
  createDocumentPlane,
} from "./arDocumentPlane";

describe("arDocumentPlane calibration", () => {
  it("derives document aspect from the compiled CV source image 1820×2574", () => {
    expect(CV_PAGE1_PIXEL_WIDTH).toBe(1820);
    expect(CV_PAGE1_PIXEL_HEIGHT).toBe(2574);
    expect(DOCUMENT_WIDTH).toBe(1);
    expect(DOCUMENT_HEIGHT).toBeCloseTo(2574 / 1820, 10);
    expect(DOCUMENT_HEIGHT).toBeGreaterThan(1);
  });

  it("exposes width, height, and edge bounds centered on the target origin", () => {
    const plane = createDocumentPlane();

    expect(plane.width).toBe(DOCUMENT_WIDTH);
    expect(plane.height).toBe(DOCUMENT_HEIGHT);
    expect(plane.left).toBeCloseTo(-0.5, 10);
    expect(plane.right).toBeCloseTo(0.5, 10);
    expect(plane.top).toBeCloseTo(DOCUMENT_HEIGHT / 2, 10);
    expect(plane.bottom).toBeCloseTo(-DOCUMENT_HEIGHT / 2, 10);
  });

  it("converts normalized document coordinates to world offsets", () => {
    const plane = createDocumentPlane();

    expect(plane.toWorld(0, 0)).toEqual({
      x: plane.left,
      y: plane.bottom,
      z: 0,
    });
    expect(plane.toWorld(1, 1)).toEqual({
      x: plane.right,
      y: plane.top,
      z: 0,
    });
    expect(plane.toWorld(0.5, 0.5, DOCUMENT_PLANE_Z)).toEqual({
      x: 0,
      y: 0,
      z: DOCUMENT_PLANE_Z,
    });
  });

  it("applies configurable safe margins to content bounds and toWorld", () => {
    const plane = createDocumentPlane({ margin: 0.1 });

    expect(plane.margin).toBe(0.1);
    expect(plane.contentWidth).toBeCloseTo(0.8, 10);
    expect(plane.contentHeight).toBeCloseTo(DOCUMENT_HEIGHT * 0.8, 10);
    expect(plane.contentLeft).toBeCloseTo(-0.4, 10);
    expect(plane.contentRight).toBeCloseTo(0.4, 10);

    const corner = plane.toWorld(0, 1);
    expect(corner.x).toBeCloseTo(plane.contentLeft, 10);
    expect(corner.y).toBeCloseTo(plane.contentTop, 10);
  });

  it("clamps extreme margins", () => {
    expect(createDocumentPlane({ margin: -1 }).margin).toBe(0);
    expect(createDocumentPlane({ margin: 0.9 }).margin).toBe(0.45);
  });
});
