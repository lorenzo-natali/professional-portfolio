import GovernanceModel from "./GovernanceModel";
import ProfessionalTrajectory from "./ProfessionalTrajectory";
import ContextualCallouts from "./ContextualCallouts";
import InterpretationDashboard from "./InterpretationDashboard";
import { INTERPRETATION_DIMENSIONS } from "./arConfig";

const finalLevels = Object.fromEntries(INTERPRETATION_DIMENSIONS.map((d) => [d, 4]));

export default function GovernanceBriefFallback({
  title = "2D Governance Brief",
  message,
  onBack,
  onExploreProjects,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <header className="shrink-0 border-b border-slate-800 px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">AR Governance View</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-50">{title}</h2>
        {message && <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <InterpretationDashboard levels={finalLevels} />
        <GovernanceModel phase={5} reducedMotion />
        <ProfessionalTrajectory visible reducedMotion />
        <ContextualCallouts visible reducedMotion />
        <p className="rounded-lg border border-slate-800 px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-300">
          Governance view ready
        </p>
      </div>

      <footer className="shrink-0 border-t border-slate-800 px-4 py-3">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100"
          >
            Back to Portfolio
          </button>
          <button
            type="button"
            onClick={onExploreProjects}
            className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100"
          >
            Explore Projects
          </button>
        </div>
      </footer>
    </div>
  );
}
