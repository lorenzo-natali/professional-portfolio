export default function ARDesktopGate({ onClose }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-950/95 px-5 py-8 text-slate-100">
      <div
        className="w-full max-w-md rounded-xl border border-cyan-400/75 bg-slate-950 p-6 text-center shadow-xl"
        style={{
          boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
        }}
      >
        <h2 className="text-xl font-semibold text-slate-50">Designed for smartphones.</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-300">
          Open this portfolio on your phone and launch the experience while viewing the printed or displayed CV.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-cyan-400/75 bg-transparent px-5 py-2.5 text-sm font-medium text-cyan-300 outline-none transition-[border-color,box-shadow] hover:border-cyan-300 hover:text-cyan-200 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
            style={{
              boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
