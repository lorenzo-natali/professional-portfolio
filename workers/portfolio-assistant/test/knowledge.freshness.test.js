/**
 * @vitest-environment node
 * Fails when canonical portfolio sources drift from committed pack.js.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

describe("assistant knowledge freshness", () => {
  it("pack.js matches regenerate --check", () => {
    const script = join(process.cwd(), "scripts/generate-assistant-knowledge.mjs");
    const result = spawnSync(process.execPath, [script, "--check"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
