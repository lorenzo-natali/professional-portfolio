import { afterEach, describe, expect, it } from "vitest";
import {
  AR_CAMERA_DEBUG,
  extractArCameraDebugParam,
  isArCameraDebugEnabled,
  resolveArCameraDebugSessionFlag,
} from "./arDebug";

describe("arDebug camera diagnostics flag", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("is disabled by default", () => {
    expect(AR_CAMERA_DEBUG).toBe(false);
    expect(isArCameraDebugEnabled()).toBe(false);
    expect(resolveArCameraDebugSessionFlag()).toBe(false);
  });

  it("enables for ?arCameraDebug=1 in search, hash, and GitHub Pages paths", () => {
    expect(isArCameraDebugEnabled("?arCameraDebug=1")).toBe(true);
    expect(isArCameraDebugEnabled("/professional-portfolio/?arCameraDebug=1")).toBe(true);
    expect(isArCameraDebugEnabled("#/?arCameraDebug=1")).toBe(true);
    expect(isArCameraDebugEnabled("#arCameraDebug=1")).toBe(true);
    expect(
      extractArCameraDebugParam("https://example.github.io/professional-portfolio/?arCameraDebug=1"),
    ).toBe("1");
  });

  it("does not enable for unrelated query parameters", () => {
    expect(isArCameraDebugEnabled("?foo=1&bar=2")).toBe(false);
    expect(isArCameraDebugEnabled("?arCameraDebug=0")).toBe(false);
    expect(isArCameraDebugEnabled("?arCameraDebug=true")).toBe(false);
  });

  it("reads the live location without latching after the URL changes", () => {
    window.history.replaceState({}, "", "/?arCameraDebug=1");
    expect(isArCameraDebugEnabled()).toBe(true);
    expect(resolveArCameraDebugSessionFlag()).toBe(true);
    window.history.replaceState({}, "", "/");
    expect(isArCameraDebugEnabled()).toBe(false);
  });
});
