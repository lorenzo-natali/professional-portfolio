import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SITE_DIAG_MODES,
  SITE_DIAG_PARAM,
  captureSiteDiagMode,
  getAppFeaturesForSiteDiagMode,
  getSiteDiagInitLog,
  getSiteDiagMode,
  getSiteDiagSubsystemMatrix,
  isSiteDiagSubsystemEnabled,
  markSiteDiagInit,
  parseSiteDiagMode,
  resetSiteDiagInitLog,
  resetSiteDiagLatchForTests,
} from "./siteDiag.js";

describe("siteDiag flags", () => {
  beforeEach(() => {
    resetSiteDiagLatchForTests();
    resetSiteDiagInitLog();
  });

  afterEach(() => {
    resetSiteDiagLatchForTests();
    resetSiteDiagInitLog();
  });

  it("parses additive and subtractive modes", () => {
    expect(SITE_DIAG_PARAM).toBe("siteDiag");
    for (const mode of SITE_DIAG_MODES) {
      expect(parseSiteDiagMode(`?siteDiag=${mode}`)).toBe(mode);
    }
    expect(parseSiteDiagMode("?siteDiag=camera")).toBeNull();
  });

  it("latches once before later URL mutation", () => {
    expect(captureSiteDiagMode("?siteDiag=blank")).toBe("blank");
    expect(getSiteDiagMode()).toBe("blank");
    expect(captureSiteDiagMode("?siteDiag=full")).toBe("blank");
  });

  it("maps subtractive feature flags", () => {
    expect(getAppFeaturesForSiteDiagMode("full-no-beyond")).toEqual({
      beyond: false,
      assistant: true,
      intro: true,
      preload: false,
    });
    expect(getAppFeaturesForSiteDiagMode("full-core")).toEqual({
      beyond: false,
      assistant: false,
      intro: false,
      preload: false,
    });
    expect(getAppFeaturesForSiteDiagMode("full-no-preload").preload).toBe(false);
    expect(getAppFeaturesForSiteDiagMode("effects")).toBeNull();
  });

  it("full-no-beyond matrix disables AR subsystems", () => {
    expect(isSiteDiagSubsystemEnabled("full-no-beyond", "fullPortfolioApp")).toBe(
      true,
    );
    expect(isSiteDiagSubsystemEnabled("full-no-beyond", "arBeyond")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("full-no-beyond", "arPreloadEager")).toBe(
      false,
    );
    expect(isSiteDiagSubsystemEnabled("full-no-beyond", "portfolioAssistant")).toBe(
      true,
    );

    expect(isSiteDiagSubsystemEnabled("full-core", "portfolioAssistant")).toBe(
      false,
    );
    expect(isSiteDiagSubsystemEnabled("full", "arPreloadEager")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("full-no-preload", "arBeyond")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("full-no-preload", "arPreloadEager")).toBe(
      false,
    );

    const effectsOn = getSiteDiagSubsystemMatrix("effects")
      .filter((r) => r.enabled)
      .map((r) => r.id);
    expect(effectsOn).not.toContain("fullPortfolioApp");
  });

  it("bounds init log", () => {
    for (let i = 0; i < 100; i += 1) {
      markSiteDiagInit("tickerRaf", String(i));
    }
    expect(getSiteDiagInitLog().length).toBeLessThanOrEqual(64);
  });
});
