import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ARTrackingProvider } from "./tracking/ARTrackingProvider";
import ARDesktopGate from "./ARDesktopGate";
import ARGovernanceIntro from "./ARGovernanceIntro";
import ARCameraView from "./ARCameraView";
import GovernanceBriefFallback from "./GovernanceBriefFallback";
import { useIsMobileDevice } from "./useIsMobileDevice";
import { lockArPage, setPortfolioInert } from "./arPageLock";
import { bindArViewportListeners, syncArViewportShell } from "./arViewport";

function briefCopy(reason) {
  switch (reason) {
    case "target-unavailable":
      return "The AR recognition experience is not currently available. You can explore the same professional insights in this interactive view.";
    case "unsupported":
      return "This browser or device cannot run the camera experience. You can explore the same professional insights in this interactive view.";
    case "camera-denied":
      return "Camera access was not granted. You can still explore the same professional insights in a standard interactive view.";
    case "tracking-error":
      return "The camera experience could not be started. You can still explore the same professional insights in a standard interactive view.";
    case "desktop":
      return "A concise interactive summary of the governance layer — available without the camera experience.";
    default:
      return "You can explore the same professional insights in a standard interactive view.";
  }
}

function ARGovernanceExperience({ isMobile, onClose }) {
  const [screen, setScreen] = useState(isMobile ? "intro" : "desktop");
  const [briefReason, setBriefReason] = useState(null);

  const exploreProjects = () => {
    onClose();
    window.requestAnimationFrame(() => {
      document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      {screen === "desktop" && (
        <ARDesktopGate
          onViewBrief={() => {
            setBriefReason("desktop");
            setScreen("brief");
          }}
          onClose={onClose}
        />
      )}

      {screen === "intro" && (
        <ARGovernanceIntro
          onActivateCamera={() => setScreen("camera")}
          onExploreBrief={() => {
            setBriefReason("target-unavailable");
            setScreen("brief");
          }}
          onBack={onClose}
        />
      )}

      {screen === "camera" && (
        <ARTrackingProvider>
          <ARCameraView
            onBack={onClose}
            onFallback={(reason) => {
              const allowed = new Set([
                "unsupported",
                "tracking-error",
                "camera-denied",
                "target-unavailable",
              ]);
              setBriefReason(allowed.has(reason) ? reason : "camera-denied");
              setScreen("brief");
            }}
          />
        </ARTrackingProvider>
      )}

      {screen === "brief" && (
        <GovernanceBriefFallback
          title="2D Governance Brief"
          message={briefCopy(briefReason)}
          onBack={onClose}
          onExploreProjects={exploreProjects}
        />
      )}
    </>
  );
}

/**
 * Full-screen AR Governance experience — portaled to document.body,
 * outside the portfolio stacking context.
 */
export default function ARGovernanceView({ open, onClose }) {
  const isMobile = useIsMobileDevice();
  const shellRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const shell = shellRef.current;
    const root = document.getElementById("root");
    const unlockPage = lockArPage();
    setPortfolioInert(root, true);

    const sync = () => syncArViewportShell(shell);
    sync();
    const unbindViewport = bindArViewportListeners(sync);

    return () => {
      unbindViewport();
      setPortfolioInert(root, false);
      unlockPage();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={shellRef}
      data-ar-viewport-shell="true"
      data-ar-root="true"
      className="ar-viewport-shell"
      role="dialog"
      aria-modal="true"
      aria-label="AR Governance View"
    >
      <ARGovernanceExperience isMobile={isMobile} onClose={onClose} />
    </div>,
    document.body,
  );
}
