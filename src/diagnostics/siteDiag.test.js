import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SITE_DIAG_MODES,
  SITE_DIAG_PARAM,
  SITE_DIAG_SUBSYSTEM_IDS,
  captureSiteDiagMode,
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

  it("parses valid modes and rejects unknown", () => {
    expect(SITE_DIAG_PARAM).toBe("siteDiag");
    for (const mode of SITE_DIAG_MODES) {
      expect(parseSiteDiagMode(`?siteDiag=${mode}`)).toBe(mode);
    }
    expect(parseSiteDiagMode("?siteDiag=camera")).toBeNull();
    expect(parseSiteDiagMode("")).toBeNull();
    expect(parseSiteDiagMode(null)).toBeNull();
  });

  it("latches once before later URL mutation", () => {
    expect(captureSiteDiagMode("?siteDiag=blank")).toBe("blank");
    expect(getSiteDiagMode()).toBe("blank");
    expect(captureSiteDiagMode("?siteDiag=full")).toBe("blank");
  });

  it("defines disjoint progressive matrices", () => {
    const blank = getSiteDiagSubsystemMatrix("blank");
    const shell = getSiteDiagSubsystemMatrix("shell");
    const motion = getSiteDiagSubsystemMatrix("motion");
    const effects = getSiteDiagSubsystemMatrix("effects");
    const full = getSiteDiagSubsystemMatrix("full");

    expect(blank.every((r) => SITE_DIAG_SUBSYSTEM_IDS.includes(r.id))).toBe(true);

    expect(isSiteDiagSubsystemEnabled("blank", "framerMotion")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("blank", "tickerRaf")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("blank", "portfolioAssistant")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("blank", "arBeyond")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("blank", "fullPortfolioApp")).toBe(false);

    expect(isSiteDiagSubsystemEnabled("shell", "staticShell")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("shell", "framerMotion")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("shell", "tickerRaf")).toBe(false);

    expect(isSiteDiagSubsystemEnabled("motion", "framerMotion")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("motion", "tickerRaf")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("motion", "framerMotionInfinite")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("motion", "portfolioAssistant")).toBe(false);

    expect(isSiteDiagSubsystemEnabled("effects", "tickerRaf")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("effects", "framerMotionInfinite")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("effects", "cssInfiniteAnimations")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("effects", "portfolioAssistant")).toBe(false);
    expect(isSiteDiagSubsystemEnabled("effects", "arBeyond")).toBe(false);

    expect(isSiteDiagSubsystemEnabled("full", "fullPortfolioApp")).toBe(true);
    expect(isSiteDiagSubsystemEnabled("full", "arBeyond")).toBe(true);

    expect(blank.filter((r) => r.enabled).map((r) => r.id)).toEqual([
      "lifecycleTrace",
      "reactRoot",
      "staticText",
    ]);
    expect(shell.filter((r) => r.enabled).length).toBeGreaterThan(
      blank.filter((r) => r.enabled).length,
    );
    expect(motion.filter((r) => r.enabled).length).toBeGreaterThan(
      shell.filter((r) => r.enabled).length,
    );
    expect(effects.filter((r) => r.enabled).length).toBeGreaterThan(
      motion.filter((r) => r.enabled).length,
    );
    expect(full.filter((r) => r.enabled).length).toBe(SITE_DIAG_SUBSYSTEM_IDS.length);
  });

  it("bounds init log", () => {
    for (let i = 0; i < 80; i += 1) {
      markSiteDiagInit("tickerRaf", String(i));
    }
    expect(getSiteDiagInitLog().length).toBeLessThanOrEqual(48);
  });
});
