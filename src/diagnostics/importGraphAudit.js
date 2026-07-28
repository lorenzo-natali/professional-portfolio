/**
 * Part D — Import-graph / bundle presence verification for siteDiag variants.
 * Source contracts always; dist scan when dist/ exists (after npm run build).
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const NEEDLES = Object.freeze({
  mindArPackage: [/mindar-image-three/i, /mind-ar/i],
  tensorflow: [/tensorflow/i, /@tensorflow/i],
  three: [/three\.module/, /WebGLRenderer/],
  arAdapter: [/MindARTrackingAdapter/, /createMindARTrackingAdapter/],
  mindTarget: [/cv-page-1\.mind/, /ar\/targets\//],
  glbAssets: [/\.glb/, /ar\/interests\/web\//],
});

export function listDistJsAssets() {
  const dir = path.join(rootDir, "dist/assets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const full = path.join(dir, f);
      return { name: f, bytes: statSync(full).size, text: readFileSync(full, "utf8") };
    });
}

export function scanText(text, needles) {
  return needles.some((re) => re.test(text));
}

export function getSourceImportContracts() {
  const main = readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
  const bootProd = readFileSync(path.join(rootDir, "src/bootProduction.jsx"), "utf8");
  const bootDiag = readFileSync(
    path.join(rootDir, "src/diagnostics/bootSiteDiag.jsx"),
    "utf8",
  );
  const siteDiagRoot = readFileSync(
    path.join(rootDir, "src/diagnostics/SiteDiagRoot.jsx"),
    "utf8",
  );
  const app = readFileSync(path.join(rootDir, "src/App.jsx"), "utf8");
  const beyondBundle = readFileSync(
    path.join(rootDir, "src/components/ar/beyondBundle.js"),
    "utf8",
  );

  return {
    mainDoesNotStaticImportApp: !/import\s+App\s+from/.test(main),
    mainDoesNotStaticImportBeyondBundle: !/import\s+.+beyondBundle/.test(main),
    mainBranchesSiteDiagBoot: /bootSiteDiag/.test(main) && /bootProduction/.test(main),
    bootProductionImportsBeyondBundle: /beyondBundle\.js/.test(bootProd),
    bootSiteDiagDoesNotImportApp: !/from\s+["'].*App\.jsx["']/.test(bootDiag),
    siteDiagRootDynamicImportsApp: /import\(["']\.\.\/App\.jsx["']\)/.test(siteDiagRoot),
    siteDiagRootConditionalBeyond: /beyondBundle\.js/.test(siteDiagRoot),
    siteDiagRootDeferredBeyond: /beyondBundleDeferred\.jsx?/.test(siteDiagRoot),
    appHasNoStaticArGovernanceImports:
      !/from\s+["']\.\/components\/ar\/ARGovernanceView["']/.test(app) &&
      !/from\s+["']\.\/components\/ar\/ARGovernanceCard["']/.test(app) &&
      !/from\s+["']\.\/components\/ar\/beyondCvDeepLink["']/.test(app),
    beyondBundleIsLight:
      !/export\s+\{[^}]*ARGovernanceView/.test(beyondBundle) &&
      !/from\s+["']\.\/ARGovernanceView/.test(beyondBundle) &&
      /ARGovernanceCard/.test(beyondBundle),
    appDefersBeyondViewUntilOpen:
      /beyondEnabled && arOpen/.test(app) &&
      /lazy\(\(\)\s*=>\s*import\(["']\.\/components\/ar\/ARGovernanceView\.jsx["']\)\)/.test(app),
    mainAppliesIosStability: /applyIosStabilityProfile/.test(main),
  };
}

export function summarizeDistImportGraph() {
  const indexPath = path.join(rootDir, "dist/index.html");
  if (!existsSync(indexPath)) {
    return { available: false, reason: "dist/ missing — run npm run build" };
  }
  const html = readFileSync(indexPath, "utf8");
  const mainName = html.match(/assets\/(main-[^"]+\.js)/)?.[1] || null;
  const assets = listDistJsAssets();
  const main = assets.find((a) => a.name === mainName) || null;
  const asyncAssets = assets.filter((a) => a.name !== mainName);

  function presence(text) {
    return {
      mindArPackage: scanText(text, NEEDLES.mindArPackage),
      tensorflow: scanText(text, NEEDLES.tensorflow),
      three: scanText(text, NEEDLES.three),
      arAdapter: scanText(text, NEEDLES.arAdapter),
      mindTarget: scanText(text, NEEDLES.mindTarget),
      glbAssets: scanText(text, NEEDLES.glbAssets),
    };
  }

  return {
    available: true,
    mainChunk: main
      ? { name: main.name, bytes: main.bytes, presence: presence(main.text) }
      : null,
    asyncChunks: asyncAssets.map((a) => ({
      name: a.name,
      bytes: a.bytes,
      presence: presence(a.text),
    })),
    modulePreloads: [...html.matchAll(/modulepreload[^>]+href="([^"]+)"/g)].map(
      (m) => m[1],
    ),
  };
}

/**
 * Expected presence matrix for variant *source graphs* (not a separate build each).
 * Runtime: full-no-beyond / full-core must not import beyondBundle at all.
 */
export const VARIANT_IMPORT_EXPECTATIONS = Object.freeze({
  effects: {
    loadsApp: false,
    loadsBeyondBundle: false,
    loadsBeyondDeferred: false,
  },
  full: {
    loadsApp: true,
    loadsBeyondBundle: true,
    loadsBeyondDeferred: false,
  },
  "full-no-beyond": {
    loadsApp: true,
    loadsBeyondBundle: false,
    loadsBeyondDeferred: false,
  },
  "full-no-assistant": {
    loadsApp: true,
    loadsBeyondBundle: true,
    loadsBeyondDeferred: false,
  },
  "full-no-intro": {
    loadsApp: true,
    loadsBeyondBundle: true,
    loadsBeyondDeferred: false,
  },
  "full-no-preload": {
    loadsApp: true,
    loadsBeyondBundle: false,
    loadsBeyondDeferred: true,
  },
  "full-core": {
    loadsApp: true,
    loadsBeyondBundle: false,
    loadsBeyondDeferred: false,
  },
});
