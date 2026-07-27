#!/usr/bin/env node
/**
 * Fail loudly if mind-ar@1.2.5 is installed without the resize-listener lifecycle patch.
 * Checks the runtime artifact the app imports and the readable source companion.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = join(root, "node_modules/mind-ar/dist/mindar-image-three.prod.js");
const sourcePath = join(root, "node_modules/mind-ar/src/image-target/three.js");
const patchPath = join(root, "patches/mind-ar+1.2.5.patch");
const pkgPath = join(root, "node_modules/mind-ar/package.json");

function fail(message) {
  console.error(`[verify-mindar-resize-patch] FAILED: ${message}`);
  process.exit(1);
}

if (!existsSync(patchPath)) {
  fail(`missing committed patch at ${patchPath}`);
}
if (!existsSync(pkgPath)) {
  fail("mind-ar is not installed");
}

const version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
if (version !== "1.2.5") {
  fail(`expected mind-ar@1.2.5, found ${version}`);
}

if (!existsSync(runtimePath)) {
  fail(`missing runtime bundle ${runtimePath}`);
}

const runtime = readFileSync(runtimePath, "utf8");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";

/** @type {Array<[string, boolean, string]>} */
const checks = [
  [
    "runtime stores _resizeHandler",
    runtime.includes("this._resizeHandler=this.resize.bind(this)") ||
      runtime.includes("this._resizeHandler = this.resize.bind(this)"),
    "runtime missing stored _resizeHandler assignment",
  ],
  [
    "runtime registers stored handler",
    runtime.includes('addEventListener("resize",this._resizeHandler)') ||
      runtime.includes('addEventListener("resize", this._resizeHandler)'),
    "runtime missing addEventListener with _resizeHandler",
  ],
  [
    "runtime removes stored handler in stop()",
    runtime.includes('removeEventListener("resize", this._resizeHandler)') ||
      runtime.includes('removeEventListener("resize",this._resizeHandler)'),
    "runtime missing removeEventListener for _resizeHandler",
  ],
  [
    "runtime no longer registers unbound bind(this)",
    !runtime.includes('addEventListener("resize", this.resize.bind(this))'),
    "runtime still registers unreferenced this.resize.bind(this)",
  ],
  [
    "source stores _resizeHandler",
    source.includes("this._resizeHandler = this.resize.bind(this)"),
    "source missing stored _resizeHandler assignment",
  ],
  [
    "source removes stored handler in stop()",
    source.includes("window.removeEventListener('resize', this._resizeHandler)"),
    "source missing removeEventListener for _resizeHandler",
  ],
];

let failed = false;
for (const [label, ok, error] of checks) {
  console.log(`${ok ? "OK" : "MISSING"}: ${label}`);
  if (!ok) {
    failed = true;
    console.error(`  → ${error}`);
  }
}

if (failed) fail("installed mind-ar does not include the resize-listener patch");

console.log("[verify-mindar-resize-patch] PASSED");
console.log("  runtime:", "mind-ar/dist/mindar-image-three.prod.js");
console.log("  source:", "mind-ar/src/image-target/three.js");
console.log("  patch:", "patches/mind-ar+1.2.5.patch");
