import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDecisionCore3D } from "./createDecisionCore3D";
import { DECISION_CORE_STAGES } from "./decisionCoreConfig";
import {
  PROFESSIONAL_CARD_ORIGIN,
  PROFESSIONAL_CARD_TRANSFORM,
} from "./professionalCardConfig";
import { createDocumentPlane, DOCUMENT_PLANE_Z } from "./arDocumentPlane";

describe("createDecisionCore3D", () => {
  it("builds one hub and six shared-geometry segments with PBR materials", () => {
    const artifact = createDecisionCore3D(THREE);
    expect(artifact.segments).toHaveLength(6);
    expect(artifact.segments.map((s) => s.id)).toEqual(DECISION_CORE_STAGES.map((s) => s.id));

    const bladeGeoms = new Set(
      artifact.segments.map((segment) => segment.blade.geometry.uuid),
    );
    expect(bladeGeoms.size).toBe(1);

    expect(artifact.coreMaterial.type).toBe("MeshStandardMaterial");
    expect(artifact.coreMaterial.emissiveIntensity).toBeGreaterThan(0);

    const names = [];
    artifact.group.traverse((node) => names.push(node.name));
    expect(names).toContain("ar-decision-core-hub");
    expect(names).toContain("ar-decision-core-inner");
    expect(names).toContain("ar-decision-core-shell");
    DECISION_CORE_STAGES.forEach((stage) => {
      expect(names).toContain(`ar-decision-core-blade-${stage.id}`);
      expect(names).toContain(`ar-decision-core-label-${stage.id}`);
    });
    expect(names.some((name) => /professional-card|business-card|hotspot|panel/i.test(name))).toBe(
      false,
    );

    artifact.dispose();
  });

  it("centers on the CV with placement → interaction → anim hierarchy", () => {
    const artifact = createDecisionCore3D(THREE);
    const plane = createDocumentPlane();
    const pageCenter = plane.toWorldFromTopLeft(0.5, 0.5, DOCUMENT_PLANE_Z);

    expect(PROFESSIONAL_CARD_ORIGIN).toEqual({ u: 0.5, vTop: 0.5 });
    expect(artifact.placement.position.x).toBeCloseTo(
      pageCenter.x + PROFESSIONAL_CARD_TRANSFORM.position.x,
      5,
    );
    expect(artifact.placement.position.y).toBeCloseTo(
      pageCenter.y + PROFESSIONAL_CARD_TRANSFORM.position.y,
      5,
    );
    expect(artifact.interaction.parent).toBe(artifact.placement);
    expect(artifact.anim.parent).toBe(artifact.interaction);
    expect(artifact.interaction.rotation.x).toBeCloseTo(PROFESSIONAL_CARD_TRANSFORM.rotation.x, 5);
    expect(artifact.riseAxis).toBe("z");
    expect(artifact.riseHeight).toBe(PROFESSIONAL_CARD_TRANSFORM.riseHeight);

    artifact.segments.forEach((segment) => {
      expect(segment.label.visible).toBe(false);
      expect(segment.tokenMeshes.every((mesh) => mesh.visible === false)).toBe(true);
      expect(segment.expanded).toBe(false);
    });

    artifact.dispose();
  });

  it("starts invisible and supports opacity / glow helpers", () => {
    const artifact = createDecisionCore3D(THREE);
    expect(artifact.group.visible).toBe(false);
    expect(artifact.getOpacity()).toBeCloseTo(0, 2);

    artifact.setOpacity(1);
    expect(artifact.getOpacity()).toBeCloseTo(1, 2);
    artifact.setCoreGlow(0.5);
    expect(artifact.coreMaterial.emissiveIntensity).toBeCloseTo(0.5, 5);

    expect(() => artifact.dispose()).not.toThrow();
  });
});
