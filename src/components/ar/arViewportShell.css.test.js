import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css");

describe("ar-viewport-shell CSS fallback", () => {
  it("pins the shell to the viewport with inset:0 before JS synchronization", () => {
    const css = readFileSync(cssPath, "utf8");
    const block = css.match(/\.ar-viewport-shell\s*\{([\s\S]*?)\}/)?.[1] ?? "";

    expect(block).toMatch(/position:\s*fixed/);
    expect(block).toMatch(/inset:\s*0/);
    expect(block).toMatch(/width:\s*100vw/);
    expect(block).toMatch(/height:\s*100(?:vh|dvh)/);
    // Single shell only — no competing camera-shell fixed layer in CSS.
    expect(css).not.toMatch(/\.ar-camera-shell\s*\{/);
  });
});
