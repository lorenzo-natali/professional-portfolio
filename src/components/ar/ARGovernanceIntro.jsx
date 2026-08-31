import { useEffect, useState } from "react";
import { recordArExitTrace } from "./createArExitTrace";

/**
 * Lightweight transition before launching AR.
 * Camera permission is never requested here — only after “Activate Camera”.
 * Parent mounts this only after .mind target availability is already known
 * so the first paint never shows a Back-only intermediate layout.
 *
 * @param {{
 *   onActivateCamera: () => void,
 *   onBack: () => void,
 *   previousExitReason?: string | null,
 *   targetAvailable: boolean,
 * }} props
 */
export default function ARGovernanceIntro({
  onActivateCamera,
  onBack,
  previousExitReason = null,
  targetAvailable,
}) {
  useEffect(() => {
    return () => {
      recordArExitTrace(
        "componentUnmount",
        { component: "ARGovernanceIntro" },
        { asReason: false },
      );
    };
  }, []);

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-5 py-8 text-slate-100">
      <div
        className="w-full max-w-md rounded-xl border border-cyan-400/75 bg-slate-950/90 px-7 py-8 shadow-xl sm:px-8 sm:py-10"
        style={{
          boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
        }}
      >
        <h2 className="text-center text-xl font-semibold tracking-[0.14em] text-slate-50 uppercase">
          Beyond the CV
        </h2>

        <p className="mx-auto mt-6 max-w-sm text-center text-sm leading-6 text-slate-300">
          Point your camera at the first page of my CV to unlock an interactive experience.
        </p>

        <p className="mx-auto mt-4 max-w-xs text-center text-[11px] leading-5 text-slate-500">
          Camera processing happens entirely on your device.
        </p>

        {previousExitReason ? (
          <p
            data-ar-exit-trace-banner="true"
            className="mx-auto mt-5 max-w-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-[11px] leading-5 text-amber-100"
            role="status"
          >
            Previous camera session ended: {previousExitReason}
          </p>
        ) : null}

        {targetAvailable ? (
          <button
            type="button"
            onClick={onActivateCamera}
            className="mt-8 w-full rounded-md border border-cyan-400/75 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 outline-none transition-[border-color,box-shadow] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
            style={{
              boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
            }}
          >
            Activate Camera
          </button>
        ) : (
          <p className="mt-8 text-center text-[11px] leading-5 text-slate-500">
            The AR recognition experience is not currently available on this device.
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full rounded-md border border-cyan-400/75 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 outline-none transition-[border-color,box-shadow] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
          style={{
            boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
          }}
        >
          Back to Portfolio
        </button>
      </div>
    </div>
  );
}
