#!/usr/bin/env node
/**
 * Fail if the public GitHub Pages dist contains authoring / DEV surfaces.
 * Inspects HTML inventory (allowlist), JS/CSS/assets, and source maps when present.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const { PUBLIC_HTML_ALLOWLIST } = await import(
  pathToFileURL(join(root, "vite.shared.js")).href
);

/** @type {string[]} */
const FORBIDDEN_MARKERS = [
  "__arInterestsDebug",
  "arInterestsDebug",
  "createInterestObjectsDebug",
  "ar-interest-orientation",
  "ar-interests-compare",
  "ar-tracking-features-experiment",
  "ar-interest-orientation-dev-v1",
  "arInterestsCalibrate",
  "createInterestObjectsCalibrate",
  "ar-interest-final-layout-dev-v1",
  "ar-interests-calibrate-session",
  "CALIBRATE MODE",
  "Save final layout",
  "Keys: 1–6 select",
  "Keys: 1-6 select",
  "[ar-interests-debug]",
  "API: window.__arInterestsDebug",
];

function fail(message) {
  console.error(`[verify-public-dist] FAILED: ${message}`);
  process.exit(1);
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

if (!existsSync(dist)) {
  fail(`missing ${dist} — run npm run build first`);
}

const htmlFiles = readdirSync(dist).filter((name) => name.endsWith(".html"));
console.log("[verify-public-dist] HTML inventory:", htmlFiles.join(", ") || "(none)");

const unexpectedHtml = htmlFiles.filter((name) => !PUBLIC_HTML_ALLOWLIST.includes(name));
if (unexpectedHtml.length) {
  fail(`unexpected public HTML (allowlist ${PUBLIC_HTML_ALLOWLIST.join(", ")}): ${unexpectedHtml.join(", ")}`);
}
for (const allowed of PUBLIC_HTML_ALLOWLIST) {
  if (!htmlFiles.includes(allowed)) {
    fail(`missing required public HTML: ${allowed}`);
  }
}

const indexPath = join(dist, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const mainMatch = indexHtml.match(/src="\.\/assets\/(main-[^"]+\.js)"/);
if (!mainMatch) {
  fail("could not find main-*.js in dist/index.html");
}

const assetFiles = walkFiles(join(dist, "assets"));
const textLike = [
  indexPath,
  ...assetFiles.filter((f) => /\.(js|css|html|map|json|txt)$/i.test(f)),
  ...htmlFiles.map((name) => join(dist, name)),
];

/** @type {string[]} */
const hits = [];
for (const file of textLike) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const rel = relative(dist, file);
  for (const marker of FORBIDDEN_MARKERS) {
    if (text.includes(marker)) {
      hits.push(`${rel}: ${marker}`);
    }
  }
}

// Asset / HTML basename checks (covers emitted authoring pages even if empty).
for (const file of walkFiles(dist)) {
  const rel = relative(dist, file).replace(/\\/g, "/");
  const lower = rel.toLowerCase();
  if (
    lower.includes("ar-interest-orientation") ||
    lower.includes("ar-interests-compare") ||
    lower.includes("ar-tracking-features-experiment")
  ) {
    hits.push(`${rel}: forbidden authoring asset path`);
  }
}

if (hits.length) {
  console.error("[verify-public-dist] forbidden markers:");
  for (const hit of hits) console.error(`  - ${hit}`);
  fail(`${hits.length} forbidden marker(s) in public dist`);
}

// Module-graph / entry proof: production vite inputs must not list authoring pages.
const viteConfigSrc = readFileSync(join(root, "vite.config.js"), "utf8");
if (/ar-interest-orientation\.html|ar-interests-compare\.html|ar-tracking-features-experiment\.html/.test(viteConfigSrc)) {
  fail("vite.config.js still references authoring HTML inputs");
}
const sharedSrc = readFileSync(join(root, "vite.shared.js"), "utf8");
if (!sharedSrc.includes("PUBLIC_HTML_ALLOWLIST") || !sharedSrc.includes('mode === "authoring"')) {
  fail("vite.shared.js missing production/authoring separation hooks");
}

const adapterSrc = readFileSync(
  join(root, "src/components/ar/tracking/MindARTrackingAdapter.js"),
  "utf8",
);
if (/^import\s+.*createInterestObjectsDebug/m.test(adapterSrc)) {
  fail("MindARTrackingAdapter statically imports createInterestObjectsDebug");
}
if (
  !adapterSrc.includes("await import(") ||
  !adapterSrc.includes("interestLayoutKeyboard") ||
  !adapterSrc.includes("__AR_AUTHORING_BUILD__")
) {
  fail("MindARTrackingAdapter missing DEV/authoring-gated dynamic debug load");
}

console.log("[verify-public-dist] OK html allowlist:", PUBLIC_HTML_ALLOWLIST.join(", "));
console.log("[verify-public-dist] OK main bundle:", mainMatch[1]);
console.log("[verify-public-dist] PASSED");
