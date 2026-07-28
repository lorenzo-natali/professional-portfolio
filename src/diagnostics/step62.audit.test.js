import { describe, expect, it } from "vitest";
import {
  BEYOND_INTRODUCTION,
  SMALLEST_IDLE_HOMEPAGE_SUSPECT_SET,
  getBeyondGitSuspectMatrix,
} from "./beyondGitSuspects.js";
import { FULL_VS_EFFECTS_DELTA } from "./fullVsEffectsDelta.js";

describe("Step 6.2 audit artifacts", () => {
  it("records Beyond introduction anchors", () => {
    expect(BEYOND_INTRODUCTION.firstArHomepageCommit).toMatch(/^[0-9a-f]+$/i);
    expect(BEYOND_INTRODUCTION.parentBeforeAr).toMatch(/^[0-9a-f]+$/i);
    expect(getBeyondGitSuspectMatrix().length).toBeGreaterThan(4);
    expect(SMALLEST_IDLE_HOMEPAGE_SUSPECT_SET.length).toBeGreaterThanOrEqual(3);
  });

  it("records Beyond view host as deferred until open (Step 6.4)", () => {
    const row = FULL_VS_EFFECTS_DELTA.find((r) =>
      r.subsystem.includes("Beyond view host"),
    );
    expect(row?.mountedOnHomepage).toBe(false);
    expect(row?.startsBeforeUserInteraction).toBe(false);
    expect(row?.risk).toBe("medium");
  });
});
