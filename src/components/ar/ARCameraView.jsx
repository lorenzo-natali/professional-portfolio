import { useState } from "react";
import ARTrackingScene from "./ARTrackingScene";

/**
 * Full-screen camera AR stage inside the portaled viewport shell.
 * Overlays only: CV-detected status (top) and Close (bottom).
 */
export default function ARCameraView({ onBack, onFallback }) {
  const [detected, setDetected] = useState(false);

  return (
    <div data-ar-camera-stage="true" className="ar-camera-stage text-slate-100">
      <ARTrackingScene
        active
        onReady={() => {}}
        onTargetFound={() => setDetected(true)}
        onTargetLost={() => setDetected(false)}
        onError={() => onFallback("tracking-error")}
        onUnsupported={(reason) =>
          onFallback(reason === "target-unavailable" ? "target-unavailable" : "unsupported")
        }
      />

      {detected && (
        <div
          data-ar-status-overlay="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-[max(0.65rem,env(safe-area-inset-top))]"
        >
          <p className="ar-status-chip text-center text-[11px] font-medium tracking-[0.14em] text-slate-50">
            CV detected
          </p>
        </div>
      )}

      <div
        data-ar-close-overlay="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto ar-close-chip px-4 py-2 text-xs font-medium text-slate-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
