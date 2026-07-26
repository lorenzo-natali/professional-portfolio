import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindArViewportListeners,
  classifyArResizeGapCause,
  collectArViewportMetrics,
  ensureArPortalHost,
  measureArResizePipeline,
  normalizeMindArLayerStyles,
  recordArViewportResizeProbe,
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
    document.querySelectorAll("[data-ar-portal-host='true']").forEach((el) => el.remove());
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

    expect(shell.style.position).toBe("absolute");
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

  it("creates a portal host under document.documentElement", () => {
    const host = ensureArPortalHost();
    expect(host.parentElement).toBe(document.documentElement);
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

  it("classifies ancestor layout vs media sizing for the right strip", () => {
    const ancestor = classifyArResizeGapCause({
      documentElement: { clientWidth: 390 },
      window: { innerWidth: 390 },
      visualViewport: { width: 390, offsetLeft: 0 },
      shell: { rect: { right: 360, width: 360 } },
      stage: { rect: { right: 360, width: 360 } },
      container: { rect: { width: 360, left: 0 } },
      video: { rect: { width: 360, left: 0 } },
      canvas: { rect: { width: 360 } },
    });
    expect(ancestor.primary).toBe("ancestor_layout");
    expect(ancestor.ancestorNarrow).toBe(true);

    const media = classifyArResizeGapCause({
      documentElement: { clientWidth: 390 },
      window: { innerWidth: 390 },
      visualViewport: { width: 390, offsetLeft: 0 },
      shell: { rect: { right: 390, width: 390 } },
      stage: { rect: { right: 390, width: 390 } },
      container: { rect: { width: 390, left: 0 } },
      video: { rect: { width: 340, left: -10 } },
      canvas: { rect: { width: 390 } },
    });
    expect(media.primary).toBe("media_sizing");
    expect(media.mediaNarrow).toBe(true);
  });

  it("records resize probes onto window.__arViewportResizeLog", () => {
    window.__arViewportResizeLog = [];
    const host = ensureArPortalHost();
    const shell = document.createElement("div");
    shell.dataset.arViewportShell = "true";
    const stage = document.createElement("div");
    stage.dataset.arCameraStage = "true";
    const container = document.createElement("div");
    container.dataset.arTrackingContainer = "true";
    stage.appendChild(container);
    shell.appendChild(stage);
    host.appendChild(shell);
    syncArViewportShell(shell, host);

    const probe = measureArResizePipeline(shell, container, {
      step: "unit:after-normalize",
      reason: "unit",
      resized: false,
      skippedResize: true,
    });
    recordArViewportResizeProbe(probe);
    expect(window.__arViewportResizeLog.at(-1).step).toBe("unit:after-normalize");
    expect(window.__arViewportResizeLog.at(-1).cause).toBeTruthy();
  });
});
