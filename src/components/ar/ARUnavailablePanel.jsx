/**
 * Minimal notice when the camera AR path cannot continue.
 * Replaces the retired 2D Governance Brief.
 */
export default function ARUnavailablePanel({ title = "Camera experience unavailable", message, onClose }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-5 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/90 p-6 text-center shadow-xl">
        <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
        {message && <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-300">{message}</p>}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
