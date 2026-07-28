import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace.js";
import { PortfolioLifecycleBoundary } from "./PortfolioLifecycleBoundary.jsx";
import SiteDiagRoot from "./SiteDiagRoot.jsx";
import { getArRuntimeFlags } from "../components/ar/arRuntimeFlags";
import { installArExitTrace } from "../components/ar/createArExitTrace";

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
