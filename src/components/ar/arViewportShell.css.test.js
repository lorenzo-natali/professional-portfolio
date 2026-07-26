import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css");

describe("ar-viewport-shell CSS fallback", () => {
  it("pins the shell fullscreen with inset:0 and width/height auto", () => {
    const css = readFileSync(cssPath, "utf8");
    const block = css.match(/\.ar-viewport-shell\s*\{([\s\S]*?)\}/)?.[1] ?? "";

    expect(block).toMatch(/position:\s*fixed/);
    expect(block).toMatch(/inset:\s*0/);
    expect(block).toMatch(/width:\s*auto/);
    expect(block).toMatch(/height:\s*auto/);
    expect(block).toMatch(/max-width:\s*none/);
    // 100vw / visualViewport pixel boxes cause iOS Safari side gaps.
    expect(block).not.toMatch(/100vw/);
    expect(block).not.toMatch(/100vh/);
    expect(block).not.toMatch(/100dvh/);
    expect(block).toMatch(/touch-action:\s*none/);
    expect(block).toMatch(/user-select:\s*none/);
    expect(css).not.toMatch(/\.ar-camera-shell\s*\{/);
    expect(css).toMatch(/\.ar-camera-stage\s*\{/);
    expect(css).toMatch(/\.ar-tracking-container\s*\{/);
  });
});
