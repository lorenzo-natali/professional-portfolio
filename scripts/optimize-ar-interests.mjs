#!/usr/bin/env node
/**
 * Beyond the CV — reproducible GLB web optimization pipeline.
 *
 * Reads:  public/ar/interests/*.glb  (sources; never overwritten)
 * Writes: public/ar/interests/web/*.glb
 * Report: public/ar/interests/web/optimization-report.json
 *
 * Usage: npm run optimize:ar-interests
 */

import { mkdirSync, writeFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  simplify,
  weld,
  meshopt,
  textureCompress,
  inspect,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC_DIR = path.join(root, "public/ar/interests");
const OUT_DIR = path.join(root, "public/ar/interests/web");

/** Per-asset simplification / texture budgets (document only — not runtime). */
const ASSET_PIPELINE = [
  {
    id: "backpack",
    simplifyRatio: 0.11,
    simplifyError: 0.0012,
    textureMax: 1024,
    notes: "aggressive; silhouette + straps",
  },
  {
    id: "robot",
    simplifyRatio: 0.13,
    simplifyError: 0.001,
    textureMax: 1024,
    notes: "aggressive; preserve face/silhouette",
  },
  {
    id: "fossil",
    simplifyRatio: 0.13,
    simplifyError: 0.0011,
    textureMax: 1024,
    notes: "aggressive; preserve skull/horns",
  },
  {
    id: "plant",
    simplifyRatio: 0.11,
    simplifyError: 0.0014,
    textureMax: 1024,
    notes: "aggressive; watch foliage gaps",
  },
  {
    id: "book",
    simplifyRatio: 0.19,
    simplifyError: 0.001,
    textureMax: 1024,
    notes: "aggressive; cover readability",
  },
  {
    id: "evil-eye",
    simplifyRatio: null, // already light — skip geometric simplify
    simplifyError: null,
    textureMax: 1024,
    notes: "minimal geometry change; texture resize only",
  },
];

function formatMb(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function parseResolution(value) {
  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]) || 0, Number(value[1]) || 0];
  }
  if (typeof value === "string" && value.includes("x")) {
    const [w, h] = value.split("x").map((part) => Number(part) || 0);
    return [w, h];
  }
  return [0, 0];
}

function estimateGpuTexMb(images) {
  // Prefer inspect gpuSize when present; else RGBA8 + mips ≈ *1.33
  let bytes = 0;
  for (const img of images || []) {
    if (typeof img.gpuSize === "number" && img.gpuSize > 0) {
      bytes += img.gpuSize;
      continue;
    }
    const [w, h] = parseResolution(img.resolution);
    if (w && h) bytes += w * h * 4 * 1.33;
  }
  return formatMb(bytes);
}

function propsOf(section) {
  if (!section) return [];
  if (Array.isArray(section)) return section;
  if (Array.isArray(section.properties)) return section.properties;
  return [];
}

function collectMetrics(report, fileBytes) {
  const scenes = propsOf(report.scenes);
  const meshes = propsOf(report.meshes);
  const textures = propsOf(report.textures);
  const materials = propsOf(report.materials);
  const animations = propsOf(report.animations);

  let triangles = 0;
  for (const mesh of meshes) {
    if (typeof mesh.glPrimitives === "number") triangles += mesh.glPrimitives;
    else if (typeof mesh.vertices === "number") triangles += Math.floor(mesh.vertices / 3);
  }

  const images = textures.map((tex) => ({
    mimeType: tex.mimeType,
    size: tex.size,
    resolution: tex.resolution,
    resolutionXY: parseResolution(tex.resolution),
    slots: tex.slots,
    gpuSize: tex.gpuSize,
  }));

  const scene0 = scenes[0];
  const bbox =
    scene0?.bboxMin && scene0?.bboxMax
      ? { min: scene0.bboxMin, max: scene0.bboxMax }
      : null;

  return {
    fileBytes,
    fileMB: formatMb(fileBytes),
    triangles,
    meshCount: meshes.length,
    materialCount: materials.length,
    textureCount: textures.length,
    imageCount: images.length,
    images,
    animationCount: animations.length,
    gpuTexEstimateMB: estimateGpuTexMb(images),
    bbox,
  };
}

function bboxExtents(bbox) {
  if (!bbox?.min || !bbox?.max) return null;
  return [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];
}

function bboxRatioOk(srcBBox, outBBox, tolerance = 0.12) {
  const a = bboxExtents(srcBBox);
  const b = bboxExtents(outBBox);
  if (!a || !b) return { ok: false, reason: "missing-bbox" };
  for (let i = 0; i < 3; i += 1) {
    if (a[i] < 1e-8) continue;
    const ratio = b[i] / a[i];
    if (ratio < 1 - tolerance || ratio > 1 + tolerance) {
      return { ok: false, reason: `axis-${i}-ratio-${ratio.toFixed(3)}`, ratios: b.map((v, j) => v / (a[j] || 1)) };
    }
  }
  return { ok: true, ratios: b.map((v, i) => v / (a[i] || 1)) };
}

async function createIO() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });
}

