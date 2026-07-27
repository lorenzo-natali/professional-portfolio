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
    <div className="flex h-full items-center justify-center bg-slate-950 px-5 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/90 px-7 py-8 shadow-xl sm:px-8 sm:py-10">
        <h2 className="text-center text-xl font-semibold tracking-[0.14em] text-slate-50 uppercase">
          Beyond the CV
        </h2>

        <p className="mx-auto mt-6 max-w-sm text-center text-sm leading-6 text-slate-200">
          Discover a few of the interests behind the CV.
        </p>

        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-400">
          Point your camera at the first page of the printed or displayed CV.
        </p>

        <p className="mx-auto mt-4 max-w-xs text-center text-[11px] leading-5 text-slate-500">
          Camera processing happens entirely on your device.
        </p>

        {targetState === "available" && (
          <button
            type="button"
            onClick={onActivateCamera}
            className="mt-8 w-full rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100"
          >
            Activate Camera
          </button>
        )}

        {targetState === "unavailable" && (
          <p className="mt-8 text-center text-[11px] leading-5 text-slate-500">
            The AR recognition experience is not currently available on this device.
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className={`${
            targetState === "checking" ? "mt-8" : "mt-3"
          } w-full rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300`}
        >
          Back to Portfolio
        </button>
      </div>
    </div>
  );
}
