import { INTERPRETATION_DIMENSIONS, INTERPRETATION_STATES } from "./arConfig";

/**
 * Restrained interpretation dashboard — states only, never scores.
 * @param {{ levels: Record<string, number>, reducedMotion?: boolean }} props
 * levels: 0 hidden … 4 Interpreted (index into INTERPRETATION_STATES + 1)
 */
export default function InterpretationDashboard({ levels }) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2.5 backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
        Interpretation
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {INTERPRETATION_DIMENSIONS.map((dimension) => {
          const level = levels[dimension] ?? 0;
          const state = level > 0 ? INTERPRETATION_STATES[Math.min(level, 4) - 1] : "—";
          return (
            <li key={dimension} className="rounded-md border border-slate-800/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-200">{dimension}</p>
              <p className={`mt-0.5 text-[11px] ${level > 0 ? "text-cyan-300/90" : "text-slate-600"}`}>{state}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
