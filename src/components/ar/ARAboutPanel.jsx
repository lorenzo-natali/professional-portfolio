import { aboutPoints } from "./arContent";

export default function ARAboutPanel({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-4 top-16 z-30 mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-950/95 p-5 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">About this experience</p>
          <h3 className="mt-2 text-base font-semibold text-slate-50">AR Governance View</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          Close
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        AR Governance View is a browser-based, privacy-conscious interactive layer for the CV.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
        {aboutPoints.map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
