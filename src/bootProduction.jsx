import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import * as beyondModules from "./components/ar/beyondBundle.js";
import {
  createArRuntimeAudit,
  isArRuntimeAuditEnabled,
} from "./components/ar/createArRuntimeAudit";
import { installArExitTrace } from "./components/ar/createArExitTrace";
import { getArRuntimeFlags } from "./components/ar/arRuntimeFlags";
import { EAGER_SECTION_MODULES } from "./portfolio/sectionLoaders.js";

/**
 * Production boot — eager Beyond graph + eager portfolio sections.
 * Kept in a dedicated module so siteDiag boots do not statically import App/AR.
 */
export function bootProduction() {
  const runtimeFlags = getArRuntimeFlags();

  if (runtimeFlags.arCrashDiag) {
    installArExitTrace({ enabled: true });
  }

  const runtimeAudit = isArRuntimeAuditEnabled()
    ? createArRuntimeAudit({ enabled: true })
    : null;
  runtimeAudit?.recordPhase?.("script-load");

  const root = createRoot(document.getElementById("root"));
  root.render(
    <StrictMode>
      <App
        beyondModules={beyondModules}
        eagerSectionModules={EAGER_SECTION_MODULES}
      />
    </StrictMode>,
  );

  runtimeAudit?.recordPhase?.("react-mount");
  window.__arRuntimeAuditRoot = runtimeAudit;
}
