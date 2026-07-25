import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindArViewportListeners, syncArViewportShell } from "./arViewport";

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

  it("locks the shell to fixed full-viewport dimensions", () => {
    const shell = document.createElement("div");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    syncArViewportShell(shell);

    expect(shell.style.position).toBe("fixed");
    expect(shell.style.left).toBe("0px");
    expect(shell.style.top).toBe("0px");
    expect(shell.style.width).toBe("390px");
    expect(shell.style.height).toBe("844px");
    expect(shell.style.overflow).toBe("hidden");
    expect(shell.style.maxWidth).toBe("100vw");
    expect(shell.style.maxHeight).toBe("100dvh");
  });

  it("follows visualViewport size and offset for iOS Safari", () => {
    const shell = document.createElement("div");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 360,
        height: 640,
        offsetLeft: 12,
        offsetTop: 24,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    syncArViewportShell(shell);

    expect(shell.style.width).toBe("360px");
    expect(shell.style.height).toBe("640px");
    expect(shell.style.transform).toBe("translate(12px, 24px)");
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
