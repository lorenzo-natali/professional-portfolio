import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createProfessionalEvolutionLayer } from "./createProfessionalEvolutionLayer";
import {
  PROFESSIONAL_EVOLUTION_COPY,
  PROFESSIONAL_EVOLUTION_STAGES,
  PROFESSIONAL_EVOLUTION_ORIGIN,
  PROFESSIONAL_EVOLUTION_LAYOUT,
} from "./professionalEvolutionConfig";

describe("createProfessionalEvolutionLayer", () => {
  it("uses the exact intended hierarchy: placement → entrance → content", () => {
    const layer = createProfessionalEvolutionLayer(THREE);

    expect(layer.group).toBe(layer.placement);
    expect(layer.placement.name).toBe("ar-professional-evolution-placement");
    expect(layer.anim.name).toBe("ar-professional-evolution-entrance");
    expect(layer.content.name).toBe("ar-professional-evolution-content");

    expect(layer.anim.parent).toBe(layer.placement);
    expect(layer.content.parent).toBe(layer.anim);
    expect(layer.placement.children.map((child) => child.name)).toEqual([
      "ar-professional-evolution-entrance",
    ]);
    expect(layer.anim.children.map((child) => child.name)).toEqual([
      "ar-professional-evolution-content",
    ]);
    // No obsolete wrapper group in the chain.
    expect(layer.placement.parent).toBeNull();

    layer.dispose();
  });

  it("creates four ordered stages with direction framing on AI GOVERNANCE", () => {
    const layer = createProfessionalEvolutionLayer(THREE);

    expect(layer.stageNodes).toHaveLength(4);
    expect(layer.stages.map((s) => s.id)).toEqual(
      PROFESSIONAL_EVOLUTION_STAGES.map((s) => s.id),
    );
    expect(layer.stages.map((s) => s.label)).toEqual(
      PROFESSIONAL_EVOLUTION_STAGES.map((s) => s.label),
    );
    expect(layer.heading.userData.labelText).toBe(PROFESSIONAL_EVOLUTION_COPY.heading);
    expect(layer.supporting?.userData.labelText).toBe(PROFESSIONAL_EVOLUTION_COPY.supporting);
    expect(layer.group.userData.calibration.origin).toEqual(PROFESSIONAL_EVOLUTION_ORIGIN);

    const direction = layer.stageNodes.find((s) => s.id === "ai-governance");
    expect(direction?.emphasis).toBe(true);
    expect(direction?.direction).toBe(true);
    // Label colour is canvas-baked; the node mesh carries the violet direction accent.
    expect(direction?.node.material.color.getHexString()).toBe(
      new THREE.Color(PROFESSIONAL_EVOLUTION_LAYOUT.colors.nodeEmphasis).getHexString(),
    );
    expect(direction?.label.userData.labelText).toBe("AI GOVERNANCE");

    layer.dispose();
  });

  it("keeps content under the tracked hierarchy and starts hidden", () => {
    const layer = createProfessionalEvolutionLayer(THREE);
    expect(layer.group.visible).toBe(false);
    expect(layer.getOpacity()).toBeCloseTo(0, 2);
    layer.applyProgress({
      heading: 1,
      line: 1,
      stages: [1, 1, 1, 1],
      emphasis: 1,
    });
    expect(layer.heading.material.opacity).toBeGreaterThan(0.5);
    expect(layer.line.scale.x).toBeCloseTo(1, 2);
    layer.dispose();
  });
});
