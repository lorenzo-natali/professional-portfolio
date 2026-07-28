#!/usr/bin/env node
import {
  getSourceImportContracts,
  summarizeDistImportGraph,
} from "../src/diagnostics/importGraphAudit.js";

function formatReportLocal(summary) {
  if (!summary.available) return summary.reason;
  const lines = [
    `main: ${summary.mainChunk?.name} (${summary.mainChunk?.bytes} bytes)`,
    `main presence: ${JSON.stringify(summary.mainChunk?.presence)}`,
    `modulepreloads: ${summary.modulePreloads.join(", ") || "(none)"}`,
    "async chunks:",
    ...summary.asyncChunks.map(
      (c) =>
        `  - ${c.name} (${c.bytes}b) ${Object.entries(c.presence)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(",") || "-"}`,
    ),
  ];
  return lines.join("\n");
}

const contracts = getSourceImportContracts();
const failed = Object.entries(contracts).filter(([, v]) => !v);
console.log("[verify-import-graph] source contracts");
console.log(contracts);
if (failed.length) {
  console.error("FAILED:", failed.map(([k]) => k));
  process.exit(1);
}

const summary = summarizeDistImportGraph();
console.log("[verify-import-graph] dist");
console.log(formatReportLocal(summary));
if (!summary.available) {
  console.warn("dist not present — source contracts only");
  process.exit(0);
}

const hasMindSomewhere =
  summary.mainChunk?.presence?.mindArPackage ||
  summary.asyncChunks.some((c) => c.presence.mindArPackage);
if (!hasMindSomewhere) {
  console.error("Expected mind-ar package marker somewhere in dist JS");
  process.exit(1);
}

console.log("[verify-import-graph] PASSED");
