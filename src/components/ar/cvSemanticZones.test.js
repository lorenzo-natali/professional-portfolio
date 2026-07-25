import { describe, expect, it } from "vitest";
import { createDocumentPlane } from "./arDocumentPlane";
import {
  CV_SEMANTIC_ZONES,
  listZoneStability,
  resolveZonePoint,
} from "./cvSemanticZones";

describe("cvSemanticZones", () => {
  it("defines the required semantic zones", () => {
    expect(Object.keys(CV_SEMANTIC_ZONES).sort()).toEqual(
      ["currentRole", "education", "header", "headline", "profile", "skills"].sort(),
    );
  });

  it("converts zone points to document world coordinates", () => {
    const plane = createDocumentPlane();
    const { u, vTop } = resolveZonePoint("profile");
    const world = plane.toWorldFromTopLeft(u, vTop, 0.01);

    expect(world.x).toBeGreaterThan(plane.left);
    expect(world.x).toBeLessThan(plane.right);
    expect(world.y).toBeGreaterThan(plane.bottom);
    expect(world.y).toBeLessThan(plane.top);
    expect(world.z).toBe(0.01);

    // Profile is upper-left → positive y, negative x relative to center.
    expect(world.x).toBeLessThan(0);
    expect(world.y).toBeGreaterThan(0);
  });

  it("documents zone stability for recalibration guidance", () => {
    const stability = listZoneStability();
    expect(stability.find((z) => z.id === "header")?.stability).toBe("stable");
    expect(stability.find((z) => z.id === "education")?.stability).toBe("fragile");
    expect(stability.find((z) => z.id === "skills")?.stability).toBe("moderate");
  });
});
