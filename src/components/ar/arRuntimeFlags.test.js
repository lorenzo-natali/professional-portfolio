import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureArRuntimeFlags,
  getArRuntimeFlags,
  resetArRuntimeFlagsForTests,
} from "./arRuntimeFlags";

describe("arRuntimeFlags", () => {
  beforeEach(() => {
    resetArRuntimeFlagsForTests();
  });

  afterEach(() => {
    resetArRuntimeFlagsForTests();
  });

  it("latches audit from the initial search and survives later search clears", () => {
    const first = captureArRuntimeFlags({
      href: "https://example.com/professional-portfolio/?arRuntimeAudit=1",
      pathname: "/professional-portfolio/",
      search: "?arRuntimeAudit=1",
      hash: "",
    });
    expect(first.arRuntimeAudit).toBe(true);
    expect(first.source).toBe("initial-url");

    const again = captureArRuntimeFlags({
      href: "https://example.com/professional-portfolio/",
      pathname: "/professional-portfolio/",
      search: "",
      hash: "",
    });
    expect(again).toBe(first);
    expect(getArRuntimeFlags().arRuntimeAudit).toBe(true);
  });

  it("reads arRuntimeAudit without enabling viewport debug", () => {
    const flags = captureArRuntimeFlags({
      href: "https://host/?arRuntimeAudit=1",
      pathname: "/",
      search: "?arRuntimeAudit=1",
      hash: "",
    });
    expect(flags.arRuntimeAudit).toBe(true);
    expect(flags.arViewportDebug).toBe(false);
  });

  it("does not recognize removed calibrate flags", () => {
    const flags = captureArRuntimeFlags({
      href: "https://host/?arInterestsCalibrate=1",
      pathname: "/",
      search: "?arInterestsCalibrate=1",
      hash: "",
    });
    expect(flags.arRuntimeAudit).toBe(false);
    expect(flags).not.toHaveProperty("arInterestsCalibrate");
  });

  it("latches arRotateAudit independently of viewport debug", () => {
    const flags = captureArRuntimeFlags({
      href: "https://host/?arRotateAudit=1",
      pathname: "/",
      search: "?arRotateAudit=1",
      hash: "",
    });
    expect(flags.arRotateAudit).toBe(true);
    expect(flags.arRuntimeAudit).toBe(false);
    expect(flags.arViewportDebug).toBe(false);
    expect(flags.arRuntimeVariant).toBeNull();
  });

  it("latches arRuntimeVariant independently and leaves default null", () => {
    expect(
      captureArRuntimeFlags({
        href: "https://host/",
        pathname: "/",
        search: "",
        hash: "",
      }).arRuntimeVariant,
    ).toBeNull();

    resetArRuntimeFlagsForTests();
    const flags = captureArRuntimeFlags({
      href: "https://host/?arRuntimeVariant=half-resolution&arRotateAudit=1",
      pathname: "/",
      search: "?arRuntimeVariant=half-resolution&arRotateAudit=1",
      hash: "",
    });
    expect(flags.arRuntimeVariant).toBe("half-resolution");
    expect(flags.arRotateAudit).toBe(true);
  });
});
