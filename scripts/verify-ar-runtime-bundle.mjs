#!/usr/bin/env node
/**
 * Post-build proof that the publishable dist contains AR runtime markers
 * and no authoring / calibrate surfaces. Delegates HTML allowlist + authoring
 * marker scanning to verify-public-dist.mjs.
 *
 * After the siteDiag boot split, production App/AR live in async chunks
 * (bootProduction / App / ARGovernanceView) — scan all dist JS/CSS assets.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const indexPath = join(dist, "index.html");

if (!existsSync(indexPath)) {
  console.error("[verify-ar-runtime-bundle] missing dist/index.html — run npm run build first");
  process.exit(1);
}

const publicCheck = spawnSync(process.execPath, [join(root, "scripts/verify-public-dist.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (publicCheck.status !== 0) {
  process.exit(publicCheck.status ?? 1);
}

const html = readFileSync(indexPath, "utf8");
const mainMatch = html.match(/src="\.\/assets\/(main-[^"]+\.js)"/);
if (!mainMatch) {
  console.error("[verify-ar-runtime-bundle] could not find main-*.js in dist/index.html");
  process.exit(1);
}

const assetsDir = join(dist, "assets");
const assetNames = readdirSync(assetsDir);
const jsBundle = assetNames
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(join(assetsDir, name), "utf8"))
  .join("\n");
const cssBundle = assetNames
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(join(assetsDir, name), "utf8"))
  .join("\n");

const requiredJs = [
  "__PORTFOLIO_BUILD_ID",
  "arRuntimeAudit",
  "Copy runtime audit",
  "MindARTrackingAdapter",
  "data-ar-portal-host",
  "AI & Intelligent Systems",
  "data-ar-interest-hit",
  "data-ar-interest-info-card",
  "ar-interest-info-card",
  "bootProduction",
];

const requiredCss = ["ar-interest-info-card", "ar-portal-host", "data-ar-interest-interactive"];

let failed = false;
for (const needle of requiredJs) {
  const ok = jsBundle.includes(needle);
  console.log(`${ok ? "OK" : "MISSING"} js: ${needle}`);
  if (!ok) failed = true;
}
for (const needle of requiredCss) {
  const ok = cssBundle.includes(needle);
  console.log(`${ok ? "OK" : "MISSING"} css: ${needle}`);
  if (!ok) failed = true;
}

// Entry main must stay thin (no eager MindAR package).
const mainJs = readFileSync(join(assetsDir, mainMatch[1]), "utf8");
if (/mindar-image-three/i.test(mainJs)) {
  console.error("FAIL: entry main chunk unexpectedly embeds mindar-image-three");
  failed = true;
} else {
  console.log("OK entry-main: no mindar-image-three package");
}

console.log("index.html main bundle:", mainMatch[1], `(${mainJs.length} bytes)`);
console.log("scanned js assets:", assetNames.filter((n) => n.endsWith(".js")).length);
console.log("scanned css assets:", assetNames.filter((n) => n.endsWith(".css")).length);

if (failed) {
  console.error("[verify-ar-runtime-bundle] FAILED");
  process.exit(1);
}
console.log("[verify-ar-runtime-bundle] PASSED", mainMatch[1]);
