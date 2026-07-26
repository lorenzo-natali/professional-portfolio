#!/usr/bin/env node
/**
 * DEV-only experiment: improve MindAR tracking-point distribution on CV page 1.
 *
 * Reads (never overwrites):
 *   public/ar/targets/cv-page-1.png
 *   public/ar/targets/cv-page-1.mind
 *
 * Writes only under:
 *   public/ar/targets/experiments/
 *
 * Usage: npm run experiment:ar-tracking-features
 */

import { createRequire } from "node:module";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { decode } from "@msgpack/msgpack";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const LIVE_PNG = path.join(root, "public/ar/targets/cv-page-1.png");
const LIVE_MIND = path.join(root, "public/ar/targets/cv-page-1.mind");
const OUT_DIR = path.join(root, "public/ar/targets/experiments");

const VARIANTS = [
  { id: "baseline", label: "Original", png: "cv-page-1-baseline.png", mind: null },
  {
    id: "contrast",
    label: "A — Controlled contrast",
    png: "cv-page-1-contrast.png",
    mind: "cv-page-1-contrast.mind",
  },
  {
    id: "feature-balanced",
    label: "B — Distributed features",
    png: "cv-page-1-feature-balanced.png",
    mind: "cv-page-1-feature-balanced.mind",
  },
  {
    id: "combined",
    label: "C — Combined",
    png: "cv-page-1-combined.png",
    mind: "cv-page-1-combined.mind",
  },
];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function bandOfY(y, height) {
  if (y < height / 3) return "top";
  if (y < (2 * height) / 3) return "middle";
  return "bottom";
}

function emptyBands() {
  return { top: 0, middle: 0, bottom: 0, total: 0 };
}

function addBand(bands, y, height) {
  bands[bandOfY(y, height)] += 1;
  bands.total += 1;
}

function pctBands(bands) {
  if (!bands.total) return { top: 0, middle: 0, bottom: 0 };
  return {
    top: Number(((100 * bands.top) / bands.total).toFixed(1)),
    middle: Number(((100 * bands.middle) / bands.total).toFixed(1)),
    bottom: Number(((100 * bands.bottom) / bands.total).toFixed(1)),
  };
}

async function inkDensity(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;

  function region(y0, y1) {
    let white = 0;
    let dark = 0;
    let total = 0;
    for (let y = y0; y < y1; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const i = (y * W + x) * channels;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        total += 1;
        if (r > 245 && g > 245 && b > 245) white += 1;
        if (r < 40 && g < 40 && b < 40) dark += 1;
      }
    }
    return {
      whitePct: Number(((100 * white) / total).toFixed(1)),
      darkPct: Number(((100 * dark) / total).toFixed(1)),
    };
  }

  return {
    top15: region(0, Math.floor(H * 0.15)),
    middle: region(Math.floor(H * 0.4), Math.floor(H * 0.55)),
    bottom15: region(Math.floor(H * 0.85), H),
  };
}

function analyzeMind(mindPath) {
  const buf = readFileSync(mindPath);
  const content = decode(buf);
  const first = content.dataList[0];
  const W = first.targetImage.width;
  const H = first.targetImage.height;

  const detectionLevels = (first.matchingData || []).map((lvl, index) => {
    const h = lvl.height || H;
    const bands = emptyBands();
    let maxima = 0;
    let minima = 0;
    for (const p of lvl.maximaPoints || []) {
      maxima += 1;
      addBand(bands, p.y, h);
    }
    for (const p of lvl.minimaPoints || []) {
      minima += 1;
      addBand(bands, p.y, h);
    }
    return {
      index,
      scale: lvl.scale ?? null,
      width: lvl.width ?? W,
      height: h,
      maxima,
      minima,
      total: maxima + minima,
      bands,
      pct: pctBands(bands),
    };
  });

  const detectionAll = emptyBands();
  for (const lvl of detectionLevels) {
    detectionAll.top += lvl.bands.top;
    detectionAll.middle += lvl.bands.middle;
    detectionAll.bottom += lvl.bands.bottom;
    detectionAll.total += lvl.bands.total;
  }

  const trackingLevels = (first.trackingData || []).map((lvl, index) => {
    const h = lvl.height || H;
    const bands = emptyBands();
    const points = [];
    for (const p of lvl.points || []) {
      addBand(bands, p.y, h);
      points.push({
        x: p.x,
        y: p.y,
        xn: p.x / (lvl.width || W),
        yn: p.y / h,
        band: bandOfY(p.y, h),
      });
    }
    return {
      index,
      scale: lvl.scale ?? null,
      width: lvl.width ?? W,
      height: h,
      total: points.length,
      bands,
      pct: pctBands(bands),
      points,
    };
  });

  const trackingAll = emptyBands();
  for (const lvl of trackingLevels) {
    trackingAll.top += lvl.bands.top;
    trackingAll.middle += lvl.bands.middle;
    trackingAll.bottom += lvl.bands.bottom;
    trackingAll.total += lvl.bands.total;
  }

  return {
    fileBytes: buf.byteLength,
    version: content.v,
    width: W,
    height: H,
    aspect: Number((H / W).toFixed(6)),
    detectionLevels,
    detectionAll,
    detectionPct: pctBands(detectionAll),
    trackingLevels,
    trackingAll,
    trackingPct: pctBands(trackingAll),
  };
}

