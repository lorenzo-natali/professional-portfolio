import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ARTrackingProvider } from "./tracking/ARTrackingProvider";
import ARDesktopGate from "./ARDesktopGate";
import ARGovernanceIntro from "./ARGovernanceIntro";
import ARCameraView from "./ARCameraView";
import GovernanceBriefFallback from "./GovernanceBriefFallback";
import { useIsMobileDevice } from "./useIsMobileDevice";

function briefCopy(reason) {
  switch (reason) {
    case "unsupported":
      return "The AR image target is not available yet. You can explore the same professional insights in this interactive view.";
    case "camera-denied":
    case "tracking-error":
      return "Camera access was not granted. You can still explore the same professional insights in a standard interactive view.";
    case "desktop":
      return "A concise interactive summary of the governance layer — available without the camera experience.";
    default:
      return "You can explore the same professional insights in a standard interactive view.";
  }
}

function ARGovernanceExperience({ isMobile, onClose }) {
  const [screen, setScreen] = useState(isMobile ? "intro" : "desktop");
  const [briefReason, setBriefReason] = useState(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

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
        <ARGovernanceIntro onActivateCamera={() => setScreen("camera")} onBack={onClose} />
      )}

      {screen === "camera" && (
        <ARTrackingProvider>
          <ARCameraView
            onBack={onClose}
            onExploreProjects={exploreProjects}
            onFallback={(reason) => {
              setBriefReason(reason === "unsupported" ? "unsupported" : "camera-denied");
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
 * Full-screen AR Governance experience orchestrator.
 * Desktop never attempts camera AR — only the 2D brief.
 */
export default function ARGovernanceView({ open, onClose }) {
  const isMobile = useIsMobileDevice();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ar-governance-view"
          className="fixed inset-0 z-[120] bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="AR Governance View"
        >
          <ARGovernanceExperience isMobile={isMobile} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
