import { describe, expect, it, vi, afterEach } from "vitest";
import { syncArViewportShell, collectArViewportMetrics } from "./arViewport";
import { syncTrackingContainerToShell } from "./tracking/MindARTrackingAdapter";

describe("AR fullscreen layer constraints", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("mounts shell styles without inherited max-width and matches layout right edge", () => {
    const shell = document.createElement("div");
    shell.className = "ar-viewport-shell";
    shell.dataset.arViewportShell = "true";
    const stage = document.createElement("div");
    stage.dataset.arCameraStage = "true";
    stage.className = "ar-camera-stage";
    const container = document.createElement("div");
    container.dataset.arTrackingContainer = "true";
    container.className = "ar-tracking-container";
    stage.appendChild(container);
    shell.appendChild(stage);
    document.body.appendChild(shell);

    // Simulate a portfolio ancestor constraint that must not affect the portal shell.
    const main = document.createElement("main");
    main.style.maxWidth = "480px";
    main.style.width = "480px";
    document.body.appendChild(main);

    syncArViewportShell(shell);

    expect(shell.parentElement).toBe(document.body);
    expect(main.contains(shell)).toBe(false);
    expect(shell.style.maxWidth).toBe("none");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.left).toBe("0px");
    expect(shell.style.right).toBe("0px");

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 390,
    });
    const fullRect = {
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
      x: 0,
      y: 0,
      toJSON() {},
    };
    shell.getBoundingClientRect = () => fullRect;
    stage.getBoundingClientRect = () => fullRect;
    Object.defineProperty(shell, "clientWidth", { configurable: true, value: 390 });
    Object.defineProperty(shell, "clientHeight", { configurable: true, value: 844 });

    syncTrackingContainerToShell(container, shell);
    expect(container.style.width).toBe("390px");
    expect(container.style.height).toBe("844px");
    expect(container.style.maxWidth).toBe("none");

    const metrics = collectArViewportMetrics(shell);
    expect(Math.abs(metrics.rightGapPx)).toBeLessThanOrEqual(1);
  });

  it("re-syncs container after a shell client box change (loadedmetadata / orientation)", () => {
    const shell = document.createElement("div");
    const container = document.createElement("div");
    document.body.appendChild(shell);
    shell.appendChild(container);

    Object.defineProperty(shell, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(shell, "clientHeight", { configurable: true, value: 568 });
    syncTrackingContainerToShell(container, shell);
    expect(container.style.width).toBe("320px");

    Object.defineProperty(shell, "clientWidth", { configurable: true, value: 390 });
    Object.defineProperty(shell, "clientHeight", { configurable: true, value: 844 });
    syncArViewportShell(shell);
    syncTrackingContainerToShell(container, shell);
    expect(container.style.width).toBe("390px");
    expect(container.style.height).toBe("844px");
  });
});
