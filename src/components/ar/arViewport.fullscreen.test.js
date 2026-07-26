import { describe, expect, it, afterEach } from "vitest";
import {
  collectArViewportMetrics,
  ensureArPortalHost,
  syncArViewportShell,
  syncTrackingContainerToShell,
  teardownArPortalHost,
} from "./arViewport";

describe("AR fullscreen layer constraints", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.querySelectorAll("[data-ar-portal-host='true']").forEach((el) => el.remove());
  });

  it("mounts portal host under documentElement (not body / not portfolio wrappers)", () => {
    const main = document.createElement("main");
    main.style.maxWidth = "480px";
    main.style.transform = "translateZ(0)";
    document.body.appendChild(main);

    const host = ensureArPortalHost();
    const shell = document.createElement("div");
    shell.className = "ar-viewport-shell";
    shell.dataset.arViewportShell = "true";
    host.appendChild(shell);

    syncArViewportShell(shell, host);

    expect(host.parentElement).toBe(document.documentElement);
    expect(main.contains(host)).toBe(false);
    expect(document.body.contains(host)).toBe(false);
    expect(shell.parentElement).toBe(host);
    expect(host.style.maxWidth).toBe("none");
    expect(shell.style.maxWidth).toBe("none");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.transform).toBe("none");

    shell.remove();
    teardownArPortalHost(host);
  });

  it("does not size stage/container from camera aspect or shell pixel width", () => {
    const shell = document.createElement("div");
    const stage = document.createElement("div");
    stage.dataset.arCameraStage = "true";
    const container = document.createElement("div");
    container.dataset.arTrackingContainer = "true";
    stage.appendChild(container);
    shell.appendChild(stage);
    document.body.appendChild(shell);

    Object.defineProperty(shell, "clientWidth", { value: 300 });
    Object.defineProperty(shell, "clientHeight", { value: 600 });
    syncArViewportShell(shell);
    syncTrackingContainerToShell(container, shell);

    expect(container.style.width).toBe("auto");
    expect(container.style.height).toBe("auto");
    expect(stage.style.width).toBe("auto");
    expect(container.style.width).not.toBe("300px");
  });

  it("reports acceptance gaps from stage vs documentElement", () => {
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
      bottom: 844,
      width: 390,
      height: 844,
      x: 0,
      y: 0,
      toJSON() {},
    };
    shell.getBoundingClientRect = () => full;
    stage.getBoundingClientRect = () => full;
    const m = collectArViewportMetrics(shell, { phase: "test" });
    expect(m.acceptance.gapLeftOk).toBe(true);
    expect(m.acceptance.gapRightOk).toBe(true);
    expect(m.phase).toBe("test");
  });
});
