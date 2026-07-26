import { existsSync, readFileSync, readdirSync } from "node:fs";
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

describe("Alignment Core live path", () => {
  it("wires Alignment Core in the MindAR adapter without Professional Evolution", () => {
    const adapter = readFileSync(
      path.join(root, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapter).toMatch(/createAlignmentCore/);
    expect(adapter).toMatch(/createAlignmentAnimator/);
    expect(adapter).toMatch(/createAlignmentInteraction/);
    expect(adapter).not.toMatch(/createProfessionalEvolutionLayer/);
    expect(adapter).not.toMatch(/professionalEvolution/i);
    expect(adapter).not.toMatch(/collectible/i);
    expect(adapter).not.toMatch(/GLTFLoader|Meshopt/);
  });

  it("does not keep the Professional Evolution preview entry", () => {
    const vite = readFileSync(path.join(root, "vite.config.js"), "utf8");
    expect(vite).not.toMatch(/professional-evolution-preview/);
    expect(existsSync(path.join(root, "professional-evolution-preview.html"))).toBe(false);
  });

  it("keeps public AR assets free of collectible residue", () => {
    const files = walkFiles(path.join(root, "public/ar")).map((file) =>
      path.relative(path.join(root, "public/ar"), file),
    );
    expect(files.some((file) => file.includes("collectible"))).toBe(false);
  });
});
