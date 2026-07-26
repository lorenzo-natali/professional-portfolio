import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindArViewportListeners,
  collectArViewportMetrics,
  syncArViewportShell,
} from "./arViewport";

describe("arViewport shell", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pins the shell with inset:0 and never sizes to visualViewport.width", () => {
    const shell = document.createElement("div");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 360,
        height: 640,
        offsetLeft: 12,
        offsetTop: 24,
        scale: 1,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    syncArViewportShell(shell);

    expect(shell.style.position).toBe("fixed");
    expect(shell.style.left).toBe("0px");
    expect(shell.style.top).toBe("0px");
    expect(shell.style.right).toBe("0px");
    expect(shell.style.bottom).toBe("0px");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.height).toBe("auto");
    expect(shell.style.maxWidth).toBe("none");
    expect(shell.style.transform).toBe("none");
    // Must not adopt the narrower visualViewport box (causes right-side page gap).
    expect(shell.style.width).not.toBe("360px");
    expect(shell.style.left).not.toBe("12px");
  });

  it("falls back the same way when visualViewport is absent", () => {
    const shell = document.createElement("div");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    syncArViewportShell(shell);

    expect(shell.style.left).toBe("0px");
    expect(shell.style.right).toBe("0px");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.height).toBe("auto");
  });

  it("rebinds resize, orientationchange, and visualViewport listeners", () => {
    const onChange = vi.fn();
    const vv = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    });

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const cleanup = bindArViewportListeners(onChange);

    expect(onChange).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("orientationchange", expect.any(Function));
    expect(vv.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));

    cleanup();

    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("orientationchange", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("reports rightGap between documentElement and stage for DEV audits", () => {
    const shell = document.createElement("div");
    const stage = document.createElement("div");
    stage.dataset.arCameraStage = "true";
    shell.appendChild(stage);
    document.body.appendChild(shell);

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 390,
    });
    stage.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 390,
      bottom: 700,
      width: 390,
      height: 700,
      x: 0,
      y: 0,
      toJSON() {},
    });
    shell.getBoundingClientRect = stage.getBoundingClientRect;

    const metrics = collectArViewportMetrics(shell);
    expect(metrics.rightGapPx).toBeCloseTo(0, 5);
    shell.remove();
  });
});
