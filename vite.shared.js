import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** HTML pages allowed in the public GitHub Pages artifact. */
export const PUBLIC_HTML_ALLOWLIST = Object.freeze(["index.html"]);

/** DEV / authoring-only multi-page entries (never emitted by `npm run build`). */
export const AUTHORING_HTML_INPUTS = Object.freeze({
  arInterestsCompare: resolve(rootDir, "ar-interests-compare.html"),
  arTrackingFeaturesExperiment: resolve(
    rootDir,
    "ar-tracking-features-experiment.html",
  ),
  arInterestOrientation: resolve(rootDir, "ar-interest-orientation.html"),
});

function readGitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

const PORTFOLIO_COMMIT = readGitShortSha();
const PORTFOLIO_BUILD_TIME = new Date().toISOString();
const PORTFOLIO_BUILD_ID = `${PORTFOLIO_COMMIT}+${PORTFOLIO_BUILD_TIME}`;

const INTEREST_SOURCE_GLBS = [
  "robot.glb",
  "evil-eye.glb",
  "book.glb",
  "fossil.glb",
  "backpack.glb",
  "plant.glb",
];

/**
 * Keep source interest GLBs in `public/` for the optimize pipeline + DEV compare,
 * but strip them from production `dist` so deploy only ships web-optimized assets.
 */
function stripInterestSourceGlbsFromDist() {
  return {
    name: "strip-interest-source-glbs-from-dist",
    apply: "build",
    closeBundle() {
      const interestsDir = join(rootDir, "dist/ar/interests");
      if (!existsSync(interestsDir)) return;
      for (const name of INTEREST_SOURCE_GLBS) {
        const full = join(interestsDir, name);
        if (existsSync(full)) unlinkSync(full);
      }
      const webDir = join(interestsDir, "web");
      if (existsSync(webDir)) {
        const webFiles = readdirSync(webDir).filter((f) => f.endsWith(".glb"));
        if (webFiles.length < 6) {
          this.warn(
            `[strip-interest-source] expected 6 web GLBs, found ${webFiles.length}`,
          );
        }
      }
    },
  };
}

/** DEV-only MindAR experiments must not ship in production dist. */
function stripArTargetExperimentsFromDist() {
  return {
    name: "strip-ar-target-experiments-from-dist",
    apply: "build",
    closeBundle() {
      const expDir = join(rootDir, "dist/ar/targets/experiments");
      if (!existsSync(expDir)) return;
      for (const name of readdirSync(expDir)) {
        unlinkSync(join(expDir, name));
      }
    },
  };
}

/** Block real authoring editor modules from the public production module graph. */
function stubAuthoringModulesInPublicBuild() {
  const stub = resolve(
    rootDir,
    "src/components/ar/authoring/interestLayoutKeyboard.stub.js",
  );
  return {
    name: "stub-authoring-modules-in-public-build",
    apply: "build",
    enforce: "pre",
    resolveId(source) {
      const normalized = source.replace(/\\/g, "/");
      if (
        normalized.includes("/authoring/interestLayoutKeyboard.js") ||
        normalized.endsWith("authoring/interestLayoutKeyboard.js") ||
        normalized.includes("createInterestObjectsDebug")
      ) {
        return stub;
      }
      return null;
    },
  };
}

/**
 * @param {{
 *   mode?: "production" | "authoring",
 *   outDir?: string,
 * }} [options]
 */
export function createPortfolioViteConfig(options = {}) {
  const mode = options.mode === "authoring" ? "authoring" : "production";
  const isAuthoring = mode === "authoring";
  const outDir = options.outDir ?? (isAuthoring ? "dist-authoring" : "dist");

  /** @type {Record<string, string>} */
  const input = {
    main: resolve(rootDir, "index.html"),
  };
  if (isAuthoring) {
    Object.assign(input, AUTHORING_HTML_INPUTS);
  }

  return defineConfig(({ command }) => {
    const isolateAuthoringFromPublicBuild = !isAuthoring && command === "build";

    return {
      base: "./",
      define: {
        __PORTFOLIO_COMMIT__: JSON.stringify(PORTFOLIO_COMMIT),
        __PORTFOLIO_BUILD_TIME__: JSON.stringify(PORTFOLIO_BUILD_TIME),
        __PORTFOLIO_BUILD_ID__: JSON.stringify(PORTFOLIO_BUILD_ID),
        __AR_AUTHORING_BUILD__: JSON.stringify(isAuthoring),
      },
      plugins: [
        react(),
        tailwindcss(),
        ...(isolateAuthoringFromPublicBuild ? [stubAuthoringModulesInPublicBuild()] : []),
        ...(isAuthoring
          ? []
          : [stripInterestSourceGlbsFromDist(), stripArTargetExperimentsFromDist()]),
      ],
      optimizeDeps: {
        exclude: ["mind-ar"],
      },
      build: {
        outDir,
        emptyOutDir: true,
        commonjsOptions: {
          include: [/mind-ar/, /node_modules/],
        },
        rollupOptions: {
          input,
        },
      },
      test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/test/setup.js",
      },
    };
  });
}
