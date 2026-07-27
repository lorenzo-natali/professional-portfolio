#!/usr/bin/env node
/**
 * One-off CLI: audit web interest GLBs. Run from repo root:
 *   node src/components/ar/auditInterestGlbGeometry.cli.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTEREST_APPEARANCE_ORDER } from "./interestObjectsConfig.js";
import { auditInterestGlbFile } from "./auditInterestGlbGeometry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const webDir = path.join(root, "public/ar/interests/web");

const ids = INTEREST_APPEARANCE_ORDER;
const rows = [];
let total = 0;

for (const id of ids) {
  const filePath = path.join(webDir, `${id}.glb`);
  const src = `ar/interests/web/${id}.glb`;
  const report = await auditInterestGlbFile(filePath);
  total += report.triangleCount;
  rows.push({
    id,
    src,
    path: filePath,
    geometryCount: report.geometryCount,
    triangleCount: report.triangleCount,
    materialCount: report.materialCount,
    textureCount: report.textureCount,
    imageCount: report.imageCount,
    meshCount: report.meshCount,
    densestMesh: report.densestMesh,
  });
}

const densest = rows.reduce((best, row) =>
  row.triangleCount > best.triangleCount ? row : best,
);

console.log(JSON.stringify({ total, densestId: densest.id, rows }, null, 2));
