import { ArrowRight } from "lucide-react";
import beyondCvQr from "../assets/beyond-cv-qr.png";
import { trackPortfolioEvent } from "./analytics/createPortfolioAnalytics.js";
import { BEYOND_CV_COPY, BEYOND_CV_LINKEDIN_URL } from "./beyondCvEasterEgg.js";

/**
 * Dedicated Beyond the CV experience inside the assistant transcript.
 * Accept, dismiss, launch, and the CV request do not call the assistant API.
 *
 * @param {{
 *   lang: "en" | "it",
 *   state: "offered" | "unlocked",
 *   mobile: boolean,
 *   entrance?: boolean,
 *   onAccept: () => void,
 *   onDismiss: () => void,
 *   onLaunch: () => void,
 * }} props
 */
export function BeyondCvEasterEggCard({
  lang,
  state,
  mobile,
  entrance = false,
  onAccept,
  onDismiss,
  onLaunch,
}) {
  const copy = BEYOND_CV_COPY[lang] || BEYOND_CV_COPY.en;

  return (
    <section
      data-beyond-cv-easter-egg={state}
      aria-label={state === "offered" ? "BEYOND THE CV" : mobile ? copy.launch : "Beyond the CV QR code"}
      className={`beyond-cv-card mt-4 w-full px-4 py-4 ${entrance ? "beyond-cv-card-enter" : ""}`}
    >
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase leading-none tracking-[0.2em] text-cyan-300">
        <BeyondCvMark />
        BEYOND THE CV
      </p>

      {state === "offered" ? (
        <>
          <p className="pt-3 text-sm leading-6 text-[#f5f2ea]">{copy.invite}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onAccept} className="beyond-cv-primary">
              {copy.accept}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-300"
            >
              {copy.dismiss}
            </button>
          </div>
        </>
      ) : mobile ? (
        <>
          <p className="pt-3 text-sm leading-6 text-[#f5f2ea]">
            <RequestCopy text={copy.unlocked} linkLabel={copy.requestLink} />
          </p>
          <button type="button" onClick={onLaunch} className="beyond-cv-primary mt-3">
            {copy.launch}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <p className="pt-3 text-sm leading-6 text-[#f5f2ea]">
            <RequestCopy text={copy.qr} linkLabel={copy.requestLink} />
          </p>
          <div
            className="mt-3 inline-block max-w-full rounded-md p-3"
            style={{ background: "#f5f2ea" }}
          >
            <img
              src={beyondCvQr}
              alt={copy.qrAlt}
              width={180}
              height={180}
              className="block aspect-square h-auto w-[180px] max-w-full"
            />
          </div>
        </>
      )}
    </section>
  );
}

/**
 * @param {{ text: string, linkLabel: string }} props
 */
function RequestCopy({ text, linkLabel }) {
  const index = text.indexOf(linkLabel);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <a
        href={BEYOND_CV_LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackPortfolioEvent("outbound_click", { target: "linkedin" })}
        className="font-medium text-[#d5dde8] underline decoration-slate-500 underline-offset-4 hover:text-[#f5f2ea] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-300"
      >
        {linkLabel}
      </a>
      {text.slice(index + linkLabel.length)}
    </>
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
