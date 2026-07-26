#!/usr/bin/env node
/**
 * Reproducible collectible optimization pipeline (glTF Transform CLI).
 *
 * Source (untouched): assets/ar/collectible/collectible_textured.glb
 * Output:             assets/ar/collectible/collectible_web.glb
 *                     (+ public/ar/collectible/collectible_web.glb)
 *
 * Exact stages (also documented in the milestone report):
 *  1. inspect
 *  2. dedup
 *  3. prune
 *  4. resize textures (base 2048, normal 1024, MR 1024, emissive 1024)
 *  5. weld
 *  6. simplify (~0.38 ratio, error 0.001)
 *  7. meshopt (medium)
 *
 * KTX2/Basis intentionally omitted — Meshopt + JPEG resize keeps the
 * Three.js r150 / GitHub Pages path simple and Safari-safe.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "assets/ar/collectible/collectible_textured.glb");
const outDir = path.join(root, "tmp/collectible-opt");
const finalAsset = path.join(root, "assets/ar/collectible/collectible_web.glb");
const publicAsset = path.join(root, "public/ar/collectible/collectible_web.glb");

mkdirSync(outDir, { recursive: true });

function run(args) {
  const result = spawnSync(
    "npx",
    ["--yes", "@gltf-transform/cli@4.1.2", ...args],
    { cwd: root, stdio: "inherit", shell: false },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const stages = [
  ["inspect", src],
  ["dedup", src, path.join(outDir, "01_dedup.glb")],
  ["prune", path.join(outDir, "01_dedup.glb"), path.join(outDir, "02_prune.glb")],
  [
    "resize",
    path.join(outDir, "02_prune.glb"),
    path.join(outDir, "03a_base2048.glb"),
    "--width",
    "2048",
    "--height",
    "2048",
    "--pattern",
    "base_color",
    "--filter",
    "lanczos3",
  ],
  [
    "resize",
    path.join(outDir, "03a_base2048.glb"),
    path.join(outDir, "03b_normal1024.glb"),
    "--width",
    "1024",
    "--height",
    "1024",
    "--pattern",
    "normal",
    "--filter",
    "lanczos3",
  ],
  [
    "resize",
    path.join(outDir, "03b_normal1024.glb"),
    path.join(outDir, "03c_mr1024.glb"),
    "--width",
    "1024",
    "--height",
    "1024",
    "--pattern",
    "metallic_roughness",
    "--filter",
    "lanczos3",
  ],
  [
    "resize",
    path.join(outDir, "03c_mr1024.glb"),
    path.join(outDir, "03_textures.glb"),
    "--width",
    "1024",
    "--height",
    "1024",
    "--pattern",
    "emissive",
    "--filter",
    "lanczos3",
  ],
  ["weld", path.join(outDir, "03_textures.glb"), path.join(outDir, "04_weld.glb")],
  [
    "simplify",
    path.join(outDir, "04_weld.glb"),
    path.join(outDir, "05_simplify.glb"),
    "--ratio",
    "0.38",
    "--error",
    "0.001",
  ],
  [
    "meshopt",
    path.join(outDir, "05_simplify.glb"),
    path.join(outDir, "06_meshopt.glb"),
    "--level",
    "medium",
  ],
  ["validate", path.join(outDir, "06_meshopt.glb")],
  ["inspect", path.join(outDir, "06_meshopt.glb")],
];

for (const args of stages) {
  console.log(`\n▶ gltf-transform ${args.join(" ")}`);
  run(args);
}

mkdirSync(path.dirname(finalAsset), { recursive: true });
mkdirSync(path.dirname(publicAsset), { recursive: true });
copyFileSync(path.join(outDir, "06_meshopt.glb"), finalAsset);
copyFileSync(path.join(outDir, "06_meshopt.glb"), publicAsset);
console.log(`\nWrote ${finalAsset}`);
console.log(`Wrote ${publicAsset}`);
