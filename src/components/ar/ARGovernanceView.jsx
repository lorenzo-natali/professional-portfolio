import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ARTrackingProvider } from "./tracking/ARTrackingProvider";
import ARDesktopGate from "./ARDesktopGate";
import ARGovernanceIntro from "./ARGovernanceIntro";
import ARCameraView from "./ARCameraView";
import ARUnavailablePanel from "./ARUnavailablePanel";
import { useIsMobileDevice } from "./useIsMobileDevice";
import { lockArPage, setPortfolioInert } from "./arPageLock";
import {
  bindArViewportListeners,
  ensureArPortalHost,
  recordArViewportLifecycle,
  syncArViewportShell,
  teardownArPortalHost,
} from "./arViewport";
import {
  createArViewportDebug,
  isArViewportDebugEnabled,
} from "./createArViewportDebug";

function unavailableCopy(reason) {
  switch (reason) {
    case "target-unavailable":
      return "The AR recognition experience is not currently available.";
    case "unsupported":
      return "This browser or device cannot run the camera experience.";
    case "camera-denied":
      return "Camera access was not granted.";
    case "tracking-error":
      return "The camera experience could not be started.";
    default:
      return "The camera experience is unavailable right now.";
  }
}

function ARGovernanceExperience({ isMobile, onClose }) {
  const [screen, setScreen] = useState(isMobile ? "intro" : "desktop");
  const [unavailableReason, setUnavailableReason] = useState(null);

  return (
    <>
      {screen === "desktop" && <ARDesktopGate onClose={onClose} />}

      {screen === "intro" && (
        <ARGovernanceIntro onActivateCamera={() => setScreen("camera")} onBack={onClose} />
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
              setUnavailableReason(allowed.has(reason) ? reason : "camera-denied");
              setScreen("unavailable");
            }}
          />
        </ARTrackingProvider>
      )}

      {screen === "unavailable" && (
        <ARUnavailablePanel message={unavailableCopy(unavailableReason)} onClose={onClose} />
      )}
    </>
  );
}

/**
 * Full-screen AR Governance experience — portaled through ar-portal-host
 * under document.body, outside the portfolio stacking context.
 */
export default function ARGovernanceView({ open, onClose }) {
  const isMobile = useIsMobileDevice();
  const shellRef = useRef(null);

  const portalHost = useMemo(() => {
    if (!open || typeof document === "undefined") return null;
    return ensureArPortalHost();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !portalHost) return undefined;

    const shell = shellRef.current;
    const root = document.getElementById("root");
    const unlockPage = lockArPage();
    setPortfolioInert(root, true);

    const sync = () => syncArViewportShell(shell, portalHost);
    sync();
    recordArViewportLifecycle(shell, "portal-mount");
    const unbindViewport = bindArViewportListeners(sync);

    // Field telemetry on iPhone: enable with ?arViewportDebug=1 (incl. production builds).
    const viewportDebug = isArViewportDebugEnabled()
      ? createArViewportDebug(shell, { enabled: true })
      : { dispose() {}, recordPhase() {} };
    viewportDebug.recordPhase?.("portal-mount-debug");

    return () => {
      viewportDebug.dispose();
      unbindViewport();
      setPortfolioInert(root, false);
      unlockPage();
      queueMicrotask(() => {
        teardownArPortalHost(portalHost);
      });
    };
  }, [open, portalHost]);

  if (!open || !portalHost) return null;

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
    portalHost,
  );
}
