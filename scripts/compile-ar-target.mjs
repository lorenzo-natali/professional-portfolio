/**
 * Compile a real MindAR image target from the CV first-page PNG.
 * Uses MindAR OfflineCompiler (same encoding as the browser compiler).
 */
import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const imagePath = process.argv[2] || "/tmp/ar-cv-compile/cv-page-1.png";
const outPath =
  process.argv[3] || path.join(root, "public/ar/targets/cv-page-1.mind");

// MindAR OfflineCompiler depends on mind-ar's nested canvas@2 — load images from the same package.
const mindArRequire = createRequire(
  path.join(root, "node_modules/mind-ar/src/image-target/offline-compiler.js"),
);
const { loadImage } = mindArRequire("canvas");

const offlineCompilerUrl = pathToFileURL(
  path.join(root, "node_modules/mind-ar/src/image-target/offline-compiler.js"),
).href;

const { OfflineCompiler } = await import(offlineCompilerUrl);

const img = await loadImage(imagePath);
console.log(`Compiling target from ${imagePath} (${img.width}x${img.height})`);

const compiler = new OfflineCompiler();
await compiler.compileImageTargets([img], (progress) => {
  const rounded = Math.round(progress);
  if (rounded % 10 === 0) process.stdout.write(`\rprogress ${rounded}%   `);
});
process.stdout.write("\n");

const buffer = compiler.exportData();
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(buffer));
console.log(`Wrote ${outPath} (${Buffer.from(buffer).byteLength} bytes)`);