async function compileMind(imagePath, outPath, warnings) {
  const mindArRequire = createRequire(
    path.join(root, "node_modules/mind-ar/src/image-target/offline-compiler.js"),
  );
  const { loadImage } = mindArRequire("canvas");
  const offlineCompilerUrl = pathToFileURL(
    path.join(root, "node_modules/mind-ar/src/image-target/offline-compiler.js"),
  ).href;
  const { OfflineCompiler } = await import(offlineCompilerUrl);

  const img = await loadImage(imagePath);
  if (img.width !== 1820 || img.height !== 2574) {
    warnings.push(
      `${path.basename(imagePath)}: unexpected size ${img.width}x${img.height} (expected 1820x2574)`,
    );
  }

  const compiler = new OfflineCompiler();
  const originalWarn = console.warn;
  const captured = [];
  console.warn = (...args) => {
    captured.push(args.map(String).join(" "));
    originalWarn(...args);
  };

  try {
    process.stdout.write(`Compiling ${path.basename(imagePath)} … `);
    await compiler.compileImageTargets([img], (progress) => {
      const rounded = Math.round(progress);
      if (rounded % 25 === 0) process.stdout.write(`${rounded}% `);
    });
    process.stdout.write("\n");
  } finally {
    console.warn = originalWarn;
  }

  const buffer = compiler.exportData();
  writeFileSync(outPath, Buffer.from(buffer));
  warnings.push(...captured.map((w) => `${path.basename(outPath)}: ${w}`));
  return Buffer.from(buffer).byteLength;
}

/**
 * Variant A: mild contrast / crush near-blacks, keep geometry & crop.
 */
async function buildContrastVariant(srcPng, destPng) {
  // Controlled contrast only — no aggressive sharpening, same crop/geometry.
  // linear(a,b): out = a*in + b  (crush near-whites slightly, deepen near-blacks)
  await sharp(srcPng)
    .linear(1.14, -18)
    .modulate({ brightness: 1.0, saturation: 1.0 })
    .png({ compressionLevel: 9 })
    .toFile(destPng);
}

/**
 * SVG overlay of professional, printable mid/bottom feature anchors.
 * Coordinates in source pixels (1820×2574).
 */
