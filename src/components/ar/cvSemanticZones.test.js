import { describe, expect, it } from "vitest";
import { CV_SEMANTIC_ZONES, listZoneStability, resolveZonePoint } from "./cvSemanticZones";

describe("cvSemanticZones compatibility", () => {
  it("re-exports evidence anchors as the semantic zone map", () => {
    expect(Object.keys(CV_SEMANTIC_ZONES)).toContain("bocRoleTitle");
    expect(resolveZonePoint("bulletDora")).toMatchObject({ u: 0.5, vTop: 0.35 });
  });

  it("lists zone stability", () => {
    const stability = listZoneStability();
    expect(stability.find((z) => z.id === "bocRoleTitle")?.stability).toBe("stable");
  });
});
