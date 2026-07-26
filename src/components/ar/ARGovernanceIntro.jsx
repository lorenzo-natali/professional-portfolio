import { useEffect, useState } from "react";
import { checkArTargetAvailable } from "./checkArTargetAvailable";

/**
 * Lightweight transition before launching AR.
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
    <div className="flex h-full items-center justify-center bg-slate-950 px-5 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/90 px-7 py-10 shadow-xl sm:px-8 sm:py-12">
        <h2 className="text-center text-xl font-semibold tracking-[0.14em] text-slate-50 uppercase">
          Beyond the CV
        </h2>

        <p className="mx-auto mt-8 max-w-sm text-center text-sm leading-7 text-slate-300">
          Point your camera at the first page of the printed or displayed CV.
        </p>

        <p className="mx-auto mt-5 max-w-xs text-center text-[11px] leading-5 text-slate-500">
          Camera processing happens entirely on your device.
        </p>

        {targetState === "available" && (
          <button
            type="button"
            onClick={onActivateCamera}
            className="mt-10 w-full rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100"
          >
            Activate Camera
          </button>
        )}

        {targetState === "unavailable" && (
          <p className="mt-10 text-center text-[11px] leading-5 text-slate-500">
            The AR recognition experience is not currently available on this device.
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className={`${
            targetState === "checking" ? "mt-10" : "mt-3"
          } w-full rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300`}
        >
          Back to Portfolio
        </button>
      </div>
    </div>
  );
}