function featureOverlaySvg(width, height) {
  /**
   * Printable professional accents sized to compete with MindAR tracking selection.
   * Still CV-credible (section ticks, monogram, footer seal) — not QR/checker/noise.
   * First pass used ~2px ticks; OfflineCompiler ignored them for trackingData.
   */
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Mid-page unique section anchors (asymmetric L-marks) -->
  <g fill="none" stroke="#0a0a0a" stroke-width="3.2" stroke-linecap="square">
    <path d="M96 1288 h56 v18"/>
    <path d="M1724 1388 h-50 v-16"/>
    <path d="M96 1640 h40"/>
    <path d="M136 1640 v22"/>
    <path d="M1724 1788 h-44"/>
    <path d="M1680 1788 v20"/>
  </g>

  <!-- Mid-column distinct filled glyphs (each unique geometry) -->
  <g fill="#0a0a0a">
    <path d="M1540 1460 l10 10 l-10 10 l-10 -10 z"/>
    <rect x="1588" y="1710" width="16" height="16" rx="2"/>
    <circle cx="1510" cy="1888" r="8"/>
    <path d="M1605 1965 l14 0 l-7 12 z"/>
    <path d="M640 1545 h22 v10 h-10 v12 h-12 z"/>
    <path d="M990 1668 m0 -9 l9 9 l-9 9 l-9 -9 z"/>
  </g>

  <!-- Broken mid rules (non-periodic segments) -->
  <g stroke="#0a0a0a" stroke-width="2.4" fill="none">
    <path d="M200 1195 h70"/>
    <path d="M300 1195 h48"/>
    <path d="M1360 1848 h60"/>
    <path d="M1455 1848 h34"/>
  </g>

  <!-- Lower third / education band -->
  <g fill="none" stroke="#0a0a0a" stroke-width="3" stroke-linecap="square">
    <path d="M88 2060 v56 h18"/>
    <path d="M1732 2125 v-48 h-20"/>
    <path d="M700 2200 h110"/>
    <path d="M840 2200 l14 -9"/>
    <path d="M880 2200 h95"/>
    <path d="M1260 2275 l18 12 l18 -12"/>
    <path d="M1325 2308 l12 16"/>
  </g>
  <g fill="#0a0a0a">
    <path d="M1388 2288 l16 0 l-8 14 z"/>
    <rect x="118" y="2188" width="18" height="18" rx="3"/>
    <circle cx="1688" cy="2220" r="9"/>
  </g>

  <!-- Footer seal / monogram cluster (printable, unique) -->
  <g fill="none" stroke="#0a0a0a" stroke-width="2.8">
    <rect x="820" y="2410" width="180" height="52" rx="6"/>
    <path d="M845 2436 h40"/>
    <path d="M865 2424 v24"/>
    <circle cx="940" cy="2436" r="10"/>
    <path d="M970 2424 l18 12 l18 -12" fill="none"/>
  </g>
  <g fill="#0a0a0a">
    <rect x="200" y="2434" width="28" height="5"/>
    <rect x="236" y="2426" width="5" height="22"/>
    <circle cx="320" cy="2438" r="6"/>
    <path d="M1500 2428 l12 12 l-12 12" fill="none" stroke="#0a0a0a" stroke-width="2.8"/>
    <path d="M1585 2438 h30" stroke="#0a0a0a" stroke-width="2.8" fill="none"/>
    <path d="M1615 2426 v24" stroke="#0a0a0a" stroke-width="2.8" fill="none"/>
  </g>

  <!-- Bottom corner ticks (asymmetric) -->
  <g stroke="#0a0a0a" stroke-width="3.2" fill="none">
    <path d="M60 2505 h34 v20"/>
    <path d="M1760 2505 h-30 v18"/>
  </g>
</svg>`);
}

async function buildFeatureBalancedVariant(srcPng, destPng) {
  const meta = await sharp(srcPng).metadata();
  const overlay = featureOverlaySvg(meta.width, meta.height);
  await sharp(srcPng)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(destPng);
}

async function buildCombinedVariant(contrastPng, destPng) {
  const meta = await sharp(contrastPng).metadata();
  const overlay = featureOverlaySvg(meta.width, meta.height);
  await sharp(contrastPng)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(destPng);
}

async function renderOverlayFromMind(pngPath, mindPath, outJpeg) {
  const analysis = analyzeMind(mindPath);
  const meta = await sharp(pngPath).metadata();
  const W = meta.width;
  const H = meta.height;
  const colors = { top: "#22d3ee", middle: "#fbbf24", bottom: "#f472b6" };
  const circles = [];

  for (const lvl of analysis.trackingLevels) {
    for (const p of lvl.points) {
      const x = p.xn * W;
      const y = p.yn * H;
      const r = lvl.index === 0 ? 8 : 5.5;
      circles.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="none" stroke="${colors[p.band]}" stroke-width="2.4"/>`,
      );
      circles.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${colors[p.band]}"/>`,
      );
    }
  }

  // Light detection sample from level0
  const mind = decode(readFileSync(mindPath));
  const lvl0 = mind.dataList[0].matchingData[0];
  const det = [...(lvl0.maximaPoints || []), ...(lvl0.minimaPoints || [])];
  const step = Math.max(1, Math.floor(det.length / 160));
  for (let i = 0; i < det.length; i += step) {
    const p = det[i];
    circles.push(
      `<circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#64748b" opacity="0.55"/>`,
    );
  }

  const y1 = H / 3;
  const y2 = (2 * H) / 3;
  const t0 = analysis.trackingLevels[0];
  const t1 = analysis.trackingLevels[1];
  const label = `track L0 ${t0?.total ?? 0} (T${t0?.bands.top}/M${t0?.bands.middle}/B${t0?.bands.bottom}) · L1 ${t1?.total ?? 0} (T${t1?.bands.top}/M${t1?.bands.middle}/B${t1?.bands.bottom})`;

  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="0" y1="${y1}" x2="${W}" y2="${y1}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 10" opacity="0.65"/>
  <line x1="0" y1="${y2}" x2="${W}" y2="${y2}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 10" opacity="0.65"/>
  <rect x="12" y="12" width="980" height="52" rx="8" fill="#0f172a" opacity="0.72"/>
  <text x="28" y="48" fill="#e2e8f0" font-size="26" font-family="IBM Plex Sans, sans-serif">${label}</text>
  ${circles.join("\n  ")}
