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
 * The status is available to assistive tech through aria-label only.
 * @param {{
 *   status?: AssistantAvailabilityStatus,
 *   tabIndex?: number,
 *   spacious?: boolean,
 * }} props
 */
export function AssistantAvailabilityIndicator({
  status = "unknown",
  tabIndex = 0,
  spacious = false,
}) {
  const resolved = status in PRESENTATION ? status : "unknown";
  const presentation = PRESENTATION[resolved];

  return (
    <span
      tabIndex={tabIndex}
      role="img"
      data-assistant-availability={resolved}
      aria-label={presentation.description}
      className={
        spacious
          ? "relative inline-flex h-11 w-5 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-8"
          : `relative inline-block h-1.5 w-1.5 shrink-0 rounded-full align-[0.22em] ml-2 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${presentation.dotClassName}`
      }
    >
      {spacious ? (
        <span
          aria-hidden="true"
          data-assistant-status-dot
          className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`}
        />
      ) : null}
    </span>
  );
}
