import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ARTrackingScene from "./ARTrackingScene";
import GovernanceModel from "./GovernanceModel";
import ProfessionalTrajectory from "./ProfessionalTrajectory";
import ContextualCallouts from "./ContextualCallouts";
import InterpretationDashboard from "./InterpretationDashboard";
import ARActionBar from "./ARActionBar";
import ARAboutPanel from "./ARAboutPanel";
import { AR_SEQUENCE_MS, INTERPRETATION_DIMENSIONS } from "./arConfig";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

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

const finalLevels = Object.fromEntries(INTERPRETATION_DIMENSIONS.map((d) => [d, 4]));

export default function ARCameraView({ onBack, onExploreProjects, onFallback }) {
  const reducedMotion = usePrefersReducedMotion();
  const [tracking, setTracking] = useState("searching"); // searching | detected | lost | ready
  const [sequenceStep, setSequenceStep] = useState(0);
  const [showDocumentBanner, setShowDocumentBanner] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [levels, setLevels] = useState(
    Object.fromEntries(INTERPRETATION_DIMENSIONS.map((d) => [d, 0])),
  );
  const [hasStartedSequence, setHasStartedSequence] = useState(false);

  const modelPhase = useMemo(() => {
    if (reducedMotion || sequenceComplete) return 5;
    if (sequenceStep >= 5) return 5;
    return sequenceStep;
  }, [reducedMotion, sequenceComplete, sequenceStep]);

  useEffect(() => {
    if (!hasStartedSequence) return undefined;

    const timers = [];
    const schedule = (ms, fn) => {
      timers.push(window.setTimeout(fn, ms));
    };

    if (reducedMotion) {
      schedule(0, () => {
        setLevels(finalLevels);
        setSequenceComplete(true);
        setSequenceStep(5);
        setTracking("ready");
      });
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    let elapsed = 0;
    const after = (ms, fn) => {
      elapsed += ms;
      schedule(elapsed, fn);
    };

    schedule(0, () => setShowDocumentBanner(true));
    after(AR_SEQUENCE_MS.documentRecognized, () => {
      setShowDocumentBanner(false);
      setSequenceStep(1);
      setLevels((prev) => ({ ...prev, Risk: 1, Controls: 1, Technology: 1, Governance: 1 }));
    });
    after(AR_SEQUENCE_MS.riskNode, () => {
      setSequenceStep(1);
      setLevels((prev) => ({ ...prev, Risk: 2 }));
    });
    after(AR_SEQUENCE_MS.controlsNode, () => {
      setSequenceStep(2);
      setLevels((prev) => ({ ...prev, Controls: 2 }));
    });
    after(AR_SEQUENCE_MS.technologyNode, () => {
      setSequenceStep(3);
      setLevels((prev) => ({ ...prev, Technology: 2 }));
    });
    after(AR_SEQUENCE_MS.connections, () => {
      setSequenceStep(4);
      setLevels((prev) => ({
        ...prev,
        Risk: 3,
        Controls: 3,
        Technology: 3,
        Governance: 2,
      }));
    });
    after(AR_SEQUENCE_MS.governance, () => {
      setSequenceStep(5);
      setLevels((prev) => ({ ...prev, Governance: 3 }));
    });
    after(AR_SEQUENCE_MS.trajectory, () => {
      setSequenceStep(6);
      setLevels((prev) => ({
        ...prev,
        Risk: 4,
        Controls: 4,
        Technology: 4,
        Governance: 3,
      }));
    });
    after(AR_SEQUENCE_MS.callouts, () => {
      setSequenceStep(7);
    });
    after(AR_SEQUENCE_MS.finalStatus, () => {
      setLevels(finalLevels);
      setSequenceComplete(true);
      setTracking("ready");
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [hasStartedSequence, reducedMotion]);

  const handleTargetFound = () => {
    setTracking((current) => {
      if (current === "lost" && (sequenceComplete || hasStartedSequence)) return "ready";
      return "detected";
    });
    if (!hasStartedSequence) {
      setHasStartedSequence(true);
    }
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
        : null;

  return (
    <div className="relative h-full min-h-0 bg-black text-slate-100">
      <ARTrackingScene
        active
        onReady={() => setTracking((t) => (t === "searching" ? "searching" : t))}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
        onError={() => onFallback("tracking-error")}
        onUnsupported={() => onFallback("unsupported")}
      />

      {(tracking === "searching" || tracking === "detected") && <CornerBrackets />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4">
        <AnimatePresence mode="wait">
          {statusLabel && (
            <motion.div
              key={statusLabel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md rounded-lg border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-center backdrop-blur"
            >
              <p className="text-xs font-medium tracking-[0.14em] text-slate-100">{statusLabel}</p>
              {statusDetail && <p className="mt-1 text-[11px] leading-5 text-slate-400">{statusDetail}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(hasStartedSequence || reducedMotion) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 max-h-[72%] overflow-y-auto px-3 pb-24 pt-2">
          <div className="mx-auto flex w-full max-w-md flex-col gap-2">
            {showDocumentBanner && !reducedMotion && (
              <div className="rounded-lg border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-center backdrop-blur">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/90">
                  Document recognized
                </p>
                <p className="mt-1 text-[11px] text-slate-300">Professional profile structure identified</p>
              </div>
            )}

            <InterpretationDashboard levels={levels} />

            {(sequenceStep >= 1 || sequenceComplete || reducedMotion) && (
              <GovernanceModel phase={modelPhase} reducedMotion={reducedMotion} />
            )}

            {(sequenceStep >= 6 || sequenceComplete || reducedMotion) && (
              <ProfessionalTrajectory visible reducedMotion={reducedMotion} />
            )}

            {(sequenceStep >= 7 || sequenceComplete || reducedMotion) && (
              <ContextualCallouts visible reducedMotion={reducedMotion} />
            )}

            {(sequenceComplete || reducedMotion) && (
              <p className="rounded-lg border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
                Governance view ready
              </p>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent px-3 pb-4 pt-8">
        <ARActionBar
          onBack={onBack}
          onExploreProjects={onExploreProjects}
          onOpenAbout={() => setAboutOpen(true)}
        />
      </div>

      <ARAboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
