import { describe, expect, it } from "vitest";
import { lensOptions } from "./portfolioLens.js";
import { lensRelevance } from "./portfolioData.js";
import { deriveMacroLensRelevance } from "./deriveMacroLensRelevance.js";

describe("deriveMacroLensRelevance", () => {
  it("returns no relevant macros for Overview", () => {
    expect(deriveMacroLensRelevance("Overview")).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });
  });

  it("returns no relevant macros for null, empty, or missing lens", () => {
    expect(deriveMacroLensRelevance(null)).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });
    expect(deriveMacroLensRelevance("")).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });
    expect(deriveMacroLensRelevance("Not A Real Lens")).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });
  });

  it("derives Capabilities and Evidence for every current non-Overview lens", () => {
    for (const lens of lensOptions) {
      const flags = deriveMacroLensRelevance(lens.name);
      expect(flags.capabilities, lens.name).toBe(true);
      expect(flags.evidence, lens.name).toBe(true);
      expect(flags.profile, lens.name).toBe(false);
      expect(flags.insights, lens.name).toBe(false);
    }
  });

  it("does not mark Profile from streamItems alone", () => {
    const streamOnlyMap = {
      "Stream Only Lens": {
        capabilities: [],
        credentials: [],
        experiences: [],
        projects: [],
        radar: [],
        education: [],
        streamItems: ["DORA", "ITGC"],
      },
    };

    expect(deriveMacroLensRelevance("Stream Only Lens", streamOnlyMap)).toEqual(
      {
        profile: false,
        capabilities: false,
        evidence: false,
        insights: false,
      }
    );
  });

  it("does not mark Insights while unavailable even if groups were present", () => {
    const futureMap = {
      "Future Lens": {
        capabilities: ["capability-ai-governance"],
        credentials: [],
        experiences: [],
        projects: [],
        radar: [],
        education: [],
        streamItems: [],
      },
    };
    const flags = deriveMacroLensRelevance("Future Lens", futureMap);
    expect(flags.insights).toBe(false);
    expect(flags.capabilities).toBe(true);
  });

  it("does not mutate the lensRelevance input", () => {
    const snapshot = structuredClone(lensRelevance);
    deriveMacroLensRelevance("AI Governance");
    expect(lensRelevance).toEqual(snapshot);
  });

  it("returns only boolean flags (no counts)", () => {
    const flags = deriveMacroLensRelevance("Banking Risk");
    for (const value of Object.values(flags)) {
      expect(value).toBeTypeOf("boolean");
    }
    expect(Object.keys(flags).sort()).toEqual([
      "capabilities",
      "evidence",
      "insights",
      "profile",
    ]);
  });

  it("fails safely on incomplete relevance map values", () => {
    expect(
      deriveMacroLensRelevance("Broken", {
        Broken: null,
      })
    ).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });

    expect(deriveMacroLensRelevance("Broken", null)).toEqual({
      profile: false,
      capabilities: false,
      evidence: false,
      insights: false,
    });
  });
});
