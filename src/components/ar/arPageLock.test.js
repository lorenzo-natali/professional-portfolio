import { afterEach, describe, expect, it, vi } from "vitest";
import { lockArPage, setPortfolioInert } from "./arPageLock";

describe("lockArPage", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
    window.scrollTo(0, 0);
  });

  it("locks scroll without body position:fixed (iOS containing-block safe)", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "scrollX", "get").mockReturnValue(12);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(240);

    document.body.style.overflow = "auto";

    const unlock = lockArPage();

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.documentElement.style.touchAction).toBe("none");
    expect(document.documentElement.style.overscrollBehavior).toBe("none");
    expect(document.documentElement.style.width).toBe("100%");
    // Critical: never pin body fixed — that caused the iPhone right gap.
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.width).toBe("100%");
    expect(document.body.style.maxWidth).toBe("none");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.touchAction).toBe("none");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    unlock();

    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.width).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(12, 240);

    // Idempotent.
    unlock();
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});

describe("setPortfolioInert", () => {
  it("blocks pointer interaction while AR is open", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    setPortfolioInert(root, true);
    expect(root.hasAttribute("inert")).toBe(true);
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.style.pointerEvents).toBe("none");

    setPortfolioInert(root, false);
    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    expect(root.style.pointerEvents).toBe("");

    root.remove();
  });
});
