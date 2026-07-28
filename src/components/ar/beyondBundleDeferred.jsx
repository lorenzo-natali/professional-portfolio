import { lazy, Suspense, useEffect, useState } from "react";
import ARGovernanceCard from "./ARGovernanceCard.jsx";
import { shouldLaunchBeyondCvFromLocation } from "./beyondCvDeepLink.js";

/**
 * Deferred Beyond view — card is light; heavy ARGovernanceView loads only after open.
 * Used by siteDiag=full-no-preload so .mind/GLB/adapter graph is not in the initial App chunk.
 */
const ARGovernanceViewLazy = lazy(() => import("./ARGovernanceView.jsx"));

function ARGovernanceViewDeferred({ open, onClose }) {
  const [allowHeavy, setAllowHeavy] = useState(false);

  useEffect(() => {
    if (open) setAllowHeavy(true);
  }, [open]);

  if (!allowHeavy) return null;

  return (
    <Suspense fallback={null}>
      <ARGovernanceViewLazy open={open} onClose={onClose} />
    </Suspense>
  );
}

export { ARGovernanceCard, shouldLaunchBeyondCvFromLocation };
export { ARGovernanceViewDeferred as ARGovernanceView };
