import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

describe("collectible removal and Professional Evolution live path", () => {
  it("removes collectible asset directories from the project", () => {
    expect(existsSync(path.join(root, "public/ar/collectible"))).toBe(false);
    expect(existsSync(path.join(root, "assets/ar/collectible"))).toBe(false);
    expect(existsSync(path.join(root, "docs/collectible"))).toBe(false);
    expect(existsSync(path.join(root, "collectible-preview.html"))).toBe(false);
    expect(existsSync(path.join(root, "scripts/optimize-collectible.mjs"))).toBe(false);
  });

  it("keeps no collectible loader / Meshopt / gesture wiring in the MindAR adapter", () => {
    const adapter = readFileSync(
      path.join(root, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapter).not.toMatch(/collectible/i);
    expect(adapter).not.toMatch(/GLTFLoader|Meshopt|createCardGestureController|loadCollectible/);
    expect(adapter).toMatch(/createProfessionalEvolutionLayer/);
    expect(adapter).toMatch(/createProfessionalEvolutionAnimation/);
    expect(adapter).toMatch(/pointerEvents = "none"/);
  });

  it("removes the collectible optimize script from package.json and preview from vite", () => {
    const pkg = readFileSync(path.join(root, "package.json"), "utf8");
    const vite = readFileSync(path.join(root, "vite.config.js"), "utf8");
    expect(pkg).not.toMatch(/optimize:collectible/);
    expect(vite).not.toMatch(/collectible-preview/);
    expect(vite).toMatch(/professional-evolution-preview/);
  });

  it("does not ship obsolete collectible files under public/", () => {
    const publicAr = path.join(root, "public/ar");
    const files = walkFiles(publicAr).map((file) => path.relative(publicAr, file));
    expect(files.some((file) => file.includes("collectible"))).toBe(false);
    expect(files).toContain("targets/cv-page-1.mind");
  });

  it(
    "production build contains no collectible assets or chunks",
    () => {
      execFileSync("npm", ["run", "build"], {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });

      const distDir = path.join(root, "dist");
      expect(existsSync(distDir)).toBe(true);

      const files = walkFiles(distDir).map((file) => path.relative(distDir, file));
      const lowerPaths = files.map((file) => file.toLowerCase());
      expect(lowerPaths.some((file) => file.includes("collectible"))).toBe(false);
      expect(lowerPaths.some((file) => file.endsWith(".glb"))).toBe(false);

      const jsAssets = files.filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));
      for (const relative of jsAssets) {
        const source = readFileSync(path.join(distDir, relative), "utf8");
        expect(source).not.toMatch(/collectible/i);
        expect(source).not.toMatch(/MeshoptDecoder|meshopt_decoder/i);
        expect(source).not.toMatch(/GLTFLoader/);
      }
    },
    180_000,
  );
});
