import { useCallback, useEffect, useRef, useState } from "react";
import ARTrackingScene from "./ARTrackingScene";
import ARAboutPanel from "./ARAboutPanel";
import ARCameraDiagnosticsPanel from "./ARCameraDiagnosticsPanel";
import { isArCameraDebugEnabled } from "./arDebug";
import { attachArCameraDiagnostics } from "./arCameraDiagnostics";

/**
 * Camera AR slice: absolute stage inside the single portaled viewport shell.
 * Clean baseline HUD — no Lens selector or world annotations in this milestone.
 */
export default function ARCameraView({ onBack, onFallback }) {
  const [tracking, setTracking] = useState("searching"); // searching | detected | lost
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);
  const diagnosticsCleanupRef = useRef(null);

  // Read on every render so search/hash/latch stay in sync without an effect.
  const cameraDebugEnabled = isArCameraDebugEnabled();

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
    if (!isArCameraDebugEnabled()) return;

    diagnosticsCleanupRef.current?.();
    diagnosticsCleanupRef.current = attachArCameraDiagnostics({
      video,
      container,
      onSnapshot: setCameraSnapshot,
      logInitial: true,
      forceEnabled: true,
    });
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

      {cameraDebugEnabled && (
        <ARCameraDiagnosticsPanel snapshot={cameraSnapshot} waiting={!cameraSnapshot} />
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
