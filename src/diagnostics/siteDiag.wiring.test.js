import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("siteDiag main wiring", () => {
  it("installs lifecycle trace before React root when siteDiag is set", () => {
    const mainSrc = readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
    expect(mainSrc).toMatch(/captureSiteDiagMode/);
    expect(mainSrc).toMatch(/installPortfolioLifecycleTrace/);
    expect(mainSrc).toMatch(/SiteDiagRoot/);
    expect(mainSrc).toMatch(/recordReactRootMount/);

    const captureAt = mainSrc.indexOf("captureSiteDiagMode()");
    const installAt = mainSrc.indexOf("installPortfolioLifecycleTrace({ enabled: true })");
    const renderAt = mainSrc.indexOf("createRoot(document.getElementById");
    expect(captureAt).toBeGreaterThan(-1);
    expect(installAt).toBeGreaterThan(-1);
    expect(renderAt).toBeGreaterThan(-1);
    expect(captureAt).toBeLessThan(installAt);
    expect(installAt).toBeLessThan(renderAt);
  });

  it("keeps a single StrictMode and single createRoot", () => {
    const mainSrc = readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
    expect(mainSrc.match(/createRoot\(/g)?.length).toBe(1);
    expect(mainSrc.match(/<StrictMode>/g)?.length).toBe(1);
  });

  it("blank/shell entry does not statically import framer-motion", () => {
    const rootSrc = readFileSync(
      path.join(rootDir, "src/diagnostics/SiteDiagRoot.jsx"),
      "utf8",
    );
    expect(rootSrc).not.toMatch(/from ["']framer-motion["']/);
    expect(rootSrc).toMatch(/lazy\(\(\) => import\("\.\/SiteDiagMotionEffectsBody/);
  });
});
