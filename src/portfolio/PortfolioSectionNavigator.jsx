import { useEffect, useId, useRef, useState } from "react";
import { List } from "lucide-react";
import { getNavigatorSections } from "./sectionCatalog.js";

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
 * Scroll to a document section. No history mutation, no flash, no rAF.
 *
 * @param {string} scrollTargetId
 * @param {{
 *   reducedMotion?: boolean,
 *   getElement?: (id: string) => Element | null,
 * }} [options]
 * @returns {boolean}
 */
export function scrollToPortfolioSection(scrollTargetId, options = {}) {
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
 * Floating document table of contents.
 * Shows structure, current location, and jump targets only.
 *
 * @param {{
 *   activeSectionId?: string,
 *   onSectionSelect?: (sectionId: string) => void,
 * }} [props]
 */
export default function PortfolioSectionNavigator({
  activeSectionId = "hero",
  onSectionSelect,
} = {}) {
  const sections = getNavigatorSections();
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

  const onSelectSection = (section) => {
    onSectionSelect?.(section.id);
    scrollToPortfolioSection(section.scrollTargetId);
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
        className="pointer-events-auto w-56 rounded-md border border-cyan-400/35 bg-slate-950 p-2 text-slate-100 shadow-none"
      >
        <p className="px-2 pb-1.5 pt-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
          Sections
        </p>
        <ul className="flex flex-col gap-1">
          {sections.map((section) => {
            const isCurrent = activeSectionId === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  aria-current={isCurrent ? "location" : undefined}
                  data-section-current={isCurrent ? "true" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm outline-none transition-[border-color,background-color,color] focus-visible:ring-2 focus-visible:ring-cyan-400/35 ${
                    isCurrent
                      ? "border-cyan-400/55 bg-cyan-400/10 font-medium text-cyan-50"
                      : "border-transparent text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-400/5 focus-visible:border-cyan-300/60"
                  }`}
                  onClick={() => onSelectSection(section)}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      isCurrent ? "bg-cyan-300" : "bg-slate-600"
                    }`}
                  />
                  <span>{section.label}</span>
                  {isCurrent ? (
                    <span className="sr-only"> (current section)</span>
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
