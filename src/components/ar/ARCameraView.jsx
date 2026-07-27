import { useEffect, useRef, useState } from "react";
import ARTrackingScene from "./ARTrackingScene";
import {
  AR_STATUS_COPY,
  createArStatusOnboarding,
} from "./arStatusOnboarding";

/**
 * Full-screen camera AR stage inside the portaled viewport shell.
 * Overlays only: top status onboarding + Close (bottom).
 */
export default function ARCameraView({ onBack, onFallback }) {
  const onboardingRef = useRef(null);
  /** @type {[import("./arStatusOnboarding").ArStatusPhase, Function]} */
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const onboarding = createArStatusOnboarding();
    onboardingRef.current = onboarding;
    const unsubscribe = onboarding.subscribe(setPhase);
    return () => {
      unsubscribe();
      onboarding.dispose();
      onboardingRef.current = null;
    };
  }, []);

  const showStatus = phase === "detected" || phase === "prompt";

  return (
    <div data-ar-camera-stage="true" className="ar-camera-stage text-slate-100">
      <ARTrackingScene
        active
        onReady={() => {}}
        onTargetFound={() => onboardingRef.current?.onTargetFound()}
        onTargetLost={() => onboardingRef.current?.onTargetLost()}
        onInterestOpen={() => onboardingRef.current?.onInterestInteract()}
        onError={() => onFallback("tracking-error")}
        onUnsupported={(reason) =>
          onFallback(reason === "target-unavailable" ? "target-unavailable" : "unsupported")
        }
      />

      <div data-ar-ui-overlay="true" className="pointer-events-none absolute inset-0 z-20">
        {showStatus && (
          <div
            data-ar-status-overlay="true"
            data-ar-status-phase={phase}
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-4 pt-[max(0.65rem,env(safe-area-inset-top))]"
          >
            {phase === "detected" ? (
              <p
                role="status"
                aria-live="polite"
                className="ar-status-chip ar-status-fade text-center text-[11px] font-medium tracking-[0.14em] text-slate-50"
              >
                {AR_STATUS_COPY.detected}
              </p>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="ar-status-prompt ar-status-fade"
              >
                <p className="ar-status-prompt__title">{AR_STATUS_COPY.promptTitle}</p>
                <p className="ar-status-prompt__hint">{AR_STATUS_COPY.promptHint}</p>
              </div>
            )}
          </div>
        )}

        <div
          data-ar-close-overlay="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
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
    </div>
  );
}
