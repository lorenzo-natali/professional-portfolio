#!/usr/bin/env node
/**
 * Post-build proof that the publishable dist contains AR runtime markers.
 * Exit 1 if any required string is missing from the JS referenced by dist/index.html.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const indexPath = join(dist, "index.html");

if (!existsSync(indexPath)) {
  console.error("[verify-ar-runtime-bundle] missing dist/index.html — run npm run build first");
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");
const mainMatch = html.match(/src="\.\/assets\/(main-[^"]+\.js)"/);
if (!mainMatch) {
  console.error("[verify-ar-runtime-bundle] could not find main-*.js in dist/index.html");
  process.exit(1);
}

const mainJsPath = join(dist, "assets", mainMatch[1]);
const cssMatch = html.match(/href="\.\/assets\/(main-[^"]+\.css)"/);
const mainCssPath = cssMatch ? join(dist, "assets", cssMatch[1]) : null;
const js = readFileSync(mainJsPath, "utf8");
const css = mainCssPath && existsSync(mainCssPath) ? readFileSync(mainCssPath, "utf8") : "";

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
];

const forbiddenJs = [
  "arInterestsCalibrate",
  "Save final layout",
  "CALIBRATE MODE",
  "createInterestObjectsCalibrate",
  "ar-interest-final-layout-dev-v1",
];

const requiredCss = ["ar-interest-info-card", "ar-portal-host", "data-ar-interest-interactive"];

let failed = false;
for (const needle of requiredJs) {
  const ok = js.includes(needle);
  console.log(`${ok ? "OK" : "MISSING"} js: ${needle}`);
  if (!ok) failed = true;
}
for (const needle of forbiddenJs) {
  const present = js.includes(needle);
  console.log(`${present ? "FORBIDDEN" : "OK"} js absent: ${needle}`);
  if (present) failed = true;
}
for (const needle of requiredCss) {
  const ok = css.includes(needle);
  console.log(`${ok ? "OK" : "MISSING"} css: ${needle}`);
  if (!ok) failed = true;
}

const buildIdLiteral = js.match(/__PORTFOLIO_BUILD_ID["']?\s*[:=]\s*["']([^"']+)["']/);
const bakedId =
  js.match(/[a-f0-9]{7}\+\d{4}-\d{2}-\d{2}T/) ||
  js.includes("__PORTFOLIO_BUILD_ID__") === false;

console.log("index.html main bundle:", mainMatch[1]);
if (buildIdLiteral) {
  console.log("build id literal:", buildIdLiteral[1]);
} else if (bakedId) {
  console.log("build id: appears inlined by Vite define");
} else {
  console.log("WARN: could not locate inlined build id pattern");
}

if (failed) {
  console.error("[verify-ar-runtime-bundle] FAILED");
  process.exit(1);
}
console.log("[verify-ar-runtime-bundle] PASSED", mainMatch[1]);
