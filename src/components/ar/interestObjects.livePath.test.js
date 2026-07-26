import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  INTEREST_APPEARANCE_ORDER,
  INTEREST_OBJECTS,
  INTEREST_OBJECTS_BASE_PATH,
  INTEREST_OBJECTS_SOURCE_PATH,
} from "./interestObjectsConfig";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LIVE_NAMES = [
  "robot.glb",
  "evil-eye.glb",
  "book.glb",
  "fossil.glb",
  "backpack.glb",
  "plant.glb",
];

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

/** Parse GLB JSON chunk for URI / extension checks (no glTF Transform dep in unit tests). */
function readGlbJson(filePath) {
  const buf = readFileSync(filePath);
  expect(buf.toString("ascii", 0, 4)).toBe("glTF");
  const jsonLength = buf.readUInt32LE(12);
  const jsonChunk = buf.subarray(20, 20 + jsonLength);
  return JSON.parse(jsonChunk.toString("utf8"));
}

function collectUris(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (typeof node.uri === "string") out.push(node.uri);
  if (Array.isArray(node)) {
    node.forEach((item) => collectUris(item, out));
    return out;
  }
  Object.values(node).forEach((value) => collectUris(value, out));
  return out;
}

describe("Interest objects live path", () => {
  it("wires interest objects in the MindAR adapter without Alignment Core", () => {
    const adapter = readFileSync(
      path.join(root, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapter).toMatch(/createInterestObjectsLayer/);
    expect(adapter).toMatch(/createInterestObjectsAnimation/);
    expect(adapter).toMatch(/createInterestObjectsTapController/);
    expect(adapter).not.toMatch(/createInterestObjectsCalibrate/);
    expect(adapter).not.toMatch(/createAlignmentCore/);
    expect(adapter).not.toMatch(/createAlignmentAnimator/);
    expect(adapter).not.toMatch(/createAlignmentInteraction/);
    expect(adapter).not.toMatch(/createProfessionalEvolutionLayer/);
    expect(adapter).not.toMatch(/collectible/i);
  });

  it("points every live config src at ar/interests/web/ only", () => {
    expect(INTEREST_OBJECTS_BASE_PATH).toBe("ar/interests/web");
    expect(INTEREST_OBJECTS_SOURCE_PATH).toBe("ar/interests");
    expect(INTEREST_OBJECTS).toHaveLength(6);
    expect(INTEREST_OBJECTS.map((item) => item.id)).toEqual(INTEREST_APPEARANCE_ORDER);

    INTEREST_OBJECTS.forEach((item) => {
      expect(item.src).toBe(`${INTEREST_OBJECTS_BASE_PATH}/${item.id}.glb`);
      expect(item.src.startsWith("ar/interests/web/")).toBe(true);
      expect(item.src).not.toMatch(/^ar\/interests\/[^/]+\.glb$/);
      expect(item.targetSize).toBeGreaterThan(0);
      expect(["x", "y", "z", "max"]).toContain(item.scaleAxis);
      expect(item.canonicalRotation).toBeTruthy();
      expect(typeof item.displayYaw).toBe("number");
      expect(typeof item.groundOffset).toBe("number");
      expect(typeof item.appearanceDelayMs).toBe("number");
    });

    const book = INTEREST_OBJECTS.find((item) => item.id === "book");
    expect(book.scaleAxis).toBe("max");
    expect(book.targetSize).toBeGreaterThan(0.12);
    expect(book.targetSize).toBeLessThanOrEqual(0.2);
  });

  it("ships the six web GLBs and keeps originals as offline sources", () => {
    const liveDir = path.join(root, "public", INTEREST_OBJECTS_BASE_PATH);
    const sourceDir = path.join(root, "public", INTEREST_OBJECTS_SOURCE_PATH);

    LIVE_NAMES.forEach((name) => {
      const live = path.join(liveDir, name);
      const source = path.join(sourceDir, name);
      expect(existsSync(live), `missing live ${name}`).toBe(true);
      expect(existsSync(source), `missing source ${name}`).toBe(true);
      expect(statSync(live).size).toBeGreaterThan(50_000);
      expect(statSync(source).size).toBeGreaterThan(statSync(live).size);
    });
  });

  it("keeps live interest transfer near the ~7.8 MB optimized budget", () => {
    const liveDir = path.join(root, "public", INTEREST_OBJECTS_BASE_PATH);
    const totalBytes = LIVE_NAMES.reduce(
      (sum, name) => sum + statSync(path.join(liveDir, name)).size,
      0,
    );
    const totalMb = totalBytes / (1024 * 1024);
    expect(totalMb).toBeGreaterThan(6);
    expect(totalMb).toBeLessThan(10);
    expect(totalMb).toBeCloseTo(7.8, 0);
  });

  it("declares Meshopt and has no external URI dependencies in live GLBs", () => {
    const liveDir = path.join(root, "public", INTEREST_OBJECTS_BASE_PATH);
    LIVE_NAMES.forEach((name) => {
      const json = readGlbJson(path.join(liveDir, name));
      const extensions = [
        ...(json.extensionsUsed || []),
        ...(json.extensionsRequired || []),
      ];
      expect(extensions).toContain("EXT_meshopt_compression");
      expect(extensions).not.toContain("KHR_draco_mesh_compression");

      const uris = collectUris(json);
      uris.forEach((uri) => {
        expect(uri).not.toMatch(/^https?:\/\//i);
        expect(uri).not.toMatch(/^\/\//);
      });
    });
  });

  it("configures MeshoptDecoder on the shared live GLTFLoader", () => {
    const loaderSrc = readFileSync(
      path.join(root, "src/components/ar/loadInterestGlb.js"),
      "utf8",
    );
    expect(loaderSrc).toMatch(/meshopt_decoder\.module\.js/);
    expect(loaderSrc).toMatch(/setMeshoptDecoder/);
    expect(loaderSrc).toMatch(/MeshoptDecoder\.ready/);
    expect(loaderSrc).not.toMatch(/DRACOLoader|draco_decoder|KHR_draco/i);
  });

  it("keeps public AR assets free of collectible residue", () => {
    const files = walkFiles(path.join(root, "public/ar")).map((file) =>
      path.relative(path.join(root, "public/ar"), file),
    );
    expect(files.some((file) => file.includes("collectible"))).toBe(false);
  });

  it("strips source interest GLBs from production dist via Vite plugin", () => {
    const viteConfig = readFileSync(path.join(root, "vite.config.js"), "utf8");
    expect(viteConfig).toMatch(/strip-interest-source-glbs-from-dist/);
    expect(viteConfig).toMatch(/dist\/ar\/interests/);
    expect(viteConfig).toMatch(/unlinkSync/);
  });
});
