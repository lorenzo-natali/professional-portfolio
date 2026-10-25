import { useEffect } from "react";
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
 *   returnToChat?: boolean,
 * }} props
 */
export default function ARGovernanceIntro({
  onActivateCamera,
  onBack,
  previousExitReason = null,
  targetAvailable,
  returnToChat = false,
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

  const backLabel = returnToChat ? "Back to Chat" : "Back to Portfolio";

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-4 py-6 text-[#f5f2ea]">
      <div className="beyond-cv-card w-full max-w-md px-4 py-4">
        <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase leading-none tracking-[0.2em] text-cyan-300">
          <BeyondCvMark />
          BEYOND THE CV
        </h2>

        <p className="pt-3 text-sm leading-6 text-[#f5f2ea]">
          Your next discovery begins with the first page of my CV. Point your camera at it to bring the experience to life.
        </p>

        <p className="pt-2 text-[11px] leading-5 text-slate-400">
          Camera processing happens entirely on your device.
        </p>

        {previousExitReason ? (
          <p
            data-ar-exit-trace-banner="true"
            className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100"
            role="status"
          >
            Previous camera session ended: {previousExitReason}
          </p>
        ) : null}

        {targetAvailable ? (
          <button
            type="button"
            onClick={onActivateCamera}
            className="beyond-cv-primary mt-4 w-full"
          >
            Activate Camera
          </button>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-400">
            The AR recognition experience is not currently available on this device.
          </p>
        )}

        <button type="button" onClick={onBack} className="beyond-cv-secondary mt-2 w-full">
          {backLabel}
        </button>
      </div>
    </div>
  );
}

function BeyondCvMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M3 6V4.2A1.2 1.2 0 0 1 4.2 3H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 3h1.8A1.2 1.2 0 0 1 13 4.2V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 10v1.8a1.2 1.2 0 0 1-1.2 1.2H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 13H4.2A1.2 1.2 0 0 1 3 11.8V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.05" fill="currentColor" />
    </svg>
  );
}
