import { useCallback, useEffect, useRef, useState } from "react";
import ARTrackingScene from "./ARTrackingScene";
import ARAboutPanel from "./ARAboutPanel";
import ARCameraDiagnosticsPanel from "./ARCameraDiagnosticsPanel";
import { attachArCameraDiagnostics } from "./arCameraDiagnostics";

/**
 * Camera AR slice: absolute stage inside the single portaled viewport shell.
 * Clean baseline HUD — no Lens selector or world annotations in this milestone.
 *
 * `diagnosticsEnabled` is the authoritative session flag from ARGovernanceView.
 * Panel mount and attach must not re-parse the URL.
 */
export default function ARCameraView({ onBack, onFallback, diagnosticsEnabled = false }) {
  const [tracking, setTracking] = useState("searching"); // searching | detected | lost
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);
  const [diagnosticsError, setDiagnosticsError] = useState(null);
  const diagnosticsCleanupRef = useRef(null);
  const diagnosticsEnabledRef = useRef(diagnosticsEnabled);

  useEffect(() => {
    diagnosticsEnabledRef.current = diagnosticsEnabled;
  }, [diagnosticsEnabled]);

  useEffect(
    () => () => {
      diagnosticsCleanupRef.current?.();
      diagnosticsCleanupRef.current = null;
    },
    [],
  );

  const handleTargetFound = () => {
    setTracking("detected");
  };

  const handleTargetLost = () => {
    setTracking((current) => (current === "searching" ? current : "lost"));
  };

  const handleVideoReady = useCallback(({ video, container }) => {
    if (!diagnosticsEnabledRef.current) return;

    diagnosticsCleanupRef.current?.();
    diagnosticsCleanupRef.current = null;

    if (!video) {
      setDiagnosticsError("Diagnostics unavailable: camera video element missing.");
      return;
    }

    try {
      const cleanup = attachArCameraDiagnostics({
        video,
        container,
        onSnapshot: (snapshot) => {
          setDiagnosticsError(null);
          setCameraSnapshot(snapshot);
        },
        logInitial: true,
        forceEnabled: true,
      });
      diagnosticsCleanupRef.current = cleanup;
      setDiagnosticsError(null);
    } catch {
      setDiagnosticsError("Diagnostics attachment failed.");
    }
  }, []);

  const statusLabel =
    tracking === "searching"
      ? "Align the first page of the CV"
      : tracking === "detected"
        ? "CV detected"
        : tracking === "lost"
          ? "Reframe the CV to continue"
          : null;

  return (
    <div data-ar-camera-stage="true" className="ar-camera-stage text-slate-100">
      <ARTrackingScene
        active
        onReady={() => setTracking((t) => (t === "searching" ? "searching" : t))}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
        onVideoReady={handleVideoReady}
        onError={() => onFallback("tracking-error")}
        onUnsupported={(reason) =>
          onFallback(reason === "target-unavailable" ? "target-unavailable" : "unsupported")
        }
      />

      {diagnosticsEnabled && (
        <ARCameraDiagnosticsPanel
          snapshot={cameraSnapshot}
          waiting={!cameraSnapshot && !diagnosticsError}
          error={diagnosticsError}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {statusLabel && (
          <p
            className="mx-auto max-w-md text-center text-xs font-medium tracking-[0.12em] text-slate-100"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}
          >
            {statusLabel}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="rounded-md bg-slate-950/70 px-2.5 py-2 text-xs font-medium text-slate-300"
            aria-label="About this experience"
          >
            About
          </button>
        </div>
      </div>

      <ARAboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
