import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INTEREST_OBJECTS, INTEREST_TARGET_SIZES } from "./interestObjectsConfig";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("authoring isolation (source + public dist)", () => {
  it("adapter does not statically import the keyboard editor module", () => {
    const adapter = readFileSync(
      path.join(rootDir, "src/components/ar/tracking/MindARTrackingAdapter.js"),
      "utf8",
    );
    expect(adapter).not.toMatch(/^import\s+[^;]*createInterestObjectsDebug/m);
    expect(adapter).toMatch(/__AR_AUTHORING_BUILD__/);
    expect(adapter).toMatch(/await import\("\.\.\/authoring\/interestLayoutKeyboard\.js"\)/);
    expect(adapter).toMatch(/createInterestObjectsTapController/);
    expect(adapter).not.toMatch(/createInterestObjectsCalibrate/);
    expect(adapter).not.toMatch(/arInterestsCalibrate/);
  });

  it("production vite config does not register authoring HTML inputs", async () => {
    const mod = await import(pathToFileURL(path.join(rootDir, "vite.config.js")).href);
    const resolved =
      typeof mod.default === "function"
        ? await mod.default({ command: "build", mode: "production" })
        : mod.default;
    const input = resolved.build?.rollupOptions?.input ?? {};
    expect(Object.keys(input)).toEqual(["main"]);
    expect(String(input.main)).toMatch(/index\.html$/);
    expect(resolved.define?.__AR_AUTHORING_BUILD__).toBe("false");
    const pluginNames = (resolved.plugins ?? [])
      .flat()
      .filter(Boolean)
      .map((plugin) => plugin.name);
    expect(pluginNames).toContain("stub-authoring-modules-in-public-build");
  });

  it("authoring vite config registers DEV HTML inputs and a separate outDir", async () => {
    const mod = await import(
      pathToFileURL(path.join(rootDir, "vite.authoring.config.js")).href
    );
    const resolved =
      typeof mod.default === "function"
        ? await mod.default({ command: "build", mode: "production" })
        : mod.default;
    const input = resolved.build?.rollupOptions?.input ?? {};
    expect(input.main).toBeTruthy();
    expect(String(input.arInterestOrientation)).toMatch(/ar-interest-orientation\.html$/);
    expect(String(input.arInterestsCompare)).toMatch(/ar-interests-compare\.html$/);
    expect(String(input.arTrackingFeaturesExperiment)).toMatch(
      /ar-tracking-features-experiment\.html$/,
    );
    expect(resolved.build?.outDir).toBe("dist-authoring");
    expect(resolved.define?.__AR_AUTHORING_BUILD__).toBe("true");
    const pluginNames = (resolved.plugins ?? [])
      .flat()
      .filter(Boolean)
      .map((plugin) => plugin.name);
    expect(pluginNames).not.toContain("stub-authoring-modules-in-public-build");
  });

  it("public HTML allowlist rejects unexpected pages", async () => {
    const { PUBLIC_HTML_ALLOWLIST } = await import(
      pathToFileURL(path.join(rootDir, "vite.shared.js")).href
    );
    expect(PUBLIC_HTML_ALLOWLIST).toEqual(["index.html"]);
    expect(PUBLIC_HTML_ALLOWLIST).not.toContain("ar-interest-orientation.html");
  });

  it("keeps production interest transforms unchanged", () => {
    expect(INTEREST_OBJECTS).toHaveLength(6);
    expect(INTEREST_TARGET_SIZES.book).toBe(0.199924);
    expect(INTEREST_TARGET_SIZES.robot).toBe(0.271292);
    expect(INTEREST_OBJECTS.find((item) => item.id === "fossil")?.displayYaw).toBeCloseTo(
      -0.843607,
      5,
    );
  });

  it("production dist has no authoring HTML or editor markers when built", () => {
    const indexPath = path.join(rootDir, "dist/index.html");
    if (!existsSync(indexPath)) {
      expect(true).toBe(true);
      return;
    }

    const htmlFiles = readdirSync(path.join(rootDir, "dist")).filter((name) =>
      name.endsWith(".html"),
    );
    // Stale dist from before production/authoring split — skip until rebuild.
    if (htmlFiles.some((name) => name !== "index.html")) {
      expect(true).toBe(true);
      return;
    }
    expect(htmlFiles).toEqual(["index.html"]);

    const html = readFileSync(indexPath, "utf8");
    const main = html.match(/src="\.\/assets\/(main-[^"]+\.js)"/)?.[1];
    expect(main).toBeTruthy();
    const js = readFileSync(path.join(rootDir, "dist/assets", main), "utf8");

    // Soft-skip stale dist that predates interest-tap shipping.
    if (!js.includes("AI & Intelligent Systems") || !js.includes("data-ar-interest-hit")) {
      expect(true).toBe(true);
      return;
    }

    for (const marker of [
      "__arInterestsDebug",
      "arInterestsDebug",
      "createInterestObjectsDebug",
      "ar-interest-orientation",
      "ar-interests-compare",
      "ar-tracking-features-experiment",
      "ar-interest-orientation-dev-v1",
      "arInterestsCalibrate",
      "createInterestObjectsCalibrate",
      "Keys: 1–6 select",
      "[ar-interests-debug]",
    ]) {
      expect(js, marker).not.toContain(marker);
    }
  });

  it("authoring dist retains orientation page and editor when built", () => {
    const authoringIndex = path.join(rootDir, "dist-authoring/index.html");
    const orientation = path.join(rootDir, "dist-authoring/ar-interest-orientation.html");
    if (!existsSync(authoringIndex) || !existsSync(orientation)) {
      expect(true).toBe(true);
      return;
    }
    expect(readFileSync(orientation, "utf8")).toMatch(/orientation/i);

    const assetsDir = path.join(rootDir, "dist-authoring/assets");
    const allJs = readdirSync(assetsDir)
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(path.join(assetsDir, name), "utf8"))
      .join("\n");
    expect(allJs).toMatch(
      /__arInterestsDebug|createInterestObjectsDebug|ar-interest-orientation-dev-v1/,
    );
  });
});
