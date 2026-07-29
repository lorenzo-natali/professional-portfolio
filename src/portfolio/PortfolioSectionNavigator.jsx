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

/**
 * Static floating section index (Phase 2).
 * Local open/closed state only — no active-section or Role Lens markers.
 */
export default function PortfolioSectionNavigator() {
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

  const onSelectMacro = (scrollTargetId) => {
    scrollToMacroSection(scrollTargetId);
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
          {macros.map((macro) => (
            <li key={macro.key}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center rounded-md border border-transparent px-3 py-2 text-left text-sm text-slate-100 outline-none transition-[border-color,background-color] hover:border-cyan-400/40 hover:bg-cyan-400/5 focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
                onClick={() => onSelectMacro(macro.scrollTargetId)}
              >
                {macro.label}
              </button>
            </li>
          ))}
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
