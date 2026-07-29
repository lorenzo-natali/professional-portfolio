import { describe, expect, it } from "vitest";
import { PORTFOLIO_SECTION_IDS } from "./sectionCatalog.js";
import {
  ELEMENT_ONLY_LENS_GROUPS,
  MACRO_SECTIONS,
  getMacroKeyForSectionId,
  getMacroSectionByKey,
  getVisibleMacroSections,
  groupSectionIdsByMacro,
  registryCoversCatalogExactly,
} from "./macroSectionRegistry.js";

describe("macroSectionRegistry", () => {
  it("keeps deterministic macro order by ascending order field", () => {
    const orders = MACRO_SECTIONS.map((macro) => macro.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(MACRO_SECTIONS.map((macro) => macro.key)).toEqual([
      "profile",
      "capabilities",
      "evidence",
      "insights",
    ]);
  });

  it("exposes exactly three visible macros today", () => {
    const visible = getVisibleMacroSections();
    expect(visible).toHaveLength(3);
    expect(visible.map((macro) => macro.key)).toEqual([
      "profile",
      "capabilities",
      "evidence",
    ]);
  });

  it("keeps Insights in the registry but hidden", () => {
    const insights = getMacroSectionByKey("insights");
    expect(insights).toBeDefined();
    expect(insights.visible).toBe(false);
    expect(insights.memberSectionIds).toEqual([]);
    expect(insights.scrollTargetId).toBeNull();
    expect(getVisibleMacroSections().some((m) => m.key === "insights")).toBe(
      false
    );
  });

  it("defines the approved scroll targets", () => {
    expect(getMacroSectionByKey("profile").scrollTargetId).toBe("hero");
    expect(getMacroSectionByKey("capabilities").scrollTargetId).toBe(
      "capabilities"
    );
    expect(getMacroSectionByKey("evidence").scrollTargetId).toBe("experience");
  });

  it("groups member sections as approved", () => {
    expect(getMacroSectionByKey("profile").memberSectionIds).toEqual([
      "hero",
      "role-lens",
    ]);
    expect(getMacroSectionByKey("capabilities").memberSectionIds).toEqual([
      "capabilities",
      "credentials",
    ]);
    expect(getMacroSectionByKey("evidence").memberSectionIds).toEqual([
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]);
  });

  it("assigns every catalog section to exactly one visible macro", () => {
    expect(registryCoversCatalogExactly()).toBe(true);

    for (const sectionId of PORTFOLIO_SECTION_IDS) {
      const macroKey = getMacroKeyForSectionId(sectionId);
      expect(macroKey).toBeTypeOf("string");
      const macro = getMacroSectionByKey(macroKey);
      expect(macro.visible).toBe(true);
      expect(macro.memberSectionIds).toContain(sectionId);
    }
  });

  it("has unique macro keys, scroll targets, and no duplicated membership", () => {
    const keys = MACRO_SECTIONS.map((macro) => macro.key);
    expect(new Set(keys).size).toBe(keys.length);

    const scrollTargets = getVisibleMacroSections().map(
      (macro) => macro.scrollTargetId
    );
    expect(scrollTargets.every(Boolean)).toBe(true);
    expect(new Set(scrollTargets).size).toBe(scrollTargets.length);

    const members = getVisibleMacroSections().flatMap(
      (macro) => macro.memberSectionIds
    );
    expect(new Set(members).size).toBe(members.length);
  });

  it("treats streamItems as element-only, never a Profile marker group", () => {
    expect(ELEMENT_ONLY_LENS_GROUPS).toContain("streamItems");
    expect(getMacroSectionByKey("profile").markerGroups).toEqual([]);
    for (const macro of MACRO_SECTIONS) {
      expect(macro.markerGroups).not.toContain("streamItems");
    }
  });

  it("omits empty macros when grouping partial mounts", () => {
    const groups = groupSectionIdsByMacro(["experience", "projects"]);
    expect(groups.map((group) => group.key)).toEqual(["evidence"]);
    expect(groups[0].memberSectionIds).toEqual(["experience", "projects"]);
  });
});
