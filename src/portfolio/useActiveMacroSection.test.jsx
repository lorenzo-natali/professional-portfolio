import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { getVisibleMacroSections } from "./macroSectionRegistry.js";
import {
  DEFAULT_ACTIVE_MACRO_KEY,
  MACRO_ACTIVE_OBSERVER_OPTIONS,
  resolveActiveMacroKey,
  useActiveMacroSection,
} from "./useActiveMacroSection.js";

describe("resolveActiveMacroKey", () => {
  const ordered = ["profile", "capabilities", "evidence"];

  it("forces Profile at the page top", () => {
    expect(
      resolveActiveMacroKey(
        {
          profile: { isIntersecting: false, ratio: 0, top: -100 },
          capabilities: { isIntersecting: true, ratio: 0.8, top: 40 },
          evidence: { isIntersecting: false, ratio: 0, top: 800 },
        },
        "capabilities",
        ordered,
        { scrollY: 0, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("profile");
  });

  it("keeps Evidence near the page bottom", () => {
    expect(
      resolveActiveMacroKey(
        {
          profile: { isIntersecting: false, ratio: 0, top: -2000 },
          capabilities: { isIntersecting: true, ratio: 0.2, top: -100 },
          evidence: { isIntersecting: true, ratio: 0.4, top: 200 },
        },
        "capabilities",
        ordered,
        { scrollY: 4200, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("evidence");
  });

  it("selects the strongest intersecting macro and keeps only one active", () => {
    expect(
      resolveActiveMacroKey(
        {
          profile: { isIntersecting: true, ratio: 0.1, top: -40 },
          capabilities: { isIntersecting: true, ratio: 0.7, top: 80 },
          evidence: { isIntersecting: false, ratio: 0, top: 900 },
        },
        "profile",
        ordered,
        { scrollY: 400, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("capabilities");
  });

  it("applies hysteresis to avoid avoidable boundary flicker", () => {
    expect(
      resolveActiveMacroKey(
        {
          profile: { isIntersecting: true, ratio: 0.45, top: -20 },
          capabilities: { isIntersecting: true, ratio: 0.5, top: 120 },
          evidence: { isIntersecting: false, ratio: 0, top: 900 },
        },
        "profile",
        ordered,
        { scrollY: 300, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("profile");
  });

  it("keeps the current macro when nothing intersects", () => {
    expect(
      resolveActiveMacroKey(
        {
          profile: { isIntersecting: false, ratio: 0, top: -400 },
          capabilities: { isIntersecting: false, ratio: 0, top: -100 },
          evidence: { isIntersecting: false, ratio: 0, top: 900 },
        },
        "capabilities",
        ordered,
        { scrollY: 500, viewportHeight: 800, documentHeight: 5000 }
      )
    ).toBe("capabilities");
  });
});

describe("useActiveMacroSection", () => {
  /** @type {Array<{ cb: Function, observe: Function, disconnect: Function, targets: Element[] }>} */
  let observers = [];

  beforeEach(() => {
    observers = [];
    document.body.innerHTML = `
      <div data-macro-section="profile"></div>
      <div data-macro-section="capabilities"></div>
      <div data-macro-section="evidence"></div>
    `;

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

  it("starts on Profile and observes exactly the three visible macro roots", () => {
    const { result } = renderHook(() => useActiveMacroSection());
    expect(result.current.activeMacroKey).toBe(DEFAULT_ACTIVE_MACRO_KEY);
    expect(observers).toHaveLength(1);
    expect(observers[0].options).toMatchObject({
      rootMargin: MACRO_ACTIVE_OBSERVER_OPTIONS.rootMargin,
    });
    expect(observers[0].targets.map((el) => el.getAttribute("data-macro-section"))).toEqual(
      getVisibleMacroSections().map((macro) => macro.key)
    );
    expect(
      observers[0].targets.some(
        (el) => el.getAttribute("data-macro-section") === "insights"
      )
    ).toBe(false);
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() => useActiveMacroSection());
    expect(observers[0].disconnect).not.toHaveBeenCalled();
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("updates only when the resolved macro changes", () => {
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });

    const { result } = renderHook(() => useActiveMacroSection());
    const profile = document.querySelector('[data-macro-section="profile"]');
    const capabilities = document.querySelector(
      '[data-macro-section="capabilities"]'
    );

    act(() => {
      observers[0].cb([
        {
          target: profile,
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
    expect(result.current.activeMacroKey).toBe("capabilities");

    act(() => {
      observers[0].cb([
        {
          target: profile,
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
    expect(result.current.activeMacroKey).toBe("capabilities");
  });

  it("optimistically selects on navigate and unlocks after the one-shot settle", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });

    const { result } = renderHook(() => useActiveMacroSection());

    act(() => {
      result.current.selectMacro("evidence");
    });
    expect(result.current.activeMacroKey).toBe("evidence");

    const evidence = document.querySelector('[data-macro-section="evidence"]');
    const capabilities = document.querySelector(
      '[data-macro-section="capabilities"]'
    );

    // While locked, observer should not override the optimistic selection.
    act(() => {
      observers[0].cb([
        {
          target: capabilities,
          isIntersecting: true,
          intersectionRatio: 0.9,
          boundingClientRect: { top: 40 },
        },
        {
          target: evidence,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: { top: 900 },
        },
      ]);
    });
    expect(result.current.activeMacroKey).toBe("evidence");

    // Unlock re-applies the last observed ratios without requiring a fresh IO tick.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.activeMacroKey).toBe("capabilities");
  });
  it("fails safely when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useActiveMacroSection());
    expect(result.current.activeMacroKey).toBe("profile");
    act(() => {
      result.current.selectMacro("capabilities");
    });
    expect(result.current.activeMacroKey).toBe("capabilities");
  });
});
