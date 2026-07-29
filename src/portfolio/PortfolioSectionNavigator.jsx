import { useEffect, useId, useRef, useState } from "react";
import { List } from "lucide-react";
import { getVisibleMacroSections } from "./macroSectionRegistry.js";

export const PORTFOLIO_SECTION_NAVIGATOR_PANEL_ID =
  "portfolio-section-navigator-panel";

/**
 * @param {Pick<MediaQueryList, "matches"> | null | undefined} [media]
 * @returns {boolean}
 */
export function prefersReducedMotion(
  media = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)")
    : null
) {
  return Boolean(media?.matches);
}

/**
 * Scroll to a macro registry target. No history mutation, no flash, no rAF.
 *
 * @param {string} scrollTargetId
 * @param {{
 *   reducedMotion?: boolean,
 *   getElement?: (id: string) => Element | null,
 * }} [options]
 * @returns {boolean}
 */
export function scrollToMacroSection(scrollTargetId, options = {}) {
  if (!scrollTargetId) return false;
  const getElement =
    options.getElement ?? ((id) => document.getElementById(id));
  const element = getElement(scrollTargetId);
  if (!element || typeof element.scrollIntoView !== "function") return false;

  const reducedMotion =
    options.reducedMotion ?? prefersReducedMotion();

  element.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
  return true;
}

/** Accessible suffix for Role Lens participation (not ranking). */
export const MACRO_LENS_RELEVANT_LABEL =
  "Contains content relevant to the selected role lens";

/**
 * Floating section index with current-location and optional Role Lens
 * participation markers (Phases 3–4). Relevance is a read-only derived prop.
 *
 * @param {{
 *   activeMacroKey?: string,
 *   onActiveMacroSelect?: (macroKey: string) => void,
 *   macroLensRelevance?: Readonly<Record<string, boolean>>,
 * }} [props]
 */
export default function PortfolioSectionNavigator({
  activeMacroKey = "profile",
  onActiveMacroSelect,
  macroLensRelevance = null,
} = {}) {
  const macros = getVisibleMacroSections();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const reactId = useId();
  const panelId = `${PORTFOLIO_SECTION_NAVIGATOR_PANEL_ID}-${reactId}`;

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const closePanel = () => setOpen(false);

  const onSelectMacro = (macro) => {
    onActiveMacroSelect?.(macro.key);
    scrollToMacroSection(macro.scrollTargetId);
    closePanel();
    triggerRef.current?.focus();
  };

  return (
    <div
      data-portfolio-navigator
      className="pointer-events-none fixed z-40 flex flex-col items-end gap-2 end-3 bottom-[max(0.85rem,env(safe-area-inset-bottom))] sm:end-5"
    >
      <nav
        id={panelId}
        hidden={!open}
        aria-label="Portfolio sections"
        className="pointer-events-auto w-52 rounded-md border border-cyan-400/35 bg-slate-950 p-2 text-slate-100 shadow-none"
      >
        <p className="px-2 pb-1.5 pt-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
          Sections
        </p>
        <ul className="flex flex-col gap-1">
          {macros.map((macro) => {
            const isCurrent = activeMacroKey === macro.key;
            const isRelevant = Boolean(macroLensRelevance?.[macro.key]);
            return (
              <li key={macro.key}>
                <button
                  type="button"
                  aria-current={isCurrent ? "location" : undefined}
                  data-macro-current={isCurrent ? "true" : undefined}
                  data-macro-lens-relevant={isRelevant ? "true" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm outline-none transition-[border-color,background-color,color] focus-visible:ring-2 focus-visible:ring-cyan-400/35 ${
                    isCurrent
                      ? "border-cyan-400/55 bg-cyan-400/10 font-medium text-cyan-50"
                      : isRelevant
                        ? "border-slate-700/90 text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-400/5 focus-visible:border-cyan-300/60"
                        : "border-transparent text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-400/5 focus-visible:border-cyan-300/60"
                  }`}
                  onClick={() => onSelectMacro(macro)}
                >
                  <span
                    aria-hidden="true"
                    data-macro-location-marker=""
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      isCurrent ? "bg-cyan-300" : "bg-slate-600"
                    }`}
                  />
                  <span className="min-w-0 flex-1">{macro.label}</span>
                  {isRelevant ? (
                    <span
                      aria-hidden="true"
                      data-macro-relevance-marker=""
                      className="inline-block h-1.5 w-1.5 shrink-0 rotate-45 border border-cyan-300/80 bg-transparent"
                    />
                  ) : null}
                  {isCurrent ? (
                    <span className="sr-only"> (current section)</span>
                  ) : null}
                  {isRelevant ? (
                    <span className="sr-only">
                      {" "}
                      ({MACRO_LENS_RELEVANT_LABEL})
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={triggerRef}
        type="button"
        aria-label="Portfolio sections"
        aria-expanded={open}
        aria-controls={panelId}
        className="pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-cyan-400/50 bg-slate-950 px-3 text-cyan-200 outline-none transition-[border-color] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
        onClick={() => setOpen((current) => !current)}
      >
        <List aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="hidden text-xs font-medium tracking-wide sm:inline">
          Sections
        </span>
      </button>
    </div>
  );
}
