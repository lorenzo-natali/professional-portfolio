import { useEffect, useState } from "react";
import { checkArTargetAvailable } from "./checkArTargetAvailable";

/**
 * Mobile entry screen. Primary CTA is chosen only after the .mind target probe.
 * Camera permission is never requested here — only after “Activate Camera”.
 */
export default function ARGovernanceIntro({ onActivateCamera, onBack }) {
  const [targetState, setTargetState] = useState("checking"); // checking | available | unavailable

  useEffect(() => {
    let cancelled = false;

    checkArTargetAvailable().then((available) => {
      if (!cancelled) setTargetState(available ? "available" : "unavailable");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-5 py-8 text-slate-100">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">AR Governance View</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-50">AR Governance View</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          This experience adds an interactive governance layer to the CV.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">Point your camera at the first page of the CV to reveal:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" aria-hidden="true" />
            the professional trajectory
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" aria-hidden="true" />
            the relationship between risk, controls, technology and governance
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" aria-hidden="true" />
            contextual insights linked to experience, projects and professional development
          </li>
        </ul>

        {targetState === "available" && (
          <button
            type="button"
            onClick={onActivateCamera}
            className="mt-6 w-full rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100"
          >
            Activate Camera
          </button>
        )}

        {targetState === "unavailable" && (
          <p className="mt-6 text-center text-[11px] leading-5 text-slate-500">
            The AR recognition experience is not currently available on this device.
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className={`${targetState === "checking" ? "mt-6" : "mt-2"} w-full rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300`}
        >
          Back to portfolio
        </button>
        <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
          Camera processing occurs locally in the browser. No images or video are uploaded or stored.
        </p>
      </div>
    </div>
  );
}
