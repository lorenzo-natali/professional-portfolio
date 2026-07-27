#!/usr/bin/env node
/**
 * Fail loudly if mind-ar@1.2.5 is installed without the project MindAR patches:
 * - resize-listener lifecycle + null-safe stop
 * - Patch AB: full teardown on stop + abort-safe processVideo
 * - Patch D-lite: alternate-frame tracking while stably showing (TRACK_EVERY_N_FRAMES=2)
 *
 * Checks the runtime artifacts the app imports and the readable source companions.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = join(root, "node_modules/mind-ar/dist/mindar-image-three.prod.js");
const controllerPath = join(root, "node_modules/mind-ar/dist/controller-mGt1s8dJ.js");
const sourcePath = join(root, "node_modules/mind-ar/src/image-target/three.js");
const controllerSourcePath = join(root, "node_modules/mind-ar/src/image-target/controller.js");
const inputLoaderSourcePath = join(root, "node_modules/mind-ar/src/image-target/input-loader.js");
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
if (!existsSync(controllerPath)) {
  fail(`missing controller bundle ${controllerPath}`);
}

const runtime = readFileSync(runtimePath, "utf8");
const controller = readFileSync(controllerPath, "utf8");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const controllerSource = existsSync(controllerSourcePath)
  ? readFileSync(controllerSourcePath, "utf8")
  : "";
const inputLoaderSource = existsSync(inputLoaderSourcePath)
  ? readFileSync(inputLoaderSourcePath, "utf8")
  : "";

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
  [
    "runtime stop is null-safe for missing video/srcObject",
    (runtime.includes("this.video && this.video.srcObject") ||
      runtime.includes("this.video&&this.video.srcObject")) &&
      !runtime.includes("this.video.srcObject.getTracks().forEach"),
    "runtime still unsafely accesses video.srcObject.getTracks()",
  ],
  [
    "source stop is null-safe for missing video/srcObject",
    source.includes("this.video && this.video.srcObject") &&
      !source.includes("this.video.srcObject.getTracks()"),
    "source still unsafely accesses video.srcObject.getTracks()",
  ],
  // --- Patch AB ---
  [
    "runtime stop prefers controller.dispose()",
    runtime.includes("this.controller.dispose()") ||
      runtime.includes("this.controller.dispose("),
    "runtime stop does not call controller.dispose()",
  ],
  [
    "source stop prefers controller.dispose()",
    source.includes("this.controller.dispose()"),
    "source stop does not call controller.dispose()",
  ],
  [
    "controller dispose terminates worker",
    controller.includes("worker.terminate") || controller.includes(".terminate()"),
    "controller bundle missing worker.terminate in dispose()",
  ],
  [
    "controller dispose is idempotent",
    controller.includes("_disposed"),
    "controller bundle missing _disposed guard",
  ],
  [
    "controller stopProcessVideo clears worker callbacks",
    controller.includes("workerMatchDone = null") &&
      controller.includes("workerTrackDone = null") &&
      controller.includes("stopProcessVideo()"),
    "controller stopProcessVideo missing callback clear",
  ],
  [
    "controller processVideo disposes inputT in finally",
    controller.includes("finally {") &&
      (controller.includes("s.dispose && s.dispose()") ||
        controller.includes("s && s.dispose") ||
        controller.includes("i && i.dispose") ||
        controller.includes("i.dispose && i.dispose()")),
    "controller processVideo missing finally dispose of input tensor",
  ],
  [
    "controller source dispose terminates worker",
    controllerSource.includes("this.worker.terminate") ||
      controllerSource.includes("this.worker && this.worker.terminate"),
    "controller source missing worker.terminate",
  ],
  [
    "controller source stopProcessVideo clears callbacks",
    controllerSource.includes("this.workerMatchDone = null") &&
      controllerSource.includes("this.workerTrackDone = null"),
    "controller source stopProcessVideo missing callback clear",
  ],
  [
    "controller source processVideo uses finally dispose",
    controllerSource.includes("finally {") &&
      controllerSource.includes("inputT && inputT.dispose"),
    "controller source missing finally inputT.dispose",
  ],
  [
    "input-loader source has dispose()",
    inputLoaderSource.includes("dispose()") &&
      inputLoaderSource.includes("tempPixelHandle"),
    "input-loader source missing dispose for tempPixelHandle",
  ],
  [
    "controller bundle InputLoader has dispose()",
    controller.includes("disposeData(this.tempPixelHandle"),
    "controller bundle missing InputLoader tempPixelHandle dispose",
  ],
  // --- Patch D-lite ---
  [
    "controller source defines TRACK_EVERY_N_FRAMES = 2",
    controllerSource.includes("const TRACK_EVERY_N_FRAMES = 2"),
    "controller source missing TRACK_EVERY_N_FRAMES = 2",
  ],
  [
    "controller source skips heavy pipeline on alternate stable frames",
    controllerSource.includes("runHeavyPipeline") &&
      controllerSource.includes("stableShowing"),
    "controller source missing D-lite skip gate",
  ],
  [
    "controller bundle defines TRACK_EVERY_N_FRAMES = 2",
    controller.includes("TRACK_EVERY_N_FRAMES = 2"),
    "controller bundle missing TRACK_EVERY_N_FRAMES = 2",
  ],
  [
    "controller bundle applies TRACK_EVERY_N_FRAMES cadence",
    controller.includes("TRACK_EVERY_N_FRAMES > 1") &&
      controller.includes("% TRACK_EVERY_N_FRAMES"),
    "controller bundle missing alternate-frame cadence",
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

if (failed) fail("installed mind-ar does not include the required patches");

console.log("[verify-mindar-resize-patch] PASSED");
console.log("  runtime:", "mind-ar/dist/mindar-image-three.prod.js");
console.log("  controller:", "mind-ar/dist/controller-mGt1s8dJ.js");
console.log("  source:", "mind-ar/src/image-target/{three,controller,input-loader}.js");
console.log("  patch:", "patches/mind-ar+1.2.5.patch");
