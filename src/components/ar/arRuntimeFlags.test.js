import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureArRuntimeFlags,
  getArRuntimeFlags,
  resetArRuntimeFlagsForTests,
  resolveCalibrateFlagFromLocation,
} from "./arRuntimeFlags";
import { AR_INTERESTS_CALIBRATE_SESSION_KEY } from "./interestObjectsCalibrateStorage";

describe("arRuntimeFlags", () => {
  beforeEach(() => {
    resetArRuntimeFlagsForTests();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetArRuntimeFlagsForTests();
    sessionStorage.clear();
  });

  it("latches calibrate from the initial search and survives later search clears", () => {
    const first = captureArRuntimeFlags({
      href: "https://example.com/professional-portfolio/?arInterestsCalibrate=1",
      pathname: "/professional-portfolio/",
      search: "?arInterestsCalibrate=1",
      hash: "",
    });
    expect(first.arInterestsCalibrate).toBe(true);
    expect(first.calibrateSource).toBe("search");
    expect(sessionStorage.getItem(AR_INTERESTS_CALIBRATE_SESSION_KEY)).toBe("1");

    // Later calls must not drop the latch even if URL no longer has the flag.
    const again = captureArRuntimeFlags({
      href: "https://example.com/professional-portfolio/",
      pathname: "/professional-portfolio/",
      search: "",
      hash: "",
    });
    expect(again).toBe(first);
    expect(getArRuntimeFlags().arInterestsCalibrate).toBe(true);
  });

  it("reads arRuntimeAudit without requiring DEV", () => {
    const flags = captureArRuntimeFlags({
      href: "https://host/?arRuntimeAudit=1&arInterestsCalibrate=true",
      pathname: "/",
      search: "?arRuntimeAudit=1&arInterestsCalibrate=true",
      hash: "",
    });
    expect(flags.arRuntimeAudit).toBe(true);
    expect(flags.arInterestsCalibrate).toBe(true);
    // Audit must not auto-enable the heavy viewport-outline HUD.
    expect(flags.arViewportDebug).toBe(false);
  });

  it("resolveCalibrateFlagFromLocation supports hash and session", () => {
    expect(
      resolveCalibrateFlagFromLocation({
        search: "",
        hash: "#/?arInterestsCalibrate=1",
        href: "https://h/#/?arInterestsCalibrate=1",
      }).enabled,
    ).toBe(true);

    sessionStorage.setItem(AR_INTERESTS_CALIBRATE_SESSION_KEY, "1");
    expect(
      resolveCalibrateFlagFromLocation({ search: "", hash: "", href: "https://h/" }).enabled,
    ).toBe(true);
  });
});
