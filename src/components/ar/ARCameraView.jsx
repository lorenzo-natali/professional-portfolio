import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ARTrackingScene from "./ARTrackingScene";
import ARAboutPanel from "./ARAboutPanel";
import { bindArViewportListeners, syncArViewportShell } from "./arViewport";

function CornerBrackets() {
  const corner = "absolute h-6 w-6 border-cyan-300/60";
  return (
    <div className="pointer-events-none absolute inset-[12%] sm:inset-[18%]" aria-hidden="true">
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

/**
 * Camera AR slice: full-viewport live feed + calibrated document-plane proof frame.
 */
export default function ARCameraView({ onBack, onFallback }) {
  const shellRef = useRef(null);
  const [tracking, setTracking] = useState("searching"); // searching | detected | lost
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const sync = () => syncArViewportShell(shell);
    sync();
    return bindArViewportListeners(sync);
  }, []);

  const handleTargetFound = () => {
    setTracking("detected");
  };

  const handleTargetLost = () => {
    setTracking((current) => (current === "searching" ? current : "lost"));
  };

  const statusLabel =
    tracking === "searching"
      ? "Searching for CV…"
      : tracking === "detected"
        ? "CV detected"
        : tracking === "lost"
          ? "Tracking paused"
          : null;

  const statusDetail =
    tracking === "searching"
      ? "Point the camera at the first page and keep the full document visible."
      : tracking === "lost"
        ? "Reframe the first page to continue."
        : tracking === "detected"
          ? "Document frame is anchored to the CV."
          : null;

  return (
    <div
      ref={shellRef}
      data-ar-camera-shell="true"
      className="ar-camera-shell text-slate-100"
    >
      <ARTrackingScene
        active
        onReady={() => setTracking((t) => (t === "searching" ? "searching" : t))}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
        onError={() => onFallback("tracking-error")}
        onUnsupported={(reason) =>
          onFallback(reason === "target-unavailable" ? "target-unavailable" : "unsupported")
        }
      />

      {(tracking === "searching" || tracking === "detected") && <CornerBrackets />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          {statusLabel && (
            <motion.div
              key={statusLabel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-center backdrop-blur"
            >
              <p className="text-xs font-medium tracking-[0.14em] text-slate-100">{statusLabel}</p>
              {statusDetail && <p className="mt-1 text-[11px] leading-5 text-slate-400">{statusDetail}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-400"
          >
            Back to Portfolio
          </button>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="rounded-md border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
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
