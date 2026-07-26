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
import { getArRuntimeFlags } from "./arRuntimeFlags";
import {
  recordArRuntimeAuditPhase,
  setArRuntimeAuditState,
} from "./createArRuntimeAudit";

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

function CalibrateEarlyBanner() {
  const flags = getArRuntimeFlags();
  if (!flags.arInterestsCalibrate) return null;
  return (
    <div
      data-ar-calibrate-early-banner="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.45rem,env(safe-area-inset-top))]"
    >
      <div className="rounded bg-amber-700/95 px-3 py-1.5 text-center text-[11px] font-extrabold tracking-[0.08em] text-amber-50 uppercase">
        CALIBRATE MODE — Activate Camera to edit layout
      </div>
    </div>
  );
}

function ARGovernanceExperience({ isMobile, onClose }) {
  const flags = getArRuntimeFlags();
  // Calibrate / audit field work must reach the camera path even when Safari
  // "Request Desktop Website" misclassifies the device.
  const allowCameraPath = isMobile || flags.arInterestsCalibrate || flags.arRuntimeAudit;
  const [screen, setScreen] = useState(allowCameraPath ? "intro" : "desktop");
  const [unavailableReason, setUnavailableReason] = useState(null);

  useLayoutEffect(() => {
    setArRuntimeAuditState({
      arComponent: "ARGovernanceView",
      screen,
      trackingAdapter: screen === "camera" ? "MindARTrackingAdapter" : null,
    });
    recordArRuntimeAuditPhase("ar-screen", {
      screen,
      isMobile,
      allowCameraPath,
      calibrate: flags.arInterestsCalibrate,
      calibrateSource: flags.calibrateSource,
    });
    if (screen === "desktop" && flags.arInterestsCalibrate) {
      console.warn(
        "[ar-interests-calibrate] desktop gate active — camera/calibrate UI will not mount on this device classification",
        { isMobile, ua: typeof navigator !== "undefined" ? navigator.userAgent : "" },
      );
      setArRuntimeAuditState({
        calibrateSkipReason: "desktop-gate (isMobile=false)",
      });
    }
    if (screen === "intro" && flags.arInterestsCalibrate) {
      console.info(
        "[ar-interests-calibrate] flag latched — early banner visible; controller mounts after Activate Camera",
        { source: flags.calibrateSource },
      );
      setArRuntimeAuditState({ calibrateSkipReason: null });
    }
  }, [
    screen,
    isMobile,
    allowCameraPath,
    flags.arInterestsCalibrate,
    flags.calibrateSource,
  ]);

  return (
    <>
      <CalibrateEarlyBanner />

      {screen === "desktop" && <ARDesktopGate onClose={onClose} />}

      {screen === "intro" && (
        <ARGovernanceIntro
          onActivateCamera={() => {
            recordArRuntimeAuditPhase("activate-camera");
            setScreen("camera");
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
 * under document.documentElement (not body), outside the portfolio stacking context.
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
    recordArRuntimeAuditPhase("beyond-the-cv-open", {
      isMobile,
      flags: getArRuntimeFlags(),
      portalParent: portalHost.parentElement?.tagName?.toLowerCase?.() ?? null,
    });

    const sync = () => syncArViewportShell(shell, portalHost);
    sync();
    recordArViewportLifecycle(shell, "portal-mount");
    recordArRuntimeAuditPhase("portal-mount", {
      portalParent: portalHost.parentElement?.tagName?.toLowerCase?.() ?? null,
    });
    const unbindViewport = bindArViewportListeners(sync);

    const flags = getArRuntimeFlags();
    const viewportDebug =
      isArViewportDebugEnabled() || flags.arViewportDebug || flags.arRuntimeAudit
        ? createArViewportDebug(shell, { enabled: true })
        : { dispose() {}, recordPhase() {} };
    viewportDebug.recordPhase?.("portal-mount-debug");

    return () => {
      recordArRuntimeAuditPhase("beyond-the-cv-close");
      viewportDebug.dispose();
      unbindViewport();
      setPortfolioInert(root, false);
      unlockPage();
      queueMicrotask(() => {
        teardownArPortalHost(portalHost);
      });
    };
  }, [open, portalHost, isMobile]);

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
