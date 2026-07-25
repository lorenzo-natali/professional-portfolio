import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindArViewportListeners, syncArViewportShell } from "./arViewport";

function stubVisualViewport({
  width = 360,
  height = 640,
  offsetLeft = 12,
  offsetTop = 24,
} = {}) {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      width,
      height,
      offsetLeft,
      offsetTop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

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

  it("keeps left/top pixel anchors and never finishes with inset:auto", () => {
    const shell = document.createElement("div");
    stubVisualViewport({ width: 360, height: 640, offsetLeft: 12, offsetTop: 24 });

    syncArViewportShell(shell);

    expect(shell.style.left).toBe("12px");
    expect(shell.style.top).toBe("24px");
    expect(shell.style.right).toBe("auto");
    expect(shell.style.bottom).toBe("auto");
    expect(shell.style.width).toBe("360px");
    expect(shell.style.height).toBe("640px");
    expect(shell.style.inset).toBe("");
    expect(shell.style.cssText).not.toMatch(/(?:^|;)\s*inset\s*:/);
    expect(shell.style.transform).toBe("none");
  });

  it("places the shell rectangle so it intersects the visual viewport", () => {
    const shell = document.createElement("div");
    document.body.appendChild(shell);
    stubVisualViewport({ width: 390, height: 700, offsetLeft: 0, offsetTop: 0 });

    syncArViewportShell(shell);

    // jsdom does not layout fixed elements from style alone; mirror the sync contract.
    shell.style.position = "fixed";
    Object.defineProperty(shell, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 390,
        bottom: 700,
        width: 390,
        height: 700,
        x: 0,
        y: 0,
      }),
    });

    const rect = shell.getBoundingClientRect();
    const vv = window.visualViewport;
    const intersects =
      rect.left < vv.offsetLeft + vv.width &&
      rect.right > vv.offsetLeft &&
      rect.top < vv.offsetTop + vv.height &&
      rect.bottom > vv.offsetTop;

    expect(intersects).toBe(true);
    expect(shell.style.left).toBe("0px");
    expect(shell.style.top).toBe("0px");
    shell.remove();
  });

  it("falls back to window inner size when visualViewport is absent", () => {
    const shell = document.createElement("div");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    syncArViewportShell(shell);

    expect(shell.style.width).toBe("390px");
    expect(shell.style.height).toBe("844px");
    expect(shell.style.left).toBe("0px");
    expect(shell.style.top).toBe("0px");
    expect(shell.style.right).toBe("auto");
    expect(shell.style.bottom).toBe("auto");
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
});
