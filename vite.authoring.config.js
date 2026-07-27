import { createPortfolioViteConfig } from "./vite.shared.js";

/**
 * Local authoring / DEV experiment build.
 * Emits to dist-authoring/ and is never used by GitHub Pages.
 */
export default createPortfolioViteConfig({
  mode: "authoring",
  outDir: "dist-authoring",
});
