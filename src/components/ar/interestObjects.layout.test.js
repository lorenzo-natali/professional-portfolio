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

  it("uses readable non-uniform target sizes and keeps groups intact", () => {
    expect(INTEREST_TARGET_SIZES.robot).toBeGreaterThanOrEqual(0.2);
    expect(INTEREST_TARGET_SIZES.fossil).toBeGreaterThanOrEqual(0.18);
    expect(INTEREST_TARGET_SIZES.plant).toBeGreaterThanOrEqual(0.22);
    expect(INTEREST_TARGET_SIZES.backpack).toBeGreaterThanOrEqual(0.16);
    expect(INTEREST_TARGET_SIZES.book).toBeGreaterThanOrEqual(0.14);
    expect(INTEREST_TARGET_SIZES["evil-eye"]).toBeLessThan(INTEREST_TARGET_SIZES.robot);
    expect(INTEREST_TARGET_SIZES["evil-eye"]).toBeGreaterThanOrEqual(0.08);

    const knowledge = INTEREST_OBJECTS.filter((item) => item.group === "knowledge").map((i) => i.id);
    const exploration = INTEREST_OBJECTS.filter((item) => item.group === "exploration").map(
      (i) => i.id,
    );
    expect(knowledge).toEqual(["book", "evil-eye", "robot"]);
    expect(exploration).toEqual(["fossil", "plant", "backpack"]);
  });

  it("keeps assembled bbox footprints inside the CV rectangle at configured origins", () => {
    const plane = createDocumentPlane();

    INTEREST_OBJECTS.forEach((item) => {
      // Proxy stand-ins with known aspect — verifies origin + size stay on-page.
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
      const display = new THREE.Group();
      display.rotation.z = item.displayYaw;
      display.add(content);
      root.add(display);
      root.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(root);
      expect(box.min.x, `${item.id} left`).toBeGreaterThanOrEqual(plane.left - 0.02);
      expect(box.max.x, `${item.id} right`).toBeLessThanOrEqual(plane.right + 0.02);
      expect(box.min.y, `${item.id} bottom`).toBeGreaterThanOrEqual(plane.bottom - 0.02);
      expect(box.max.y, `${item.id} top`).toBeLessThanOrEqual(plane.top + 0.02);
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
