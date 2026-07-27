import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cssPath = resolve(root, "index.css");
const preflightPath = resolve(root, "../node_modules/tailwindcss/preflight.css");

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

  it("exempts only the AR tracking video from Tailwind Preflight max-width", () => {
    const css = readFileSync(cssPath, "utf8");
    const preflight = readFileSync(preflightPath, "utf8");

    expect(preflight).toMatch(/img,\s*video\s*\{[\s\S]*?max-width:\s*100%/);
    expect(css).toMatch(/@import\s+["']tailwindcss["']/);

    const arVideo = css.match(/\.ar-tracking-container\s*>\s*video\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(arVideo).toMatch(/max-width:\s*none/);
    // No global bare `video { max-width: none }` that would disable Preflight portfolio-wide.
    expect(css).not.toMatch(/(?:^|\n)\s*video\s*\{[^}]*max-width:\s*none/);
  });

  it("defines a compact AR status prompt with reduced-motion support", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.ar-status-prompt\s*\{/);
    expect(css).toMatch(/\.ar-status-prompt__title\s*\{/);
    expect(css).toMatch(/\.ar-status-prompt__hint\s*\{/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.ar-status-fade/);
  });

  it("keeps Preflight max-width on non-AR videos while AR container video is exempt", () => {
    const style = document.createElement("style");
    style.textContent = `
      img, video { max-width: 100%; height: auto; }
      .ar-tracking-container > video {
        z-index: 0 !important;
        pointer-events: none;
        max-width: none;
      }
    `;
    document.head.appendChild(style);

    const ar = document.createElement("div");
    ar.className = "ar-tracking-container";
    const arVideo = document.createElement("video");
    ar.appendChild(arVideo);
    const portfolioVideo = document.createElement("video");
    document.body.append(ar, portfolioVideo);

    expect(getComputedStyle(arVideo).maxWidth).toBe("none");
    expect(getComputedStyle(portfolioVideo).maxWidth).toBe("100%");

    style.remove();
    ar.remove();
    portfolioVideo.remove();
  });
});
