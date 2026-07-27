import { describe, expect, it } from "vitest";
import {
  auditObject3DTriangles,
  countTrianglesFromGeometry,
} from "./auditInterestGlbGeometry.js";

describe("auditInterestGlbGeometry", () => {
  it("counts indexed geometry via index.count / 3", () => {
    const geometry = {
      attributes: { position: { count: 9 } },
      index: { count: 6 },
      groups: [],
    };
    expect(countTrianglesFromGeometry(geometry)).toBe(2);
  });

  it("sums multi-material groups without double-counting", () => {
    const geometry = {
      attributes: { position: { count: 12 } },
      index: { count: 12 },
      groups: [
        { start: 0, count: 6, materialIndex: 0 },
        { start: 6, count: 6, materialIndex: 1 },
      ],
    };
    expect(countTrianglesFromGeometry(geometry)).toBe(4);
  });

  it("counts non-indexed geometry via position.count / 3", () => {
    const geometry = {
      attributes: { position: { count: 9 } },
      index: null,
      groups: [],
    };
    expect(countTrianglesFromGeometry(geometry)).toBe(3);
  });

  it("aggregates mesh triangles in a scene subtree", () => {
    const root = {
      traverse(cb) {
        cb({ isMesh: true, name: "a", geometry: { attributes: { position: { count: 3 } }, index: { count: 3 } }, material: {} });
        cb({ isMesh: true, name: "b", geometry: { attributes: { position: { count: 6 } }, index: { count: 6 } }, material: {} });
      },
    };
    const report = auditObject3DTriangles(root);
    expect(report.triangleCount).toBe(3);
    expect(report.meshCount).toBe(2);
    expect(report.densestMesh).toEqual({ name: "b", triangles: 2 });
  });
});
