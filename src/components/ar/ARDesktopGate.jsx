export default function ARDesktopGate({ onViewBrief, onClose }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-950/95 px-5 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">AR Governance View</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-50">Designed for smartphones.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Open this portfolio on your phone and launch the experience while viewing the printed or displayed CV.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onViewBrief}
            className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100"
          >
            View 2D Governance Brief
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
