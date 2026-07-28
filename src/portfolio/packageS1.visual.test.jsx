import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import RoleLens from "./RoleLens.jsx";
import { ProjectStageIndicator } from "./portfolioUi.jsx";
import {
  getTickerSchedulerDiagnostics,
  resetTickerSchedulerForTests,
} from "./createTickerScheduler.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexCss = readFileSync(path.join(rootDir, "src/index.css"), "utf8");

describe("Package S1 visual restorations", () => {
  afterEach(() => {
    cleanup();
    resetTickerSchedulerForTests();
    delete document.documentElement.dataset.iosStability;
  });

  it("uses finite Role Lens reset pulse (opacity/transform, 3 iterations)", () => {
    expect(indexCss).toMatch(
      /\.role-lens-reset-pulse\s*\{[^}]*animation:\s*role-lens-reset-pulse\s+0\.85s\s+ease-in-out\s+3/s,
    );
    expect(indexCss).not.toMatch(/\.role-lens-reset-active\s*\{[^}]*infinite/s);
    const keyframes = indexCss.match(/@keyframes role-lens-reset-pulse\s*\{[\s\S]*?\n\}/);
    expect(keyframes?.[0]).toMatch(/opacity/);
    expect(keyframes?.[0]).toMatch(/transform/);
    expect(keyframes?.[0]).not.toMatch(/text-shadow/);
    expect(keyframes?.[0]).not.toMatch(/box-shadow/);
  });

  it("uses finite project-stage blink (3 iterations, forwards hold)", () => {
    expect(indexCss).toMatch(
      /\.project-stage-current\s*\{[^}]*animation:\s*project-stage-blink\s+1s\s+steps\(1,\s*end\)\s+3/s,
    );
    expect(indexCss).toMatch(
      /\.project-stage-current\s*\{[^}]*animation-fill-mode:\s*forwards/s,
    );
    expect(indexCss).not.toMatch(/project-stage-blink[^;\n]*infinite/);
  });

  it("keeps iOS backdrop-filter disabled and uses static surface depth", () => {
    expect(indexCss).toMatch(
      /html\[data-ios-stability="1"\][\s\S]*?\.backdrop-blur[\s\S]*?backdrop-filter:\s*none\s*!important/s,
    );
    expect(indexCss).toMatch(
      /html\[data-ios-stability="1"\][\s\S]*?\.backdrop-blur[\s\S]*?inset\s+0\s+1px\s+0/s,
    );
    const start = indexCss.indexOf('html[data-ios-stability="1"] body');
    const iosBlock = indexCss.slice(start);
    const nextMedia = iosBlock.indexOf("@media (prefers-reduced-motion");
    const profile = iosBlock.slice(0, nextMedia > -1 ? nextMedia : undefined);
    const backdropValues = [...profile.matchAll(/(?:-webkit-)?backdrop-filter:\s*([^;]+);/g)].map(
      (m) => m[1].trim(),
    );
    expect(backdropValues.length).toBeGreaterThan(0);
    expect(backdropValues.every((v) => v.startsWith("none"))).toBe(true);
    expect(profile).not.toMatch(/filter:\s*blur\(/);
  });

  it("replaces iOS ticker mask with pointer-events-none pseudo gradients", () => {
    expect(indexCss).toMatch(
      /html\[data-ios-stability="1"\]\s+\.ticker-mask\s*\{[^}]*mask-image:\s*none/s,
    );
    expect(indexCss).toMatch(
      /html\[data-ios-stability="1"\]\s+\.ticker-mask::before[\s\S]*?pointer-events:\s*none/s,
    );
    expect(indexCss).toMatch(
      /html\[data-ios-stability="1"\]\s+\.ticker-mask::after[\s\S]*?pointer-events:\s*none/s,
    );
  });

  it("pulses Role Lens title only after Reset (event-driven)", async () => {
    const user = userEvent.setup();
    const onSelectLens = vi.fn();
    render(<RoleLens selectedLens="Banking Risk" onSelectLens={onSelectLens} />);

    expect(screen.getByLabelText("Role Lens").className).not.toMatch(/role-lens-reset-pulse/);

    await user.click(screen.getByRole("button", { name: "Reset lens" }));
    expect(onSelectLens).toHaveBeenCalledWith("Overview");
    expect(screen.getByLabelText("Role Lens").className).toMatch(/role-lens-reset-pulse/);
    expect(getTickerSchedulerDiagnostics().activeSchedulerCount).toBeLessThanOrEqual(1);
  });

  it("marks ProjectStageIndicator current bar with finite class", () => {
    render(<ProjectStageIndicator stage="Prototype" />);
    expect(document.querySelector(".project-stage-current")).toBeTruthy();
  });

  it("preserves shared ticker scheduler source invariants", () => {
    const scheduler = readFileSync(
      path.join(rootDir, "src/portfolio/createTickerScheduler.js"),
      "utf8",
    );
    expect(scheduler).toMatch(/activeSchedulerCount/);
    expect(scheduler).toMatch(/IntersectionObserver/);
    expect(scheduler).toMatch(/ResizeObserver/);
    expect(scheduler).toMatch(/let singleton = null/);
  });
});
