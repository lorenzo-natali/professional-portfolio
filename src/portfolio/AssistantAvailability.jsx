import { useId } from "react";

/**
 * Compact preview-card status. The displayed state is supplied by the caller.
 * This module does not check the Worker.
 */

/** @typedef {"available" | "visitor_limit" | "global_limit" | "unavailable" | "unknown"} AssistantAvailabilityStatus */

/**
 * @param {string | undefined} status
 */
export function assistantAvailabilityDescription(status) {
  return (status && status in PRESENTATION ? PRESENTATION[status] : PRESENTATION.unknown).description;
}

const PRESENTATION = {
  available: { dotClassName: "bg-emerald-400", description: "AI Assistant available" },
  visitor_limit: {
    dotClassName: "bg-amber-400",
    description: "Your daily question limit has been reached",
  },
  global_limit: {
    dotClassName: "bg-red-400/60",
    description: "AI Assistant daily capacity reached",
  },
  unavailable: { dotClassName: "bg-red-400/60", description: "AI Assistant unavailable" },
  unknown: { dotClassName: "bg-slate-500", description: "AI Assistant status unknown" },
};

/**
 * Inline status dot. Meant to sit immediately after a title.
 * `below` anchors the tooltip to the nearest positioned ancestor so a dialog
 * can keep it inside its own bounds. The default stays above the dot.
 * @param {{
 *   status?: AssistantAvailabilityStatus,
 *   tabIndex?: number,
 *   tooltipPlacement?: "above" | "below",
 *   spacious?: boolean,
 * }} props
 */
export function AssistantAvailabilityIndicator({
  status = "unknown",
  tabIndex = 0,
  tooltipPlacement = "above",
  spacious = false,
}) {
  const resolved = status in PRESENTATION ? status : "unknown";
  const presentation = PRESENTATION[resolved];
  const tooltipId = useId();
  const openBelow = tooltipPlacement === "below";
  const tooltipClassName = openBelow
    ? "pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden w-max max-w-full whitespace-normal text-left rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium leading-4 tracking-normal text-slate-200 normal-case group-hover/availability:block group-focus-visible/availability:block"
    : "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium leading-none tracking-normal text-slate-200 normal-case group-hover/availability:block group-focus-visible/availability:block";

  return (
    <span
      tabIndex={tabIndex}
      role="img"
      data-assistant-availability={resolved}
      aria-label={presentation.description}
      aria-describedby={tooltipId}
      className={
        spacious
          ? "group/availability relative inline-flex h-11 w-5 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-8"
          : `group/availability inline-block h-1.5 w-1.5 shrink-0 rounded-full align-[0.22em] ml-2 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${openBelow ? "" : "relative"} ${presentation.dotClassName}`
      }
    >
      {spacious ? (
        <span
          aria-hidden="true"
          data-assistant-status-dot
          className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`}
        />
      ) : null}
      <span id={tooltipId} role="tooltip" aria-hidden="true" className={tooltipClassName}>
        {presentation.description}
      </span>
    </span>
  );
}
