import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { getNavigatorSections } from "./sectionCatalog.js";
import {
  DEFAULT_ACTIVE_SECTION_ID,
  SECTION_ACTIVE_OBSERVER_OPTIONS,
  resolveActiveSectionId,
  useActivePortfolioSection,
} from "./useActivePortfolioSection.js";

describe("resolveActiveSectionId", () => {
  const ordered = getNavigatorSections().map((section) => section.id);

  it("forces Overview (hero) at the page top", () => {
    expect(
      resolveActiveSectionId(
        {
          hero: { isIntersecting: false, ratio: 0, top: -100 },
          "role-lens": { isIntersecting: true, ratio: 0.8, top: 40 },
          capabilities: { isIntersecting: false, ratio: 0, top: 800 },
        },
        "role-lens",
        ordered,
        { scrollY: 0, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("hero");
  });

  it("keeps Risk Radar near the page bottom", () => {
    expect(
      resolveActiveSectionId(
        {
          education: { isIntersecting: true, ratio: 0.2, top: -100 },
          "risk-radar": { isIntersecting: true, ratio: 0.4, top: 200 },
        },
        "education",
        ordered,
        { scrollY: 4200, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("risk-radar");
  });

  it("selects the strongest intersecting section and keeps only one active", () => {
    expect(
      resolveActiveSectionId(
        {
          hero: { isIntersecting: true, ratio: 0.1, top: -40 },
          capabilities: { isIntersecting: true, ratio: 0.7, top: 80 },
          experience: { isIntersecting: false, ratio: 0, top: 900 },
        },
        "hero",
        ordered,
        { scrollY: 400, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("capabilities");
  });

  it("applies hysteresis to avoid avoidable boundary flicker", () => {
    expect(
      resolveActiveSectionId(
        {
          hero: { isIntersecting: true, ratio: 0.45, top: -20 },
          "role-lens": { isIntersecting: true, ratio: 0.5, top: 120 },
        },
        "hero",
        ordered,
        { scrollY: 300, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("hero");
  });

  it("keeps the current section when nothing intersects", () => {
    expect(
      resolveActiveSectionId(
        {
          hero: { isIntersecting: false, ratio: 0, top: -400 },
          capabilities: { isIntersecting: false, ratio: 0, top: -100 },
          experience: { isIntersecting: false, ratio: 0, top: 900 },
        },
        "capabilities",
        ordered,
        { scrollY: 500, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("capabilities");
  });
});

describe("useActivePortfolioSection", () => {
  /** @type {Array<{ cb: Function, observe: Function, disconnect: Function, targets: Element[], options: object }>} */
  let observers = [];

  beforeEach(() => {
    observers = [];
    document.body.innerHTML = getNavigatorSections()
      .map((section) => `<div data-portfolio-section="${section.id}"></div>`)
      .join("");

    class MockIO {
      constructor(cb, options) {
        this.cb = cb;
        this.options = options;
        this.targets = [];
        this.observe = vi.fn((el) => {
          this.targets.push(el);
        });
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
    }
    vi.stubGlobal("IntersectionObserver", MockIO);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts on Overview and observes exactly the navigator section roots", () => {
    const { result } = renderHook(() => useActivePortfolioSection());
    expect(result.current.activeSectionId).toBe(DEFAULT_ACTIVE_SECTION_ID);
    expect(observers).toHaveLength(1);
    expect(observers[0].options).toMatchObject({
      rootMargin: SECTION_ACTIVE_OBSERVER_OPTIONS.rootMargin,
    });
    expect(
      observers[0].targets.map((el) => el.getAttribute("data-portfolio-section"))
    ).toEqual(getNavigatorSections().map((section) => section.id));
    expect(
      observers[0].targets.some(
        (el) => el.getAttribute("data-portfolio-section") === "credentials"
      )
    ).toBe(false);
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() => useActivePortfolioSection());
    expect(observers[0].disconnect).not.toHaveBeenCalled();
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("updates only when the resolved section changes", () => {
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });

    const { result } = renderHook(() => useActivePortfolioSection());
    const hero = document.querySelector('[data-portfolio-section="hero"]');
    const capabilities = document.querySelector(
      '[data-portfolio-section="capabilities"]'
    );

    act(() => {
      observers[0].cb([
        {
          target: hero,
          isIntersecting: true,
          intersectionRatio: 0.2,
          boundingClientRect: { top: -10 },
        },
        {
          target: capabilities,
          isIntersecting: true,
          intersectionRatio: 0.8,
          boundingClientRect: { top: 90 },
        },
      ]);
    });
    expect(result.current.activeSectionId).toBe("capabilities");

    act(() => {
      observers[0].cb([
        {
          target: hero,
          isIntersecting: true,
          intersectionRatio: 0.2,
          boundingClientRect: { top: -10 },
        },
        {
          target: capabilities,
          isIntersecting: true,
          intersectionRatio: 0.8,
          boundingClientRect: { top: 90 },
        },
      ]);
    });
    expect(result.current.activeSectionId).toBe("capabilities");
  });

  it("optimistically selects on navigate and unlocks after the one-shot settle", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });

    const { result } = renderHook(() => useActivePortfolioSection());

    act(() => {
      result.current.selectSection("experience");
    });
    expect(result.current.activeSectionId).toBe("experience");

    const experience = document.querySelector(
      '[data-portfolio-section="experience"]'
    );
    const capabilities = document.querySelector(
      '[data-portfolio-section="capabilities"]'
    );

    act(() => {
      observers[0].cb([
        {
          target: capabilities,
          isIntersecting: true,
          intersectionRatio: 0.9,
          boundingClientRect: { top: 40 },
        },
        {
          target: experience,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: { top: 900 },
        },
      ]);
    });
    expect(result.current.activeSectionId).toBe("experience");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.activeSectionId).toBe("capabilities");
  });

  it("fails safely when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useActivePortfolioSection());
    expect(result.current.activeSectionId).toBe("hero");
    act(() => {
      result.current.selectSection("projects");
    });
    expect(result.current.activeSectionId).toBe("projects");
  });
});
