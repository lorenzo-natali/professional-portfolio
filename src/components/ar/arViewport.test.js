import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindArViewportListeners,
  collectArViewportMetrics,
  ensureArPortalHost,
  normalizeMindArLayerStyles,
  syncArViewportShell,
  syncTrackingContainerToShell,
  teardownArPortalHost,
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
    document.body.innerHTML = "";
  });

  it("never sizes the shell from visualViewport.width", () => {
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

    expect(shell.style.left).toBe("0px");
    expect(shell.style.right).toBe("0px");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.height).toBe("auto");
    expect(shell.style.maxWidth).toBe("none");
    expect(shell.style.width).not.toBe("360px");
    expect(shell.style.left).not.toBe("12px");
  });

  it("keeps tracking container on inset:0 without pixel pinning", () => {
    const container = document.createElement("div");
    const shell = document.createElement("div");
    Object.defineProperty(shell, "clientWidth", { value: 320 });
    Object.defineProperty(shell, "clientHeight", { value: 568 });
    syncTrackingContainerToShell(container, shell);
    expect(container.style.left).toBe("0px");
    expect(container.style.right).toBe("0px");
    expect(container.style.width).toBe("auto");
    expect(container.style.height).toBe("auto");
    expect(container.style.width).not.toBe("320px");
  });

  it("normalizes MindAR layers without shrinking the container to camera aspect", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 390 });
    Object.defineProperty(container, "clientHeight", { value: 844 });
    const video = document.createElement("video");
    video.style.width = "200px";
    video.style.height = "400px";
    const canvas = document.createElement("canvas");
    container.appendChild(video);
    container.appendChild(canvas);

    const report = normalizeMindArLayerStyles(container, {});
    expect(container.style.width).toBe("auto");
    expect(canvas.style.width).toBe("390px");
    expect(canvas.style.height).toBe("844px");
    // Undersized video is expanded to cover; container stays fullscreen auto.
    expect(parseFloat(video.style.width)).toBeGreaterThanOrEqual(390);
    expect(report.canvasInline.width).toBe("390px");
  });

  it("creates a portal host under document.body", () => {
    const host = ensureArPortalHost();
    expect(host.parentElement).toBe(document.body);
    expect(host.dataset.arPortalHost).toBe("true");
    expect(host.style.maxWidth).toBe("none");
    expect(host.style.width).toBe("auto");
    teardownArPortalHost(host);
    expect(document.querySelector("[data-ar-portal-host='true']")).toBeNull();
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
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("computes gapLeft/gapRight diagnostics against documentElement", () => {
    const shell = document.createElement("div");
    const stage = document.createElement("div");
    stage.dataset.arCameraStage = "true";
    shell.appendChild(stage);
    document.body.appendChild(shell);
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 390,
    });
    const full = {
      left: 0,
      top: 0,
      right: 390,
      bottom: 700,
      width: 390,
      height: 700,
      x: 0,
      y: 0,
      toJSON() {},
    };
    shell.getBoundingClientRect = () => full;
    stage.getBoundingClientRect = () => full;
    const metrics = collectArViewportMetrics(shell);
    expect(metrics.gaps.gapLeft).toBeCloseTo(0, 5);
    expect(metrics.gaps.gapRight).toBeCloseTo(0, 5);
    expect(metrics.acceptance.gapRightOk).toBe(true);
  });
});
