import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  MAX_GOVERNANCE_NODES,
  MAX_INTERPRETATION_CALLOUTS,
  getGovernanceNodes,
  getInterpretationCallouts,
} from "./governanceLensConfig";
import {
  createGovernanceLensLayer,
  isGovernanceLensDescendant,
} from "./createGovernanceLensLayer";

describe("createGovernanceLensLayer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces maximum node and callout counts", () => {
    expect(getGovernanceNodes().length).toBeLessThanOrEqual(MAX_GOVERNANCE_NODES);
    expect(getInterpretationCallouts().length).toBeLessThanOrEqual(MAX_INTERPRETATION_CALLOUTS);
    expect(MAX_GOVERNANCE_NODES).toBe(4);
    expect(MAX_INTERPRETATION_CALLOUTS).toBe(4);
  });

  it("attaches all professional elements under a single lens group for the anchor", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    const anchor = new THREE.Group();
    anchor.name = "anchor";
    anchor.add(lens.group);

    const professional = [];
    lens.group.traverse((node) => {
      if (node === lens.group) return;
      if (node.isMesh || node.isLine) professional.push(node);
    });

    expect(professional.length).toBeGreaterThan(5);
    professional.forEach((node) => {
      expect(isGovernanceLensDescendant(node, anchor)).toBe(true);
    });

    lens.dispose();
  });

  it("hides sequence on target loss without throwing and restores on reacquisition", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    lens.onTargetFound();
    expect(lens.getPhase()).toBe("complete");

    lens.onTargetLost();
    expect(lens.getPhase()).toBe("paused");

    lens.onTargetFound();
    expect(lens.getPhase()).toBe("complete");
    expect(lens.getProgress()).toBe(1);

    lens.dispose();
  });

  it("reduced motion skips staging but preserves the final composition", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    expect(lens.isReducedMotion()).toBe(true);
    lens.onTargetFound();

    expect(lens.getPhase()).toBe("complete");
    expect(lens.getNodeCount()).toBe(4);
    expect(lens.getCalloutCount()).toBe(4);

    let opaqueLabels = 0;
    lens.group.traverse((node) => {
      if (node.isMesh && node.material?.map && node.material.opacity > 0.2) {
        opaqueLabels += 1;
      }
    });
    expect(opaqueLabels).toBeGreaterThanOrEqual(6);

    // Explicit non-reduced path still reaches the same final composition via applyFinalComposition.
    const staged = createGovernanceLensLayer(THREE, { reducedMotion: false });
    staged.applyFinalComposition();
    expect(staged.getPhase()).toBe("complete");
    staged.dispose();

    lens.dispose();
  });

  it("disposes geometries, materials and textures on cleanup", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    const disposers = [];
    lens.group.traverse((node) => {
      (node.userData.disposables || []).forEach((item) => {
        if (item && typeof item.dispose === "function") {
          disposers.push(vi.spyOn(item, "dispose"));
        }
      });
    });

    expect(disposers.length).toBeGreaterThan(0);
    lens.dispose();
    disposers.forEach((spy) => expect(spy).toHaveBeenCalled());
    expect(lens.group.children).toHaveLength(0);
  });
});
