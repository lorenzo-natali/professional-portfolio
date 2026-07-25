import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createDocumentPlane } from "./arDocumentPlane";
import { isInsideQrAvoidZone } from "./cvEvidenceAnchors";
import {
  LABEL_MAX_WIDTH,
  MAX_SIMULTANEOUS_ANNOTATIONS,
  RETIRED_GOVERNANCE_LABELS,
  getLensAnnotations,
  getLensById,
  listLensSelectorItems,
} from "./lensCatalog";
import { resolveLensLayout, validateLensLayout, leaderEndOnPlateEdge } from "./lensLayout";
import {
  createLensLayer,
  isLensLayerDescendant,
} from "./createLensLayer";

describe("Risk Lens architecture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes four selector lenses with Risk active and others upcoming", () => {
    const items = listLensSelectorItems();
    expect(items.map((i) => i.id)).toEqual(["professional", "risk", "technology", "ai"]);
    expect(getLensById("risk")?.enabled).toBe(true);
    expect(getLensById("risk")?.status).toBe("active");
    expect(getLensById("professional")?.enabled).toBe(false);
    expect(getLensById("technology")?.annotations).toHaveLength(0);
    expect(getLensById("ai")?.annotations).toHaveLength(0);
  });

  it("inactive lenses do not provide annotations", () => {
    expect(getLensAnnotations("professional")).toHaveLength(0);
    expect(getLensAnnotations("technology")).toHaveLength(0);
    expect(getLensAnnotations("ai")).toHaveLength(0);
    const empty = createLensLayer(THREE, { lensId: "professional", reducedMotion: true });
    expect(empty.getAnnotationCount()).toBe(0);
    empty.dispose();
  });

  it("Risk lens has exactly four annotations with full grammar", () => {
    expect(getLensAnnotations("risk")).toHaveLength(4);
    expect(MAX_SIMULTANEOUS_ANNOTATIONS).toBe(4);

    const lens = createLensLayer(THREE, { lensId: "risk", reducedMotion: true });
    lens.applyFinalComposition();
    expect(lens.getAnnotationCount()).toBe(4);

    const items = lens.getItems();
    items.forEach((item) => {
      expect(item.marker).toBeTruthy();
      expect(item.leader).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.layout.evidence).toBeTruthy();
      expect(item.label.userData.leaderEnd).toBeTruthy();
    });

    const texts = items.map((i) => i.label.userData.labelText);
    expect(texts).toEqual([
      "Internal Audit",
      "Operational Resilience",
      "Risk Analytics",
      "Control Assurance",
    ]);

    RETIRED_GOVERNANCE_LABELS.forEach((retired) => {
      expect(texts).not.toContain(retired);
    });

    lens.dispose();
  });

  it("leaders terminate on label plate edges, not centers", () => {
    const end = leaderEndOnPlateEdge(
      { x: 0, y: 0 },
      { x: 0.28, y: 0 },
      0.11,
      0.021,
      0.01,
    );
    expect(end.x).toBeCloseTo(0.17, 5);
    expect(end.y).toBeCloseTo(0, 5);

    const lens = createLensLayer(THREE, { lensId: "risk", reducedMotion: true });
    lens.getItems().forEach((item) => {
      const { halfW, halfH, leaderEnd } = item.label.userData;
      const cx = item.label.position.x;
      const cy = item.label.position.y;
      const dx = Math.abs(leaderEnd.x - cx);
      const dy = Math.abs(leaderEnd.y - cy);
      const onVertical = Math.abs(dx - halfW) < 1e-3 && dy <= halfH + 1e-3;
      const onHorizontal = Math.abs(dy - halfH) < 1e-3 && dx <= halfW + 1e-3;
      expect(onVertical || onHorizontal).toBe(true);
      expect(dx > 1e-4 || dy > 1e-4).toBe(true);
    });
    lens.dispose();
  });

  it("keeps labels inside page-safe bounds, outside QR, non-overlapping, width-capped", () => {
    const plane = createDocumentPlane();
    const layout = resolveLensLayout("risk", { plane });
    const validation = validateLensLayout(layout, plane);
    expect(validation.ok, validation.errors.join("; ")).toBe(true);

    layout.forEach((item) => {
      expect(item.worldWidth).toBeLessThanOrEqual(LABEL_MAX_WIDTH + 1e-6);
      expect(isInsideQrAvoidZone(item.label.u, item.label.vTop)).toBe(false);
    });

    const lens = createLensLayer(THREE, { lensId: "risk", reducedMotion: true });
    lens.collectLabelMeshes().forEach((mesh) => {
      expect(mesh.userData.worldWidth).toBeLessThanOrEqual(LABEL_MAX_WIDTH + 0.02);
      expect(mesh.userData.worldHeight).toBeGreaterThanOrEqual(0.034);
      expect(mesh.userData.worldHeight).toBeLessThanOrEqual(0.055);
    });
    lens.dispose();
  });

  it("attaches all annotations under the MindAR anchor group", () => {
    const lens = createLensLayer(THREE, { lensId: "risk", reducedMotion: true });
    const anchor = new THREE.Group();
    anchor.name = "anchor";
    anchor.add(lens.group);

    lens.group.traverse((node) => {
      if (node === lens.group) return;
      if (node.isMesh || node.isLine) {
        expect(isLensLayerDescendant(node, anchor)).toBe(true);
      }
    });
    lens.dispose();
  });

  it("restores on reacquisition without fallback semantics and supports reduced motion", () => {
    const lens = createLensLayer(THREE, { reducedMotion: true });
    lens.onTargetFound();
    expect(lens.getPhase()).toBe("complete");
    lens.onTargetLost();
    expect(lens.getPhase()).toBe("paused");
    lens.onTargetFound();
    expect(lens.getPhase()).toBe("complete");
    expect(lens.getProgress()).toBe(1);
    lens.dispose();
  });

  it("disposes textures, geometries, materials and clears the group", () => {
    const lens = createLensLayer(THREE, { reducedMotion: true });
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