</svg>`);

  await sharp(pngPath)
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 84 })
    .toFile(outJpeg);

  return analysis;
}

function scoreTracking(analysis) {
  const t0 = analysis.trackingLevels[0] || { bands: emptyBands(), total: 0 };
  const t1 = analysis.trackingLevels[1] || { bands: emptyBands(), total: 0 };
  // Prefer mid+bottom share and absolute mid/bottom counts; soft penalty if total collapses.
  const midBot0 = t0.bands.middle + t0.bands.bottom;
  const midBot1 = t1.bands.middle + t1.bands.bottom;
  const topShare0 = t0.total ? t0.bands.top / t0.total : 1;
  return {
    midBottomL0: midBot0,
    midBottomL1: midBot1,
    topShareL0: Number(topShare0.toFixed(3)),
    totalL0: t0.total,
    totalL1: t1.total,
    // Heuristic score for ranking (higher = better lower-page coverage)
    score: midBot0 * 3 + midBot1 * 2 + t0.total * 0.15 - topShare0 * 8,
  };
}

async function main() {
  if (!existsSync(LIVE_PNG) || !existsSync(LIVE_MIND)) {
    throw new Error("Live baseline PNG/MIND missing — aborting (refusing to invent live targets).");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const warnings = [];
  const livePngHash = sha256(readFileSync(LIVE_PNG));
  const liveMindHash = sha256(readFileSync(LIVE_MIND));

  // Guard copies of live files for the experiment folder (read-only references).
  copyFileSync(LIVE_PNG, path.join(OUT_DIR, "cv-page-1-baseline.png"));
  // Do not copy live .mind as a "variant" output name that could be confused — keep analysis from live path.

  console.log("Building variant A (contrast)…");
  await buildContrastVariant(LIVE_PNG, path.join(OUT_DIR, "cv-page-1-contrast.png"));

  console.log("Building variant B (feature-balanced)…");
  await buildFeatureBalancedVariant(
    LIVE_PNG,
    path.join(OUT_DIR, "cv-page-1-feature-balanced.png"),
  );

  console.log("Building variant C (combined)…");
  await buildCombinedVariant(
    path.join(OUT_DIR, "cv-page-1-contrast.png"),
    path.join(OUT_DIR, "cv-page-1-combined.png"),
  );

  // Verify live files untouched
  if (sha256(readFileSync(LIVE_PNG)) !== livePngHash) {
    throw new Error("LIVE PNG was modified — abort");
  }
  if (sha256(readFileSync(LIVE_MIND)) !== liveMindHash) {
    throw new Error("LIVE MIND was modified — abort");
  }

  const results = [];

  // Baseline from live mind (never recompiled here)
  console.log("Analyzing baseline (live .mind, not recompiled)…");
  const baselineAnalysis = analyzeMind(LIVE_MIND);
  const baselineInk = await inkDensity(LIVE_PNG);
  await renderOverlayFromMind(
    path.join(OUT_DIR, "cv-page-1-baseline.png"),
    LIVE_MIND,
    path.join(OUT_DIR, "overlay-baseline.jpg"),
  );
  results.push({
    id: "baseline",
    label: "Original (live)",
    png: "cv-page-1-baseline.png",
    mind: "../cv-page-1.mind",
    mindBytes: baselineAnalysis.fileBytes,
    pngBytes: statSync(LIVE_PNG).size,
    ink: baselineInk,
    analysis: baselineAnalysis,
    ranking: scoreTracking(baselineAnalysis),
    notes: [
      "Live target — not recompiled in this experiment",
      "Source PNG copied to experiments/ for side-by-side preview only",
    ],
  });

  for (const variant of VARIANTS.filter((v) => v.mind)) {
    const pngPath = path.join(OUT_DIR, variant.png);
    const mindPath = path.join(OUT_DIR, variant.mind);
    console.log(`Compiling ${variant.id}…`);
    const bytes = await compileMind(pngPath, mindPath, warnings);
    const analysis = analyzeMind(mindPath);
    const ink = await inkDensity(pngPath);
    await renderOverlayFromMind(
      pngPath,
      mindPath,
      path.join(OUT_DIR, `overlay-${variant.id}.jpg`),
    );
    results.push({
      id: variant.id,
      label: variant.label,
      png: variant.png,
      mind: variant.mind,
      mindBytes: bytes,
      pngBytes: statSync(pngPath).size,
      ink,
      analysis,
      ranking: scoreTracking(analysis),
      notes: [],
    });
  }

  // Re-verify live integrity after compiles
  if (sha256(readFileSync(LIVE_PNG)) !== livePngHash) {
    throw new Error("LIVE PNG was modified during experiment — abort");
  }
  if (sha256(readFileSync(LIVE_MIND)) !== liveMindHash) {
    throw new Error("LIVE MIND was modified during experiment — abort");
  }

  const ranked = [...results].sort((a, b) => b.ranking.score - a.ranking.score);
  const report = {
    generatedAt: new Date().toISOString(),
    liveGuards: {
      pngSha256: livePngHash,
      mindSha256: liveMindHash,
      arTargetSrcUnchanged: true,
      liveFilesUntouched: true,
    },
    compiler: {
      package: "mind-ar",
      api: "OfflineCompiler.compileImageTargets",
      script: "scripts/experiment-ar-tracking-features.mjs",
      sameAs: "scripts/compile-ar-target.mjs",
    },
    warnings,
    variants: results.map((r) => ({
      id: r.id,
      label: r.label,
      png: r.png,
      mind: r.mind,
      mindBytes: r.mindBytes,
      pngBytes: r.pngBytes,
      ink: r.ink,
      detectionPct: r.analysis.detectionPct,
      detectionAll: r.analysis.detectionAll,
      trackingPct: r.analysis.trackingPct,
      trackingAll: r.analysis.trackingAll,
      trackingLevels: r.analysis.trackingLevels.map((lvl) => ({
        index: lvl.index,
        scale: lvl.scale,
        width: lvl.width,
        height: lvl.height,
        total: lvl.total,
        bands: lvl.bands,
        pct: lvl.pct,
      })),
      detectionLevel0: r.analysis.detectionLevels[0]
        ? {
            total: r.analysis.detectionLevels[0].total,
            maxima: r.analysis.detectionLevels[0].maxima,
            minima: r.analysis.detectionLevels[0].minima,
            bands: r.analysis.detectionLevels[0].bands,
            pct: r.analysis.detectionLevels[0].pct,
          }
        : null,
      ranking: r.ranking,
      notes: r.notes,
    })),
    rankingOrder: ranked.map((r) => r.id),
    recommendations: {
      technicallyBest: ranked[0]?.id,
      iphoneTestCandidate: null, // filled below
      contrastAloneHelps: null,
      graphicsNeeded: null,
    },
  };

  const baseline = results.find((r) => r.id === "baseline");
  const contrast = results.find((r) => r.id === "contrast");
  const feature = results.find((r) => r.id === "feature-balanced");
  const combined = results.find((r) => r.id === "combined");

  const baseMidBot =
    (baseline.analysis.trackingLevels[0]?.bands.middle || 0) +
    (baseline.analysis.trackingLevels[0]?.bands.bottom || 0);
  const contrastMidBot =
    (contrast.analysis.trackingLevels[0]?.bands.middle || 0) +
    (contrast.analysis.trackingLevels[0]?.bands.bottom || 0);
  const featureMidBot =
    (feature.analysis.trackingLevels[0]?.bands.middle || 0) +
    (feature.analysis.trackingLevels[0]?.bands.bottom || 0);
  const combinedMidBot =
    (combined.analysis.trackingLevels[0]?.bands.middle || 0) +
    (combined.analysis.trackingLevels[0]?.bands.bottom || 0);

  report.recommendations.contrastAloneHelps = contrastMidBot > baseMidBot + 1;
  report.recommendations.graphicsNeeded =
    featureMidBot > contrastMidBot || combinedMidBot > contrastMidBot;
  // Prefer combined/feature if they improve mid+bottom without crushing L0 total
  const candidates = [combined, feature, contrast].filter(Boolean);
  const iphone = candidates.sort((a, b) => {
    const aScore =
      a.analysis.trackingLevels[0].bands.middle +
      a.analysis.trackingLevels[0].bands.bottom * 1.2 +
      a.analysis.trackingLevels[1].bands.middle +
      a.analysis.trackingLevels[1].bands.bottom * 1.5;
    const bScore =
      b.analysis.trackingLevels[0].bands.middle +
      b.analysis.trackingLevels[0].bands.bottom * 1.2 +
      b.analysis.trackingLevels[1].bands.middle +
      b.analysis.trackingLevels[1].bands.bottom * 1.5;
    return bScore - aScore;
  })[0];
  report.recommendations.iphoneTestCandidate = iphone?.id ?? ranked[0]?.id;
  report.recommendations.technicallyBest = ranked[0]?.id;

  writeFileSync(path.join(OUT_DIR, "experiment-report.json"), JSON.stringify(report, null, 2));

  // Human-readable summary
  const lines = [];
  lines.push("# AR Tracking Feature Distribution Experiment");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Live PNG/MIND untouched: ${report.liveGuards.liveFilesUntouched}`);
  lines.push("");
  for (const r of report.variants) {
    const t0 = r.trackingLevels[0];
    const t1 = r.trackingLevels[1];
    lines.push(`## ${r.label} (\`${r.id}\`)`);
    lines.push(
      `- mind: ${r.mindBytes} bytes · detection all T/M/B ${r.detectionAll.top}/${r.detectionAll.middle}/${r.detectionAll.bottom}`,
    );
    lines.push(
      `- tracking L0: ${t0?.total} → T${t0?.bands.top}/M${t0?.bands.middle}/B${t0?.bands.bottom}`,
    );
    lines.push(
      `- tracking L1: ${t1?.total} → T${t1?.bands.top}/M${t1?.bands.middle}/B${t1?.bands.bottom}`,
    );
    lines.push(
      `- ink bottom15% white ${r.ink.bottom15.whitePct}% / dark ${r.ink.bottom15.darkPct}%`,
    );
    lines.push("");
  }
  lines.push(`Technically best (heuristic): **${report.recommendations.technicallyBest}**`);
  lines.push(`iPhone test candidate: **${report.recommendations.iphoneTestCandidate}**`);
  lines.push(`Contrast alone helps: **${report.recommendations.contrastAloneHelps}**`);
  lines.push(`Graphics needed vs contrast: **${report.recommendations.graphicsNeeded}**`);
  if (warnings.length) {
    lines.push("");
    lines.push("## Compiler warnings");
    warnings.forEach((w) => lines.push(`- ${w}`));
  }
  writeFileSync(path.join(OUT_DIR, "README.md"), `${lines.join("\n")}\n`);

  console.log("\n=== Experiment summary ===");
  for (const r of report.variants) {
    const t0 = r.trackingLevels[0];
    const t1 = r.trackingLevels[1];
    console.log(
      `${r.id.padEnd(18)} L0 ${String(t0.total).padStart(2)} T/M/B ${t0.bands.top}/${t0.bands.middle}/${t0.bands.bottom}   L1 ${String(t1?.total ?? 0).padStart(2)} T/M/B ${t1?.bands.top}/${t1?.bands.middle}/${t1?.bands.bottom}`,
    );
  }
  console.log("Best:", report.recommendations.technicallyBest);
  console.log("iPhone candidate:", report.recommendations.iphoneTestCandidate);
  console.log(`Report → ${path.join(OUT_DIR, "experiment-report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
