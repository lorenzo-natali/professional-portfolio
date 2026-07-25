import { listLensSelectorItems, DEFAULT_LENS_ID } from "./lensCatalog";

/**
 * Viewport-fixed Lens selector HUD.
 * AR annotations stay on the MindAR anchor — this control is DOM-only.
 */
export default function ARLensSelector({
  activeLensId = DEFAULT_LENS_ID,
  onSelectLens,
  visible = true,
}) {
  if (!visible) return null;

  const items = listLensSelectorItems();

  return (
    <div
      data-ar-lens-selector="true"
      className="pointer-events-auto mb-2 flex justify-center"
      role="toolbar"
      aria-label="AR Lens selector"
    >
      <div className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-slate-700/80 bg-slate-950/75 p-0.5 backdrop-blur-[2px]">
        {items.map((lens) => {
          const isActive = lens.id === activeLensId && lens.enabled;
          const upcoming = !lens.enabled;
          return (
            <button
              key={lens.id}
              type="button"
              disabled={upcoming}
              aria-pressed={isActive}
              aria-disabled={upcoming || undefined}
              title={upcoming ? `${lens.label} — upcoming` : `${lens.label} Lens`}
              onClick={() => {
                if (!lens.enabled) return;
                onSelectLens?.(lens.id);
              }}
              className={[
                "rounded px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950",
                upcoming
                  ? "cursor-not-allowed text-slate-500"
                  : isActive
                    ? "text-slate-50"
                    : "text-slate-300 hover:text-slate-100",
              ].join(" ")}
              style={
                isActive
                  ? {
                      backgroundColor: `${lens.accent}33`,
                      boxShadow: `inset 0 0 0 1px ${lens.accent}99`,
                      color: "#f8fafc",
                    }
                  : upcoming
                    ? { opacity: 0.55 }
                    : undefined
              }
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ backgroundColor: lens.accent, opacity: upcoming ? 0.45 : 0.95 }}
                  aria-hidden="true"
                />
                {lens.label}
                {upcoming && <span className="sr-only"> (upcoming)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
