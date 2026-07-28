import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace.js";
import { installPortfolioRuntimeCounters } from "./createPortfolioRuntimeCounters.js";
import { PortfolioLifecycleBoundary } from "./PortfolioLifecycleBoundary.jsx";
import SiteDiagRoot from "./SiteDiagRoot.jsx";
import { getArRuntimeFlags } from "../components/ar/arRuntimeFlags";
import { installArExitTrace } from "../components/ar/createArExitTrace";
import { isSectionBisectSiteDiagMode } from "./appFeatures.js";

/**
 * Opt-in siteDiag boot — does not statically import App or beyondBundle.
 * Full-* variants load App (+ optional beyond) only through SiteDiagRoot.
 */
export function bootSiteDiag(siteDiagMode) {
  const runtimeFlags = getArRuntimeFlags();

  if (runtimeFlags.arCrashDiag) {
    installArExitTrace({ enabled: true });
  }

  const lifecycleTrace = installPortfolioLifecycleTrace({ enabled: true });

  // Runtime counters for full App / section bisection isolation.
  if (
    siteDiagMode === "full-core" ||
    siteDiagMode === "full" ||
    isSectionBisectSiteDiagMode(siteDiagMode) ||
    String(siteDiagMode).startsWith("full-")
  ) {
    installPortfolioRuntimeCounters({ force: true });
  }

  const root = createRoot(document.getElementById("root"));
  root.render(
    <StrictMode>
      <PortfolioLifecycleBoundary>
        <SiteDiagRoot mode={siteDiagMode} />
      </PortfolioLifecycleBoundary>
    </StrictMode>,
  );

  lifecycleTrace?.recordReactRootMount?.();
}
