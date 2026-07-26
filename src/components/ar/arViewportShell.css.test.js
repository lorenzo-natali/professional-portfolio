import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css");

describe("ar fullscreen CSS", () => {
  it("defines portal host + shell + stage + container with inset:0 and width auto", () => {
    const css = readFileSync(cssPath, "utf8");

    for (const selector of [
      ".ar-portal-host",
      ".ar-viewport-shell",
      ".ar-camera-stage",
      ".ar-tracking-container",
    ]) {
      const block = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
      expect(block, selector).toMatch(/inset:\s*0/);
      expect(block, selector).toMatch(/width:\s*auto/);
      expect(block, selector).toMatch(/height:\s*auto/);
      expect(block, selector).toMatch(/max-width:\s*none/);
      expect(block, selector).not.toMatch(/100vw/);
      expect(block, selector).not.toMatch(/aspect-ratio/);
    }
  });
});
