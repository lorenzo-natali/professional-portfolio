import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSourceImportContracts } from "./importGraphAudit.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("siteDiag main wiring", () => {
  it("branches production vs siteDiag boots without static App import", () => {
    const mainSrc = readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
    expect(mainSrc).toMatch(/captureSiteDiagMode/);
    expect(mainSrc).toMatch(/bootSiteDiag/);
    expect(mainSrc).toMatch(/bootProduction/);
    expect(mainSrc).not.toMatch(/import\s+App\s+from/);

    const contracts = getSourceImportContracts();
    expect(contracts.mainDoesNotStaticImportApp).toBe(true);
    expect(contracts.bootProductionImportsBeyondBundle).toBe(true);
    expect(contracts.bootSiteDiagDoesNotImportApp).toBe(true);
    expect(contracts.appHasNoStaticArGovernanceImports).toBe(true);
  });

  it("keeps a single StrictMode inside each boot module", () => {
    const prod = readFileSync(path.join(rootDir, "src/bootProduction.jsx"), "utf8");
    const diag = readFileSync(
      path.join(rootDir, "src/diagnostics/bootSiteDiag.jsx"),
      "utf8",
    );
    expect(prod.match(/createRoot\(/g)?.length).toBe(1);
    expect(diag.match(/createRoot\(/g)?.length).toBe(1);
    expect(prod).toMatch(/<StrictMode>/);
    expect(diag).toMatch(/<StrictMode>/);
  });

  it("blank/shell entry does not statically import framer-motion", () => {
    const rootSrc = readFileSync(
      path.join(rootDir, "src/diagnostics/SiteDiagRoot.jsx"),
      "utf8",
    );
    expect(rootSrc).not.toMatch(/from ["']framer-motion["']/);
  });
});
