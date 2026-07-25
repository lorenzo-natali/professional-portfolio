import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { isValidMindTargetBuffer } from "./checkArTargetAvailable";

describe("committed cv-page-1.mind", () => {
  it("is a structurally valid compiled MindAR target included for production", () => {
    const mindPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../public/ar/targets/cv-page-1.mind",
    );
    const buffer = readFileSync(mindPath);
    expect(buffer.byteLength).toBeGreaterThan(100_000);
    expect(isValidMindTargetBuffer(buffer)).toBe(true);
  });
});
