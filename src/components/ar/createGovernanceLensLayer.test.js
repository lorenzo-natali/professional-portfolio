import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createGovernanceLensLayer } from "./createGovernanceLensLayer";

describe("createGovernanceLensLayer compatibility alias", () => {
  it("delegates to the Risk lens layer", () => {
    const lens = createGovernanceLensLayer(THREE, { reducedMotion: true });
    expect(lens.group.name).toBe("ar-lens-layer");
    expect(lens.getAnnotationCount()).toBe(4);
    lens.dispose();
  });
});
