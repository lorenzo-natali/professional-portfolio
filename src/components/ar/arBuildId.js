/**
 * Static build identity injected by Vite `define` at compile time.
 * Never generated from Date.now() at runtime — iPhone can prove which build runs.
 */

export const PORTFOLIO_COMMIT =
  typeof __PORTFOLIO_COMMIT__ !== "undefined" ? __PORTFOLIO_COMMIT__ : "local";

export const PORTFOLIO_BUILD_TIME =
  typeof __PORTFOLIO_BUILD_TIME__ !== "undefined" ? __PORTFOLIO_BUILD_TIME__ : "dev";

export const PORTFOLIO_BUILD_ID =
  typeof __PORTFOLIO_BUILD_ID__ !== "undefined"
    ? __PORTFOLIO_BUILD_ID__
    : `${PORTFOLIO_COMMIT}+${PORTFOLIO_BUILD_TIME}`;

/**
 * Publish build id on window + <meta> as soon as the module evaluates.
 */
export function publishPortfolioBuildId() {
  if (typeof window === "undefined" || typeof document === "undefined") return PORTFOLIO_BUILD_ID;

  window.__PORTFOLIO_BUILD_ID = PORTFOLIO_BUILD_ID;
  window.__PORTFOLIO_COMMIT = PORTFOLIO_COMMIT;
  window.__PORTFOLIO_BUILD_TIME = PORTFOLIO_BUILD_TIME;

  let meta = document.querySelector('meta[name="portfolio-build-id"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "portfolio-build-id");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", PORTFOLIO_BUILD_ID);

  return PORTFOLIO_BUILD_ID;
}
