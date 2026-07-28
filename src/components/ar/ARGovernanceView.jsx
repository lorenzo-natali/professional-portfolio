/**
 * Full-screen AR Governance experience — portaled through ar-portal-host
 * under document.documentElement (not body), outside the portfolio stacking context.
 *
 * Portal lifecycle depends only on the AR open/close transition — not on derived
 * values such as isMobile. intentionalClose is recorded only when open → false.
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ARTrackingProvider } from "./tracking/ARTrackingProvider";
import ARDesktopGate from "./ARDesktopGate";
import ARGovernanceIntro from "./ARGovernanceIntro";
import ARCameraView from "./ARCameraView";
import ARUnavailablePanel from "./ARUnavailablePanel";
import ARTrackingErrorBoundary from "./ARTrackingErrorBoundary";
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
import {
  getDisplayedArExitReason,
  recordArExitTrace,
} from "./createArExitTrace";

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

function initialArScreen(isMobile, flags) {
  // Audit / crash-diag field work can bypass the desktop gate when Safari misclassifies the device.
  const allowCameraPath =
    isMobile ||
    flags.arRuntimeAudit ||
    flags.arRotateAudit ||
    Boolean(flags.arCrashDiag);
  if (!allowCameraPath) return "desktop";
  return "intro";
}

function ARGovernanceExperience({ isMobile, onClose }) {
  const flags = getArRuntimeFlags();
  const allowCameraPath =
    isMobile ||
    flags.arRuntimeAudit ||
    flags.arRotateAudit ||
    Boolean(flags.arCrashDiag);
  const [screen, setScreen] = useState(() => initialArScreen(isMobile, flags));
  const [unavailableReason, setUnavailableReason] = useState(null);

  const goUnavailable = (reason) => {
    if (typeof window !== "undefined") {
      window.__arRotateAudit?.note?.("application_fallback", {
        cleanupReason: String(reason || "fallback"),
      });
    }
    recordArExitTrace(
      "screenTransition",
      { to: "unavailable", reason: String(reason || "fallback") },
      { asReason: true },
    );
    const allowed = new Set([
      "unsupported",
      "tracking-error",
      "camera-denied",
      "target-unavailable",
    ]);
    setUnavailableReason(allowed.has(reason) ? reason : "camera-denied");
    setScreen("unavailable");
  };

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
    });
    recordArExitTrace(
      "screenTransition",
      { screen, isMobile, allowCameraPath },
      { asReason: screen === "intro" },
    );
  }, [screen, isMobile, allowCameraPath]);

  return (
    <>
      {screen === "desktop" && <ARDesktopGate onClose={onClose} />}

      {screen === "intro" && (
        <ARGovernanceIntro
          previousExitReason={
            flags.arCrashDiag ? getDisplayedArExitReason() : null
          }
          onActivateCamera={() => {
            recordArRuntimeAuditPhase("activate-camera");
            recordArExitTrace("screenTransition", { to: "camera" }, { asReason: false });
            setScreen("camera");
          }}
          onBack={() => {
            recordArExitTrace(
              "screenTransition",
              { to: "portfolio", reason: "intro-back" },
              { asReason: true },
            );
            onClose();
          }}
        />
      )}

      {screen === "camera" && (
        <ARTrackingProvider>
          <ARTrackingErrorBoundary
            onError={() => {
              goUnavailable("tracking-error");
            }}
          >
            <ARCameraView
              onBack={() => {
                recordArExitTrace(
                  "screenTransition",
                  { to: "portfolio", reason: "camera-close" },
                  { asReason: true },
                );
                onClose();
              }}
              onFallback={(reason) => {
                goUnavailable(reason);
              }}
            />
          </ARTrackingErrorBoundary>
        </ARTrackingProvider>
      )}

      {screen === "unavailable" && (
        <ARUnavailablePanel message={unavailableCopy(unavailableReason)} onClose={onClose} />
      )}
    </>
  );
}

export default function ARGovernanceView({ open, onClose }) {
  const isMobile = useIsMobileDevice();
  const shellRef = useRef(null);
  /** Tracks latest open for cleanup: intentional close only when open → false. */
  const openRef = useRef(open);
  openRef.current = open;

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
      isArViewportDebugEnabled() || flags.arViewportDebug
        ? createArViewportDebug(shell, { enabled: true })
        : { dispose() {}, recordPhase() {} };
    viewportDebug.recordPhase?.("portal-mount-debug");

    if (flags.arRotateAudit) {
      void import("./arRotateAudit").then((mod) => {
        mod.installArRotateAudit();
      });
    }

    return () => {
      // Real close: open flipped to false before this cleanup runs.
      // StrictMode remount / dependency-free re-entry keeps openRef true.
      const intentionalClose = openRef.current === false;
      recordArRuntimeAuditPhase(
        intentionalClose ? "beyond-the-cv-close" : "beyond-the-cv-portal-effect-cleanup",
      );
      if (typeof window !== "undefined" && intentionalClose) {
        window.__arRotateAudit?.note?.("stop", {
          cleanupReason: "beyond-the-cv-close",
          intentionalClose: true,
        });
        window.__arRotateAudit?.persistNow?.();
        window.__arRotateAudit?.dispose?.();
      }
      viewportDebug.dispose();
      unbindViewport();
      setPortfolioInert(root, false);
      unlockPage();
      queueMicrotask(() => {
        teardownArPortalHost(portalHost);
      });
    };
    // Portal session lifecycle follows open/close only — not isMobile churn.
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
