import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  DOCUMENT_HEIGHT,
  DOCUMENT_WIDTH,
  createDocumentPlane,
} from "./arDocumentPlane";
import {
  INTEREST_OBJECTS,
  INTEREST_OBJECTS_STABILIZATION,
  INTEREST_TARGET_SIZES,
} from "./interestObjectsConfig";
import { assembleInterestContent } from "./loadInterestGlb";
import { createInterestObjectsLayer } from "./createInterestObjectsLayer";

describe("Interest objects document layout", () => {
  it("maps the four UV corners to the local CV edges", () => {
    const plane = createDocumentPlane();
    const corners = {
      tl: plane.toWorldFromTopLeft(0, 0),
      tr: plane.toWorldFromTopLeft(1, 0),
      bl: plane.toWorldFromTopLeft(0, 1),
      br: plane.toWorldFromTopLeft(1, 1),
    };

    expect(corners.tl.x).toBeCloseTo(plane.left, 10);
    expect(corners.tl.y).toBeCloseTo(plane.top, 10);
    expect(corners.tr.x).toBeCloseTo(plane.right, 10);
    expect(corners.tr.y).toBeCloseTo(plane.top, 10);
    expect(corners.bl.x).toBeCloseTo(plane.left, 10);
    expect(corners.bl.y).toBeCloseTo(plane.bottom, 10);
    expect(corners.br.x).toBeCloseTo(plane.right, 10);
    expect(corners.br.y).toBeCloseTo(plane.bottom, 10);
    expect(DOCUMENT_WIDTH).toBe(1);
    expect(DOCUMENT_HEIGHT).toBeCloseTo(2574 / 1820, 8);
  });

  it("uses production target sizes and keeps groups intact", () => {
    expect(INTEREST_TARGET_SIZES.book).toBeCloseTo(0.199924, 5);
    expect(INTEREST_TARGET_SIZES["evil-eye"]).toBeCloseTo(0.275096, 5);
    expect(INTEREST_TARGET_SIZES.robot).toBeCloseTo(0.271292, 5);
    expect(INTEREST_TARGET_SIZES.fossil).toBeCloseTo(0.326418, 5);
    expect(INTEREST_TARGET_SIZES.plant).toBeCloseTo(0.229734, 5);
    expect(INTEREST_TARGET_SIZES.backpack).toBeCloseTo(0.26792, 5);

    const knowledge = INTEREST_OBJECTS.filter((item) => item.group === "knowledge").map((i) => i.id);
    const exploration = INTEREST_OBJECTS.filter((item) => item.group === "exploration").map(
      (i) => i.id,
    );
    expect(knowledge).toEqual(["book", "evil-eye", "robot"]);
    expect(exploration).toEqual(["fossil", "plant", "backpack"]);
  });

  it("keeps production origins and sizes inside soft UV / size limits", () => {
    INTEREST_OBJECTS.forEach((item) => {
      // Soft pad allows origins near page edges without failing layout checks.
      expect(item.origin.u, `${item.id} u`).toBeGreaterThanOrEqual(-0.12);
      expect(item.origin.u, `${item.id} u`).toBeLessThanOrEqual(1.12);
      expect(item.origin.vTop, `${item.id} vTop`).toBeGreaterThanOrEqual(-0.12);
      expect(item.origin.vTop, `${item.id} vTop`).toBeLessThanOrEqual(1.12);
      expect(item.targetSize, `${item.id} size`).toBeGreaterThanOrEqual(0.05);
      expect(item.targetSize, `${item.id} size`).toBeLessThanOrEqual(0.36);
      expect(item.groundOffset, `${item.id} ground`).toBeGreaterThanOrEqual(0);

      // Grounding still holds for a proxy stand-in at the configured origin.
      const plane = createDocumentPlane();
      const proxy =
        item.scaleAxis === "max"
          ? new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.9), new THREE.MeshBasicMaterial())
          : new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.2), new THREE.MeshBasicMaterial());
      const { content } = assembleInterestContent(THREE, proxy, {
        targetSize: item.targetSize,
        scaleAxis: item.scaleAxis,
        canonicalRotation: item.canonicalRotation,
      });
      const root = new THREE.Group();
      const world = plane.toWorldFromTopLeft(
        item.origin.u,
        item.origin.vTop,
        item.groundOffset,
      );
      root.position.set(world.x, world.y, world.z);
      root.add(content);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      expect(box.min.z, `${item.id} grounded`).toBeGreaterThanOrEqual(-0.001);
    });
  });

  it("parents the interest layer under presentation, never the camera or scene root", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    scene.add(camera);

    const rawAnchor = new THREE.Group();
    rawAnchor.name = "mindar-anchor";
    scene.add(rawAnchor);

    const presentation = new THREE.Group();
    presentation.name = "ar-interest-objects-presentation";
    rawAnchor.add(presentation);

    const layer = createInterestObjectsLayer(THREE, { items: INTEREST_OBJECTS.slice(0, 1) });
    presentation.add(layer.placement);

    expect(layer.placement.parent).toBe(presentation);
    expect(presentation.parent).toBe(rawAnchor);
    expect(layer.placement.parent).not.toBe(camera);
    expect(layer.placement.parent).not.toBe(scene);

    let node = layer.placement;
    let underAnchor = false;
    while (node) {
      if (node === rawAnchor) underAnchor = true;
      node = node.parent;
    }
    expect(underAnchor).toBe(true);
    layer.dispose();
  });

  it("keeps marker-local scale constant (no distance-based auto scale on roots)", () => {
    INTEREST_OBJECTS.forEach((item) => {
      expect(item).not.toHaveProperty("screenScale");
      expect(item).not.toHaveProperty("distanceScale");
      expect(item).not.toHaveProperty("billboard");
    });
    expect(INTEREST_OBJECTS_STABILIZATION.rigidAttachment).toBe(true);
    expect(INTEREST_OBJECTS_STABILIZATION.scaleTauSec).toBe(0);
  });
});
