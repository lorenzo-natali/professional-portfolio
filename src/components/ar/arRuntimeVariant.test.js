import { describe, expect, it } from "vitest";
import {
  AR_INTEREST_TRIANGLE_AUDIT,
  AR_RUNTIME_VARIANT_NAMES,
  AR_RUNTIME_VARIANT_SINGLE_MODEL_ID,
  applyArRuntimeVariantPixelRatio,
  arRuntimeVariantSnapshotLabel,
  countObject3DTriangles,
  halfResolutionPixelRatio,
  isDiagnosticArRuntimeVariant,
  parseArRuntimeVariant,
  resolveInterestItemsForVariant,
  shouldDisableCardLayoutProjection,
} from "./arRuntimeVariant";
import { INTEREST_OBJECTS } from "./interestObjectsConfig";

describe("arRuntimeVariant", () => {
  it("parses known variants and rejects unknown", () => {
    expect(parseArRuntimeVariant("baseline")).toBe("baseline");
    expect(parseArRuntimeVariant("half-resolution")).toBe("half-resolution");
    expect(parseArRuntimeVariant("NO-MODELS")).toBe("no-models");
    expect(parseArRuntimeVariant("single-model")).toBe("single-model");
    expect(parseArRuntimeVariant("no-card-layout")).toBe("no-card-layout");
    expect(parseArRuntimeVariant("")).toBeNull();
    expect(parseArRuntimeVariant("potato")).toBeNull();
    expect(AR_RUNTIME_VARIANT_NAMES).toHaveLength(5);
  });

  it("keeps default/baseline interest lists identical to production", () => {
    expect(resolveInterestItemsForVariant(null)).toBe(INTEREST_OBJECTS);
    expect(resolveInterestItemsForVariant("baseline")).toBe(INTEREST_OBJECTS);
    expect(resolveInterestItemsForVariant("half-resolution")).toBe(INTEREST_OBJECTS);
    expect(resolveInterestItemsForVariant("no-card-layout")).toBe(INTEREST_OBJECTS);
    expect(resolveInterestItemsForVariant("no-models")).toEqual([]);
    expect(resolveInterestItemsForVariant("single-model").map((i) => i.id)).toEqual([
      AR_RUNTIME_VARIANT_SINGLE_MODEL_ID,
    ]);
  });

  it("halves pixel ratio without going below 1", () => {
    expect(halfResolutionPixelRatio(3)).toBe(1.5);
    expect(halfResolutionPixelRatio(2)).toBe(1);
    expect(halfResolutionPixelRatio(1)).toBe(1);
    const renderer = { ratio: 3, setPixelRatio(n) { this.ratio = n; }, getPixelRatio() { return this.ratio; } };
    expect(applyArRuntimeVariantPixelRatio(renderer, "half-resolution", 3)).toBe(1.5);
    expect(renderer.ratio).toBe(1.5);
    expect(applyArRuntimeVariantPixelRatio(renderer, "baseline", 3)).toBeNull();
    expect(renderer.ratio).toBe(1.5);
  });

  it("disables card layout only for no-card-layout", () => {
    expect(shouldDisableCardLayoutProjection("no-card-layout")).toBe(true);
    expect(shouldDisableCardLayoutProjection("baseline")).toBe(false);
    expect(shouldDisableCardLayoutProjection(null)).toBe(false);
  });

  it("labels snapshots distinctly for default vs explicit baseline", () => {
    expect(arRuntimeVariantSnapshotLabel(null)).toBe("default");
    expect(arRuntimeVariantSnapshotLabel("baseline")).toBe("baseline");
    expect(isDiagnosticArRuntimeVariant(null)).toBe(false);
    expect(isDiagnosticArRuntimeVariant("baseline")).toBe(true);
  });

  it("documents exact triangle audit totaling the device render figure", () => {
    const sum = AR_INTEREST_TRIANGLE_AUDIT.assets.reduce((s, a) => s + a.triangles, 0);
    expect(sum).toBe(519_741);
    expect(AR_INTEREST_TRIANGLE_AUDIT.totalTriangles).toBe(519_741);
    expect(AR_INTEREST_TRIANGLE_AUDIT.assets[0].id).toBe("fossil");
    expect(AR_INTEREST_TRIANGLE_AUDIT.assets[0].triangles).toBe(121_802);
  });

  it("counts BufferGeometry triangles with visibility parents", () => {
    const root = {
      visible: true,
      parent: null,
      traverse(fn) {
        const mesh = {
          isMesh: true,
          visible: true,
          parent: this,
          geometry: { index: { count: 300 }, attributes: {} },
        };
        const hidden = {
          isMesh: true,
          visible: false,
          parent: this,
          geometry: { index: { count: 90 }, attributes: {} },
        };
        fn(mesh);
        fn(hidden);
      },
    };
    expect(countObject3DTriangles(root)).toEqual({
      sceneTriangles: 130,
      visibleTriangles: 100,
      visibleMeshes: 1,
    });
  });
});
