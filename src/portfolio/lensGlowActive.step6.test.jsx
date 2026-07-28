import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LENS_GLOW_ACTIVE_ATTR,
  LENS_GLOW_ACTIVE_VALUE,
  clearLensGlowActiveMarker,
  isLensGlowActiveMarkerPresent,
  syncLensGlowActiveMarker,
} from "./lensGlowActive.js";
import { useLensGlowActiveMarker } from "./useLensGlowActiveMarker.js";

function MarkerProbe({ lens }) {
  useLensGlowActiveMarker(lens);
  return null;
}

describe("Step 6 lens-glow clock gating", () => {
  afterEach(() => {
    cleanup();
    clearLensGlowActiveMarker();
  });

  it("Overview does not expose the active lens-glow root marker", () => {
    syncLensGlowActiveMarker("Overview");
    expect(isLensGlowActiveMarkerPresent()).toBe(false);
    expect(document.documentElement.hasAttribute(LENS_GLOW_ACTIVE_ATTR)).toBe(false);
  });

  it("selecting a non-Overview Role Lens exposes the marker", () => {
    syncLensGlowActiveMarker("AI Governance");
    expect(isLensGlowActiveMarkerPresent()).toBe(true);
    expect(document.documentElement.getAttribute(LENS_GLOW_ACTIVE_ATTR)).toBe(
      LENS_GLOW_ACTIVE_VALUE,
    );
  });

  it("returning to Overview removes the marker", () => {
    syncLensGlowActiveMarker("Technology Risk");
    expect(isLensGlowActiveMarkerPresent()).toBe(true);
    syncLensGlowActiveMarker("Overview");
    expect(isLensGlowActiveMarkerPresent()).toBe(false);
  });

  it("cleanup removes the marker on unmount", () => {
    const { unmount } = render(<MarkerProbe lens="Information Security" />);
    expect(isLensGlowActiveMarkerPresent()).toBe(true);
    unmount();
    expect(isLensGlowActiveMarkerPresent()).toBe(false);
  });

  it("does not leave a duplicate or stale marker after repeated lens changes", () => {
    const { rerender, unmount } = render(<MarkerProbe lens="Overview" />);
    expect(isLensGlowActiveMarkerPresent()).toBe(false);

    rerender(<MarkerProbe lens="Internal Audit" />);
    expect(document.documentElement.getAttribute(LENS_GLOW_ACTIVE_ATTR)).toBe(
      LENS_GLOW_ACTIVE_VALUE,
    );

    rerender(<MarkerProbe lens="AI Governance" />);
    expect(document.querySelectorAll(`[${LENS_GLOW_ACTIVE_ATTR}]`)).toHaveLength(1);
    expect(isLensGlowActiveMarkerPresent()).toBe(true);

    rerender(<MarkerProbe lens="Overview" />);
    expect(isLensGlowActiveMarkerPresent()).toBe(false);

    rerender(<MarkerProbe lens="AI Governance" />);
    act(() => {
      unmount();
    });
    expect(isLensGlowActiveMarkerPresent()).toBe(false);
  });

  it("scopes the CSS animation to the active marker and keeps original keyframes timing", () => {
    const css = readFileSync(resolve("src/index.css"), "utf8");

    expect(css).toMatch(
      /html\[data-lens-glow-active="true"\]\s+body\s*\{\s*animation:\s*lens-glow-clock\s+2\.8s\s+ease-in-out\s+infinite;/,
    );
    expect(css).not.toMatch(/(?:^|\n)body\s*\{\s*animation:\s*lens-glow-clock/);
    expect(css).toMatch(/@keyframes\s+lens-glow-clock\s*\{/);
    expect(css).toMatch(/--lens-glow:\s*0;/);
    expect(css).toMatch(/--lens-glow:\s*1;/);
    expect(css).toContain("animation: lens-glow-clock 2.8s ease-in-out infinite");
  });
});
