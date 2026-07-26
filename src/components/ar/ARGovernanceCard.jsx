/**
 * Exact AR-view glyph from src/assets/ar-view-icon.svg.
 * Filled paths inherit the button cyan through currentColor.
 */
function ArEntryIcon() {
  return (
    <span className="ar-reticle-anchor" aria-hidden="true">
      <svg
        className="ar-reticle-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -0.08 20 20"
        width="100%"
        height="100%"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.26,1.92H6.74a1.9,1.9,0,0,0-1.9,1.89V16a1.9,1.9,0,0,0,1.9,1.89h6.52A1.9,1.9,0,0,0,15.16,16V3.81A1.9,1.9,0,0,0,13.26,1.92ZM14.41,16a1.15,1.15,0,0,1-1.15,1.14H6.74A1.15,1.15,0,0,1,5.59,16V3.81A1.15,1.15,0,0,1,6.74,2.67h.75a.61.61,0,0,0,.61.62h3.8a.61.61,0,0,0,.61-.62h.75a1.15,1.15,0,0,1,1.15,1.14Z" />
        <path d="M11.12,15.74H8.88a.38.38,0,0,0,0,.75h2.24a.38.38,0,1,0,0-.75Z" />
        <path d="M9.05,10.9l.41.9A.38.38,0,0,0,10,12a.37.37,0,0,0,.18-.5L8.66,8.23A.39.39,0,0,0,8.31,8h0A.37.37,0,0,0,8,8.24L6.5,11.51a.39.39,0,0,0,.19.5l.15,0a.38.38,0,0,0,.35-.22l.41-.92ZM8.32,9.3l.38.85H7.94Z" />
        <path d="M13.65,9.36a1.48,1.48,0,0,0-1.48-1.48H10.8a.37.37,0,0,0-.37.38s0,.05,0,.08v3.3a.37.37,0,0,0,.37.37.38.38,0,0,0,.38-.37v-.8h1.08l.7,1a.4.4,0,0,0,.31.16.36.36,0,0,0,.22-.07.37.37,0,0,0,.09-.52L13,10.58A1.46,1.46,0,0,0,13.65,9.36Zm-2.46-.73h1a.73.73,0,0,1,0,1.46h-1Z" />
      </svg>
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
