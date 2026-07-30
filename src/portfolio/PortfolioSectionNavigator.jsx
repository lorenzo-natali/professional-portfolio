import { useEffect, useId, useRef, useState } from "react";
import { Filter, List } from "lucide-react";
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
 * @param {{
 *   isCurrent: boolean,
 *   onNavigate: () => void,
 *   children: import("react").ReactNode,
 * }} props
 */
function SectionNavButton({ isCurrent, onNavigate, children }) {
  return (
    <button
      type="button"
      aria-current={isCurrent ? "location" : undefined}
      data-section-current={isCurrent ? "true" : undefined}
      className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-[border-color,background-color,color] focus-visible:ring-2 focus-visible:ring-cyan-400/35 ${
        isCurrent
          ? "font-medium text-cyan-50"
          : "text-slate-100"
      }`}
      onClick={onNavigate}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 self-start rounded-full ${
          isCurrent ? "bg-cyan-300" : "bg-slate-600"
        }`}
      />
      <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
        {children}
      </span>
      {isCurrent ? (
        <span className="sr-only"> (current section)</span>
      ) : null}
    </button>
  );
}

/**
 * Floating document table of contents.
 * Optional Role Lens filter status/reset on the Role Lens row only.
 *
 * @param {{
 *   activeSectionId?: string,
 *   onSectionSelect?: (sectionId: string) => void,
 *   activeLensLabel?: string | null,
 *   onClearLens?: () => void,
 * }} [props]
 */
export default function PortfolioSectionNavigator({
  activeSectionId = "hero",
  onSectionSelect,
  activeLensLabel = null,
  onClearLens,
} = {}) {
  const sections = getNavigatorSections();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const reactId = useId();
  const panelId = `${PORTFOLIO_SECTION_NAVIGATOR_PANEL_ID}-${reactId}`;
  const hasActiveLens = Boolean(activeLensLabel);

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
        aria-label="Portfolio navigator"
        className="pointer-events-auto max-h-[calc(100dvh-5.75rem)] w-56 overflow-y-auto overscroll-y-contain rounded-md border border-cyan-400/35 bg-slate-950 p-2 text-slate-100 shadow-none"
      >
        <p className="px-2 pb-1.5 pt-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
          Navigator
        </p>
        <ul className="flex flex-col gap-1">
          {sections.map((section) => {
            const isCurrent = activeSectionId === section.id;
            const rowClass = `rounded-md border ${
              isCurrent
                ? "border-cyan-400/55 bg-cyan-400/10"
                : "border-transparent hover:border-cyan-400/40 hover:bg-cyan-400/5"
            }`;

            if (section.id === "role-lens") {
              return (
                <li key={section.id} className={`flex items-center ${rowClass}`}>
                  <SectionNavButton
                    isCurrent={isCurrent}
                    onNavigate={() => onSelectSection(section)}
                  >
                    {section.label}
                  </SectionNavButton>
                  {hasActiveLens ? (
                    <button
                      type="button"
                      data-role-lens-filter="active"
                      aria-label={`Clear ${activeLensLabel} Role Lens`}
                      title={`Clear ${activeLensLabel} Role Lens`}
                      className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cyan-200 outline-none transition-colors hover:text-cyan-100 focus-visible:text-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
                      onClick={() => onClearLens?.()}
                    >
                      <Filter
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                    </button>
                  ) : (
                    <span
                      data-role-lens-filter="inactive"
                      className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center text-slate-600"
                    >
                      <Filter
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      <span className="sr-only">No Role Lens active</span>
                    </span>
                  )}
                </li>
              );
            }

            return (
              <li key={section.id} className={rowClass}>
                <SectionNavButton
                  isCurrent={isCurrent}
                  onNavigate={() => onSelectSection(section)}
                >
                  {section.label}
                </SectionNavButton>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={triggerRef}
        type="button"
        aria-label="Portfolio navigator"
        aria-expanded={open}
        aria-controls={panelId}
        className="pointer-events-auto inline-flex h-12 min-w-12 items-center justify-center gap-2.5 rounded-full border border-cyan-400/50 bg-slate-950 px-3 text-cyan-200 outline-none transition-[border-color] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35 sm:h-[3.125rem] sm:px-3.5"
        onClick={() => setOpen((current) => !current)}
      >
        <List aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span className="hidden text-sm font-medium tracking-wide sm:inline">
          Navigator
        </span>
      </button>
    </div>
  );
}
