import { describe, expect, it } from "vitest";
import {
  AR_CRASH_DIAG_MODES,
  AR_CRASH_DIAG_PARAM,
  arCrashDiagSnapshotLabel,
  getArCrashDiagCapabilities,
  isArCrashDiagEnabled,
  parseArCrashDiag,
} from "./arCrashDiag";

describe("arCrashDiag", () => {
  it("parses only the four supported modes", () => {
    expect(AR_CRASH_DIAG_PARAM).toBe("arDiag");
    expect(AR_CRASH_DIAG_MODES).toEqual(["camera", "render", "mindar", "frozen"]);
    expect(parseArCrashDiag("camera")).toBe("camera");
    expect(parseArCrashDiag("RENDER")).toBe("render");
    expect(parseArCrashDiag("mindar")).toBe("mindar");
    expect(parseArCrashDiag("frozen")).toBe("frozen");
    expect(parseArCrashDiag("nope")).toBeNull();
    expect(parseArCrashDiag("")).toBeNull();
    expect(parseArCrashDiag(null)).toBeNull();
  });

  it("exposes an exact subsystem matrix per mode", () => {
    expect(getArCrashDiagCapabilities("camera")).toMatchObject({
      camera: true,
      mindAr: false,
      mindArWorker: false,
      threeRender: false,
      interestContent: false,
      freezeAfterAcquire: false,
    });
    expect(getArCrashDiagCapabilities("render")).toMatchObject({
      camera: true,
      mindAr: false,
      threeRender: true,
      interestContent: false,
    });
    expect(getArCrashDiagCapabilities("mindar")).toMatchObject({
      camera: true,
      mindAr: true,
      mindArWorker: true,
      threeRender: false,
      interestContent: false,
      freezeAfterAcquire: false,
    });
    expect(getArCrashDiagCapabilities("frozen")).toMatchObject({
      camera: true,
      mindAr: true,
      threeRender: true,
      interestContent: true,
      freezeAfterAcquire: true,
    });
    expect(getArCrashDiagCapabilities(null)).toMatchObject({
      mode: null,
      mindAr: true,
      threeRender: true,
      interestContent: true,
      freezeAfterAcquire: false,
    });
  });

  it("labels enabled vs off", () => {
    expect(isArCrashDiagEnabled("camera")).toBe(true);
    expect(isArCrashDiagEnabled(null)).toBe(false);
    expect(arCrashDiagSnapshotLabel(null)).toBe("off");
    expect(arCrashDiagSnapshotLabel("frozen")).toBe("frozen");
  });
});
