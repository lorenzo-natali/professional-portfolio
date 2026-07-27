import { createPortfolioViteConfig } from "./vite.shared.js";

/**
 * Public GitHub Pages build — visitor portfolio + WebAR only.
 * Authoring / DEV HTML pages are not inputs here.
 */
export default createPortfolioViteConfig({ mode: "production", outDir: "dist" });
