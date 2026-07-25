import { describe, expect, it } from "vitest";
import { createDocumentPlane } from "./arDocumentPlane";
import {
  CV_SEMANTIC_ZONES,
  QR_AVOID_ZONE,
  isInsideQrAvoidZone,
  listZoneStability,
  resolveZonePoint,
} from "./cvSemanticZones";

describe("cvSemanticZones", () => {
  it("defines the corrected two-column semantic zones", () => {
    expect(Object.keys(CV_SEMANTIC_ZONES).sort()).toEqual(
      [
        "currentRole",
        "education",
        "evidenceControls",
        "evidenceDora",
        "evidenceIfrs",
        "header",
        "headline",
        "profile",
        "skills",
      ].sort(),
    );
  });

  it("places skills in the left column, not a right-side band", () => {
    const skills = resolveZonePoint("skills");
    expect(skills.u).toBeLessThan(0.35);
    expect(skills.u).toBeCloseTo(0.16, 2);
    expect(skills.vTop).toBeCloseTo(0.55, 2);
    // Distinct from the old mistaken right-band placement.
    expect(skills.u).toBeLessThan(0.5);
  });

  it("matches the audited page-1 starting coordinates", () => {
    expect(resolveZonePoint("profile")).toMatchObject({ u: 0.19, vTop: 0.13 });
    expect(resolveZonePoint("header")).toMatchObject({ u: 0.48, vTop: 0.08 });
    expect(resolveZonePoint("headline")).toMatchObject({ u: 0.5, vTop: 0.16 });
    expect(resolveZonePoint("currentRole")).toMatchObject({ u: 0.45, vTop: 0.3 });
    expect(resolveZonePoint("evidenceDora")).toMatchObject({ u: 0.5, vTop: 0.35 });
    expect(resolveZonePoint("evidenceIfrs")).toMatchObject({ u: 0.48, vTop: 0.44 });
    expect(resolveZonePoint("evidenceControls")).toMatchObject({ u: 0.48, vTop: 0.52 });
    expect(resolveZonePoint("education")).toMatchObject({ u: 0.5, vTop: 0.8 });
  });

  it("adds offsets to zone defaults rather than replacing them", () => {
    const base = resolveZonePoint("header");
    const shifted = resolveZonePoint("header", { u: 0.05, vTop: -0.02 });
    expect(shifted.u).toBeCloseTo(base.u + 0.05, 5);
    expect(shifted.vTop).toBeCloseTo(base.vTop - 0.02, 5);
  });

  it("defines an upper-right QR avoid-zone", () => {
    expect(QR_AVOID_ZONE.uMin).toBeGreaterThanOrEqual(0.7);
    expect(isInsideQrAvoidZone(0.85, 0.06)).toBe(true);
    expect(isInsideQrAvoidZone(0.5, 0.08)).toBe(false);
    expect(isInsideQrAvoidZone(0.85, 0.3)).toBe(false);
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

    const back = plane.toTopLeftFromWorld(world.x, world.y);
    expect(back.u).toBeCloseTo(u, 5);
    expect(back.vTop).toBeCloseTo(vTop, 5);
  });

  it("documents zone stability for recalibration guidance", () => {
    const stability = listZoneStability();
    expect(stability.find((z) => z.id === "header")?.stability).toBe("stable");
    expect(stability.find((z) => z.id === "education")?.stability).toBe("fragile");
    expect(stability.find((z) => z.id === "skills")?.stability).toBe("moderate");
  });
});
