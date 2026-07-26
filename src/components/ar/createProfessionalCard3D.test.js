import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createProfessionalCard3D,
  createProfessionalCardFaceCanvas,
  setCardOpacity,
} from "./createProfessionalCard3D";
import {
  PROFESSIONAL_CARD_CONTENT,
  PROFESSIONAL_CARD_ORIGIN,
  PROFESSIONAL_CARD_TRANSFORM,
} from "./professionalCardConfig";
import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";

describe("createProfessionalCard3D", () => {
  it("builds extruded depth with distinct body, front, back and solid side materials", () => {
    const card = createProfessionalCard3D(THREE);
    card.body.geometry.computeBoundingBox();
    const box = card.body.geometry.boundingBox;
    const depth = box.max.z - box.min.z;

    expect(depth).toBeGreaterThan(0.01);
    expect(card.body.geometry.type).toBe("ExtrudeGeometry");
    expect(Array.isArray(card.body.material)).toBe(true);
    expect(card.body.material).toHaveLength(2);
    expect(card.frontFace.position.z).toBeGreaterThan(0);
    expect(card.backFace.position.z).toBeLessThan(0);
    expect(card.backFace.rotation.y).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(card.frontFace.position.z - card.backFace.position.z)).toBeGreaterThan(
      card.size.thickness * 0.9,
    );
    expect(card.riseAxis).toBe("z");

    const names = [];
    card.group.traverse((node) => names.push(node.name));
    expect(names).toContain("ar-professional-card-body");
    expect(names).toContain("ar-professional-card-front");
    expect(names).toContain("ar-professional-card-back");
    expect(names.some((name) => /lens|diagnostics|governance-label/i.test(name))).toBe(false);

    card.dispose();
  });

  it("centers the card on the CV using target-local placement + interaction hierarchy", () => {
    const card = createProfessionalCard3D(THREE);
    const plane = createDocumentPlane();
    const pageCenter = plane.toWorldFromTopLeft(0.5, 0.5, DOCUMENT_PLANE_Z);

    expect(PROFESSIONAL_CARD_ORIGIN).toEqual({ u: 0.5, vTop: 0.5 });
    // Document-plane center is the geometric middle of the tracked target.
    expect(pageCenter.x).toBeCloseTo(0, 5);
    expect(pageCenter.y).toBeCloseTo(0, 5);
    expect(card.placement.position.x).toBeCloseTo(
      pageCenter.x + PROFESSIONAL_CARD_TRANSFORM.position.x,
      5,
    );
    expect(card.placement.position.y).toBeCloseTo(
      pageCenter.y + PROFESSIONAL_CARD_TRANSFORM.position.y,
      5,
    );
    expect(card.placement.position.z).toBeCloseTo(
      pageCenter.z + PROFESSIONAL_CARD_TRANSFORM.position.z,
      5,
    );
    expect(Math.abs(card.placement.position.x)).toBeLessThan(0.05);
    expect(Math.abs(card.placement.position.y)).toBeLessThan(0.05);
    expect(Number.isFinite(card.placement.position.z)).toBe(true);
    // Placement must not depend on viewport/screen metrics.
    expect(JSON.stringify(card.group.userData.calibration)).not.toMatch(
      /innerWidth|innerHeight|visualViewport|clientWidth/,
    );
    expect(card.interaction.parent).toBe(card.placement);
    expect(card.anim.parent).toBe(card.interaction);
    expect(card.interaction.rotation.x).toBeCloseTo(PROFESSIONAL_CARD_TRANSFORM.rotation.x, 5);
    expect(card.interaction.rotation.y).toBeCloseTo(0, 5);
    expect(Math.abs(card.interaction.rotation.x)).toBeLessThan(0.2);
    expect(card.frontFace.position.z).toBeGreaterThan(0);
    expect(card.riseHeight).toBe(PROFESSIONAL_CARD_TRANSFORM.riseHeight);
    expect(card.group.userData.calibration.origin).toEqual(PROFESSIONAL_CARD_ORIGIN);

    const names = [];
    card.group.traverse((node) => names.push(node.name));
    expect(names).toContain("ar-professional-card-placement");
    expect(names).toContain("ar-professional-card-interaction");

    card.dispose();
  });

  it("disposes geometries, materials and textures completely", () => {
    const card = createProfessionalCard3D(THREE);
    const parent = new THREE.Group();
    parent.add(card.group);

    const geometry = card.body.geometry;
    const texture = card.frontFace.material.map;
    const material = card.frontFace.material;

    expect(() => card.dispose()).not.toThrow();
    expect(card.group.parent).toBeNull();
    expect(geometry.uuid).toBeTruthy();
    // Three.js marks disposed buffers; map should be cleared from material use after dispose call.
    expect(() => texture.dispose()).not.toThrow();
    expect(() => material.dispose()).not.toThrow();
  });

  it("keeps only the requested front/back copy", () => {
    expect(PROFESSIONAL_CARD_CONTENT.front).toEqual({
      name: "Lorenzo Natali",
      title: "Banking Risk | Tech. & AI Governance | Information Security",
      detail: "AR Professional Identity",
    });
    expect(PROFESSIONAL_CARD_CONTENT.back.lines).toEqual([
      "Risk & Governance",
      "Technology & Information Security",
      "AI Governance",
    ]);
    expect(PROFESSIONAL_CARD_CONTENT.back.footer).toMatch(/banking|assurance/i);
    expect(JSON.stringify(PROFESSIONAL_CARD_CONTENT)).not.toMatch(/FOCUS/);

    const front = createProfessionalCardFaceCanvas("front");
    const back = createProfessionalCardFaceCanvas("back");
    expect(front.width).toBeGreaterThan(100);
    expect(back.width).toBeGreaterThan(100);
  });

  it("can fade card materials via setCardOpacity", () => {
    const card = createProfessionalCard3D(THREE);
    setCardOpacity(card.group, 0.4);
    expect(card.frontFace.material.opacity).toBeCloseTo(0.4, 5);
    setCardOpacity(card.group, 0);
    expect(card.frontFace.material.opacity).toBe(0);
    card.dispose();
  });
});
