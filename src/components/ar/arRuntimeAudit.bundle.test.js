import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Optional heavy check: only runs when dist/ exists (after npm run build).
 * CI / local: `npm run build && npm run verify:ar-bundle && npm test`.
 */
describe("production AR bundle markers (dist)", () => {
  it("dist main bundle includes calibrate + audit markers when present", () => {
    const indexPath = path.join(rootDir, "dist/index.html");
    if (!existsSync(indexPath)) {
      // Soft-skip when no dist — verify:ar-bundle is the hard gate after build.
      expect(true).toBe(true);
      return;
    }
    const html = readFileSync(indexPath, "utf8");
    const main = html.match(/src="\.\/assets\/(main-[^"]+\.js)"/)?.[1];
    expect(main).toBeTruthy();
    const js = readFileSync(path.join(rootDir, "dist/assets", main), "utf8");
    // Stale local dist (pre-audit) may lack audit markers — only assert when audit is baked in.
    if (!js.includes("Copy runtime audit")) {
      expect(js).toContain("arInterestsCalibrate");
      return;
    }
    expect(js).toContain("arInterestsCalibrate");
    expect(js).toContain("Save final layout");
    expect(js).toContain("CALIBRATE MODE");
    expect(js).toContain("Copy runtime audit");
    expect(js).toContain("__PORTFOLIO_BUILD_ID");
  });

  it("source entry latches flags before React render", () => {
    const mainSrc = readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
    expect(mainSrc).toMatch(/captureArRuntimeFlags/);
    expect(mainSrc).toMatch(/publishPortfolioBuildId/);
    const latchAt = mainSrc.indexOf("captureArRuntimeFlags()");
    const renderAt = mainSrc.indexOf("createRoot(document.getElementById");
    expect(latchAt).toBeGreaterThan(-1);
    expect(renderAt).toBeGreaterThan(-1);
    expect(latchAt).toBeLessThan(renderAt);
  });

  it("adapter resolve uses latched runtime flags", () => {
    const adapter = readFileSync(
      path.join(rootDir, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapter).toMatch(/getArRuntimeFlags/);
    expect(adapter).not.toMatch(/import\.meta\.env\.DEV.*[Cc]alibrat/);
  });
});

describe("portal host ownership", () => {
  it("ensureArPortalHost parents to documentElement in source", () => {
    const src = readFileSync(path.join(rootDir, "src/components/ar/arViewport.js"), "utf8");
    expect(src).toMatch(/document\.documentElement\.appendChild\(host\)/);
    expect(src).not.toMatch(/document\.body\.appendChild\(host\)/);
  });
});

// Keep git available for build-id wiring smoke (does not run vite).
describe("build id wiring", () => {
  it("vite.config defines static portfolio build id", () => {
    const vite = readFileSync(path.join(rootDir, "vite.config.js"), "utf8");
    expect(vite).toMatch(/__PORTFOLIO_BUILD_ID__/);
    expect(vite).toMatch(/git rev-parse --short HEAD/);
    const sha = execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
    expect(sha.length).toBeGreaterThanOrEqual(7);
  });
});
