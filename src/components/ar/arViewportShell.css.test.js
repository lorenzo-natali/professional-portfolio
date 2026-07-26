import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css");

describe("ar fullscreen CSS", () => {
  it("keeps a single fixed portal host with absolute fillers below", () => {
    const css = readFileSync(cssPath, "utf8");

    const host = css.match(/\.ar-portal-host\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const shell = css.match(/\.ar-viewport-shell\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const stage = css.match(/\.ar-camera-stage\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const container = css.match(/\.ar-tracking-container\s*\{([\s\S]*?)\}/)?.[1] ?? "";

    expect(host).toMatch(/position:\s*fixed/);
    expect(shell).toMatch(/position:\s*absolute/);
    expect(stage).toMatch(/position:\s*absolute/);
    expect(container).toMatch(/position:\s*absolute/);

    for (const [name, block] of [
      [".ar-portal-host", host],
      [".ar-viewport-shell", shell],
      [".ar-camera-stage", stage],
      [".ar-tracking-container", container],
    ]) {
      expect(block, name).toMatch(/inset:\s*0/);
      expect(block, name).toMatch(/width:\s*auto/);
      expect(block, name).toMatch(/height:\s*auto/);
      expect(block, name).toMatch(/max-width:\s*none/);
      expect(block, name).not.toMatch(/100vw/);
      expect(block, name).not.toMatch(/aspect-ratio/);
    }
  });
});
