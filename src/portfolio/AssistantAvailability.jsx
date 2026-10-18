import { useId } from "react";

/**
 * Compact preview-card status. The displayed state is supplied by the caller.
 * This module does not check the Worker.
 */

/** @typedef {"available" | "visitor_limit" | "global_limit" | "unavailable" | "unknown"} AssistantAvailabilityStatus */

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
 * Inline status dot. Meant to sit immediately after the preview title.
 * @param {{ status?: AssistantAvailabilityStatus }} props
 */
export function AssistantAvailabilityIndicator({ status = "unknown" }) {
  const resolved = status in PRESENTATION ? status : "unknown";
  const presentation = PRESENTATION[resolved];
  const tooltipId = useId();

  return (
    <span
      tabIndex={0}
      role="img"
      data-assistant-availability={resolved}
      aria-label={presentation.description}
      aria-describedby={tooltipId}
      className={`group/availability relative inline-block h-1.5 w-1.5 shrink-0 rounded-full align-[0.22em] ml-2 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${presentation.dotClassName}`}
    >
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium leading-none tracking-normal text-slate-200 normal-case group-hover/availability:block group-focus-visible/availability:block"
      >
        {presentation.description}
      </span>
    </span>
  );
}
