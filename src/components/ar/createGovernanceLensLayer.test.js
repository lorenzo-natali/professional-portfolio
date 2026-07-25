import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createDocumentPlane } from "./arDocumentPlane";
import { isInsideQrAvoidZone } from "./cvSemanticZones";
import {
  DEFERRED_LABEL_TEXTS,
  LABEL_HEIGHT_KEY,
  LABEL_HEIGHT_STANDARD,
  MAX_GOVERNANCE_NODES,
  MAX_INTERPRETATION_CALLOUTS,
  MAX_VISIBLE_LABELS,
  NODE_DIAMETER,
  getGovernanceNodes,
  getInterpretationCallouts,
} from "./governanceLensConfig";
import {
  VISIBLE_LABEL_OPACITY,
  createGovernanceLensLayer,
  isGovernanceLensDescendant,
} from "./createGovernanceLensLayer";

describe("createGovernanceLensLayer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces sparse production node and callout counts", () => {
    expect(getGovernanceNodes().length).toBeLessThanOrEqual(MAX_GOVERNANCE_NODES);
    expect(getInterpretationCallouts().length).toBeLessThanOrEqual(MAX_INTERPRETATION_CALLOUTS);
    expect(MAX_GOVERNANCE_NODES).toBe(3);
    expect(MAX_INTERPRETATION_CALLOUTS).toBe(3);
    expect(MAX_VISIBLE_LABELS).toBe(7);
  });

  it("does not expose Technology Risk or Emerging Specialization as production labels", () => {
    const texts = [
      ...getGovernanceNodes().map((n) => n.text),
      ...getInterpretationCallouts().map((c) => c.text),
    ];
    DEFERRED_LABEL_TEXTS.forEach((deferred) => {
      expect(texts).not.toContain(deferred);
    });

    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    lens.applyFinalComposition();
    const labelTexts = lens.collectLabelMeshes().map((m) => m.userData.labelText);
    DEFERRED_LABEL_TEXTS.forEach((deferred) => {
      expect(labelTexts).not.toContain(deferred);
    });
    expect(labelTexts).toContain("AI Governance");
    expect(labelTexts.filter((t) => t === "AI Governance")).toHaveLength(1);
    lens.dispose();
  });

  it("meets configured label and node size minima", () => {
    expect(LABEL_HEIGHT_STANDARD).toBeGreaterThanOrEqual(0.075);
    expect(LABEL_HEIGHT_STANDARD).toBeLessThanOrEqual(0.085);
    expect(LABEL_HEIGHT_KEY).toBeLessThanOrEqual(0.1);
    expect(LABEL_HEIGHT_KEY).toBeGreaterThanOrEqual(LABEL_HEIGHT_STANDARD);
    expect(NODE_DIAMETER).toBeGreaterThanOrEqual(0.035);
    expect(NODE_DIAMETER).toBeLessThanOrEqual(0.045);

    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    lens.collectLabelMeshes().forEach((mesh) => {
      expect(mesh.userData.worldHeight).toBeGreaterThanOrEqual(0.075);
    });
    lens.group.traverse((node) => {
      if (node.userData?.kind === "ar-node-marker" && node.name.startsWith("ar-lens-node:")) {
        expect(node.userData.nodeDiameter).toBeGreaterThanOrEqual(0.035);
        expect(node.userData.nodeDiameter).toBeLessThanOrEqual(0.045);
      }
    });
    lens.dispose();
  });

  it("keeps every visible element outside the QR avoid-zone", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    lens.applyFinalComposition();
    const plane = createDocumentPlane();

    const points = [];
    lens.group.traverse((node) => {
      if (!node.isMesh && !node.isLine) return;
      if (node.isLine) return;
      const uv =
        node.userData?.uv ||
        plane.toTopLeftFromWorld(node.position.x, node.position.y);
      points.push({ name: node.name, ...uv });

      // Approximate label plate corners in normalized space.
      if (node.userData?.kind === "ar-label" && node.geometry?.parameters) {
        const halfW = node.geometry.parameters.width / 2;
        const halfH = node.geometry.parameters.height / 2;
        [
          [node.position.x - halfW, node.position.y - halfH],
          [node.position.x + halfW, node.position.y - halfH],
          [node.position.x - halfW, node.position.y + halfH],
          [node.position.x + halfW, node.position.y + halfH],
        ].forEach(([x, y]) => {
          points.push({ name: `${node.name}:corner`, ...plane.toTopLeftFromWorld(x, y) });
        });
      }
    });

    points.forEach((p) => {
      expect(isInsideQrAvoidZone(p.u, p.vTop), `${p.name} entered QR avoid at u=${p.u} vTop=${p.vTop}`).toBe(
        false,
      );
    });

    lens.dispose();
  });

  it("enforces the maximum visible-label count in the final composition", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    lens.onTargetFound();
    expect(lens.countVisibleLabels(VISIBLE_LABEL_OPACITY)).toBeLessThanOrEqual(MAX_VISIBLE_LABELS);
    expect(lens.countVisibleLabels(VISIBLE_LABEL_OPACITY)).toBeLessThanOrEqual(7);
    lens.dispose();
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

    // Every label is an anchor descendant (document plane), not viewport-fixed DOM.
    lens.collectLabelMeshes().forEach((label) => {
      expect(isGovernanceLensDescendant(label, anchor)).toBe(true);
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
    expect(lens.getNodeCount()).toBe(3);
    expect(lens.getCalloutCount()).toBe(3);

    let opaqueLabels = 0;
    lens.group.traverse((node) => {
      if (node.isMesh && node.material?.map && node.material.opacity > 0.2) {
        opaqueLabels += 1;
      }
    });
    expect(opaqueLabels).toBeGreaterThanOrEqual(6);

    const staged = createGovernanceLensLayer(THREE, { reducedMotion: false });
    staged.applyFinalComposition();
    expect(staged.getPhase()).toBe("complete");
    staged.dispose();

    lens.dispose();
  });

  it("does not create trajectory edges in the sparse composition", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    const trajectories = [];
    lens.group.traverse((node) => {
      if (node.name?.startsWith("ar-lens-trajectory:")) trajectories.push(node);
    });
    expect(trajectories).toHaveLength(0);
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
