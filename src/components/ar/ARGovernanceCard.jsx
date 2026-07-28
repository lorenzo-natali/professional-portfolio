import beyondArPlusLogo from "../../assets/beyond-ar-plus-logo.png";

/**
 * Beyond the CV entry mark — AR+ logo tinted via currentColor (mask).
 */
function ArEntryIcon() {
  return (
    <span className="ar-reticle-anchor" aria-hidden="true">
      <span
        className="ar-reticle-mark"
        style={{
          WebkitMaskImage: `url(${beyondArPlusLogo})`,
          maskImage: `url(${beyondArPlusLogo})`,
        }}
      />
    </span>
  );
}

export default function ARGovernanceCard({ onLaunch }) {
  return (
    <button
      type="button"
      onClick={onLaunch}
      aria-label="Beyond the CV"
      className="ar-lens-button group relative flex w-full items-center justify-between rounded-full border border-cyan-400/75 bg-transparent px-5 py-3 text-cyan-300 outline-none transition-[border-color,box-shadow] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
      style={{
        boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
      }}
    >
      <ArEntryIcon />

      <span className="absolute inset-x-0 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-cyan-300">
        Beyond the CV
      </span>

      <span
        className="relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center text-cyan-300/90 transition-transform duration-200 group-hover:translate-x-[3px] group-focus-visible:translate-x-[3px] group-hover:text-cyan-200 group-focus-visible:text-cyan-200"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path
            d="M6 3.5 10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
