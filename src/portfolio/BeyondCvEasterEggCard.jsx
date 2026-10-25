import { ArrowRight } from "lucide-react";
import beyondCvQr from "../assets/beyond-cv-qr.png";
import { BEYOND_CV_COPY, BEYOND_CV_DESTINATION } from "./beyondCvEasterEgg.js";

/**
 * Compact invitation under one assistant answer.
 * Accept and dismiss do not call the assistant API.
 *
 * @param {{
 *   lang: "en" | "it",
 *   state: "offered" | "unlocked",
 *   mobile: boolean,
 *   onAccept: () => void,
 *   onDismiss: () => void,
 *   onLaunch: () => void,
 * }} props
 */
export function BeyondCvEasterEggCard({
  lang,
  state,
  mobile,
  onAccept,
  onDismiss,
  onLaunch,
}) {
  const copy = BEYOND_CV_COPY[lang] || BEYOND_CV_COPY.en;
  const titleId = "beyond-cv-easter-egg-title";

  return (
    <section
      data-beyond-cv-easter-egg={state}
      aria-labelledby={state === "offered" ? titleId : undefined}
      aria-label={state === "offered" ? undefined : mobile ? copy.launch : "Beyond CV QR code"}
      className="mt-2 w-full max-w-[min(85%,22rem)] rounded-lg border px-3 py-3"
      style={{
        background: "var(--assistant-surface)",
        borderColor: "rgba(214, 180, 106, 0.45)",
      }}
    >
      {state === "offered" ? (
        <>
          <h3 id={titleId} className="assistant-text text-sm font-medium leading-6">
            {copy.title}
          </h3>
          <p className="assistant-muted pt-2 text-sm leading-6">{copy.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="assistant-cta inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none"
            >
              {copy.accept}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="assistant-muted rounded-lg px-3 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--assistant-accent)]"
            >
              {copy.dismiss}
            </button>
          </div>
        </>
      ) : mobile ? (
        <>
          <p className="assistant-text text-sm leading-6">{copy.launchText}</p>
          <button
            type="button"
            onClick={onLaunch}
            className="assistant-cta mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none"
          >
            {copy.launch}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <p className="assistant-text text-sm leading-6">{copy.qr}</p>
          <div
            className="mt-3 inline-block max-w-full rounded-md p-3"
            style={{ background: "#f5f2ea" }}
          >
            <img
              src={beyondCvQr}
              alt={copy.qrAlt}
              width={200}
              height={200}
              className="block aspect-square h-auto w-[200px] max-w-full"
            />
          </div>
          <p className="assistant-muted pt-2 break-all text-xs leading-5">{BEYOND_CV_DESTINATION}</p>
        </>
      )}
    </section>
  );
}