async function optimizeOne(io, asset) {
  const srcPath = path.join(SRC_DIR, `${asset.id}.glb`);
  const outPath = path.join(OUT_DIR, `${asset.id}.glb`);
  if (!existsSync(srcPath)) {
    throw new Error(`Missing source: ${srcPath}`);
  }

  const srcBytes = statSync(srcPath).size;
  const document = await io.read(srcPath);
  const srcInspect = inspect(document);
  const before = collectMetrics(srcInspect, srcBytes);

  const operations = ["inspect", "dedup", "prune", `textureCompress(resize=${asset.textureMax}, jpeg)`];
  const transforms = [
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "jpeg",
      quality: 82,
      resize: [asset.textureMax, asset.textureMax],
    }),
  ];

  if (asset.simplifyRatio != null) {
    operations.push(`simplify(ratio=${asset.simplifyRatio}, error=${asset.simplifyError})`);
    transforms.push(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: asset.simplifyRatio,
        error: asset.simplifyError,
        lockBorder: false,
      }),
    );
    operations.push("weld");
    transforms.push(weld());
  } else {
    operations.push("simplify:skipped");
  }

  operations.push("meshopt(level=medium)");
  transforms.push(
    meshopt({
      encoder: MeshoptEncoder,
      level: "medium",
    }),
  );

  await document.transform(...transforms);

  await io.write(outPath, document);
  const outBytes = statSync(outPath).size;
  const outDoc = await io.read(outPath);
  const outInspect = inspect(outDoc);
  const after = collectMetrics(outInspect, outBytes);

  const extensions =
    outDoc
      .getRoot()
      .listExtensionsUsed()
      .map((ext) => ext.extensionName) || [];
  const hasMeshopt = extensions.includes("EXT_meshopt_compression");
  const bboxCheck = bboxRatioOk(before.bbox, after.bbox);

  const textureProps = propsOf(outInspect.textures);
  const validation = {
    readable: true,
    hasMeshes: after.meshCount > 0,
    hasMaterials: after.materialCount > 0,
    hasImages: after.imageCount > 0,
    meshoptDeclared: hasMeshopt,
    noExternalUris: textureProps.every(
      (tex) => !tex.uri || String(tex.uri).startsWith("data:"),
    ),
    bboxCoherent: bboxCheck.ok,
    bboxDetail: bboxCheck,
    maxTextureEdge: Math.max(
      0,
      ...(after.images || []).map((img) => {
        const [w, h] = parseResolution(img.resolution);
        return Math.max(w, h);
      }),
    ),
  };

  const reductionPct = Number((((srcBytes - outBytes) / srcBytes) * 100).toFixed(1));

  return {
    id: asset.id,
    srcPath: path.relative(root, srcPath),
    outPath: path.relative(root, outPath),
    notes: asset.notes,
    operations,
    before,
    after,
    reductionPct,
    validation,
    readyForLive:
      validation.readable &&
      validation.hasMeshes &&
      validation.hasMaterials &&
      validation.meshoptDeclared &&
      validation.bboxCoherent &&
      after.fileMB <= 4.5 &&
      after.triangles <= 160000,
    needsVisualReview:
      !validation.bboxCoherent ||
      after.triangles < before.triangles * 0.05 ||
      asset.id === "plant" ||
      asset.id === "fossil",
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const io = await createIO();
  const results = [];

  console.log(`Optimizing ${ASSET_PIPELINE.length} GLBs → ${path.relative(root, OUT_DIR)}`);
  for (const asset of ASSET_PIPELINE) {
    process.stdout.write(`  • ${asset.id} … `);
    try {
      const result = await optimizeOne(io, asset);
      results.push(result);
      console.log(
        `${result.before.fileMB}MB → ${result.after.fileMB}MB (−${result.reductionPct}%), ` +
          `${result.before.triangles} → ${result.after.triangles} tris`,
      );
    } catch (error) {
      console.log("FAILED");
      console.error(error);
      results.push({
        id: asset.id,
        error: error instanceof Error ? error.message : String(error),
        readyForLive: false,
        needsVisualReview: true,
      });
    }
  }

  const ok = results.filter((r) => !r.error);
  const totals = {
    beforeBytes: ok.reduce((s, r) => s + r.before.fileBytes, 0),
    afterBytes: ok.reduce((s, r) => s + r.after.fileBytes, 0),
    beforeTriangles: ok.reduce((s, r) => s + r.before.triangles, 0),
    afterTriangles: ok.reduce((s, r) => s + r.after.triangles, 0),
    beforeGpuTexMB: Number(ok.reduce((s, r) => s + r.before.gpuTexEstimateMB, 0).toFixed(2)),
    afterGpuTexMB: Number(ok.reduce((s, r) => s + r.after.gpuTexEstimateMB, 0).toFixed(2)),
  };
  totals.beforeMB = formatMb(totals.beforeBytes);
  totals.afterMB = formatMb(totals.afterBytes);
  totals.transferReductionPct = Number(
    (((totals.beforeBytes - totals.afterBytes) / totals.beforeBytes) * 100).toFixed(1),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    pipeline: "glTF Transform + Meshopt (no Draco)",
    sourceDir: path.relative(root, SRC_DIR),
    outputDir: path.relative(root, OUT_DIR),
    totals,
    assets: results,
  };

  const reportPath = path.join(OUT_DIR, "optimization-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport → ${path.relative(root, reportPath)}`);
  console.log(
    `Totals: ${totals.beforeMB}MB → ${totals.afterMB}MB (−${totals.transferReductionPct}%), ` +
      `${totals.beforeTriangles} → ${totals.afterTriangles} tris`,
  );

  const failed = results.filter((r) => r.error || !r.validation?.readable);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
