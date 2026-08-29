import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  formatJourneyPeriod,
  getFirstMilestoneIndexForYear,
  getJourneyYears,
  getYearIndexForMilestone,
  getYearMilestoneEntries,
} from "./journeyData.js";
import { prefersReducedMotion } from "./portfolioSectionNavigation.js";

const YEAR_LABEL_CLASS =
  "text-center text-[1.65rem] font-semibold leading-none tracking-tight text-cyan-100 sm:text-[1.85rem]";

function parsePeriodYears(periodKey) {
  const parts = String(periodKey).split("–");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { start: parts[0], end: parts[1] };
  }
  return null;
}

function JourneyYearLabel({ periodKey }) {
  const range = parsePeriodYears(periodKey);

  if (!range) {
    return (
      <p className={`mt-1 ${YEAR_LABEL_CLASS}`} aria-live="polite">
        {periodKey}
      </p>
    );
  }

  return (
    <div
      className="mt-1 flex flex-col items-center"
      aria-live="polite"
      aria-label={`${range.start}–${range.end}`}
    >
      <span className={YEAR_LABEL_CLASS}>{range.start}</span>
      <span
        aria-hidden="true"
        className="my-1 h-3 w-px bg-slate-500/70"
      />
      <span className={YEAR_LABEL_CLASS}>{range.end}</span>
    </div>
  );
}

/**
 * Year-chapter Journey timeline (newest years first).
 * Interaction-only: finite fade/translate on year change; no idle loops.
 */
export default function JourneyTimeline({
  milestones,
  activeIndex,
  onSelect,
}) {
  const reducedMotion = prefersReducedMotion();
  const years = getJourneyYears(milestones);
  const yearIndex = getYearIndexForMilestone(milestones, activeIndex);
  const activeYear = years[yearIndex] ?? years[0];
  const yearEntries = getYearMilestoneEntries(milestones, activeYear);
  const [yearDirection, setYearDirection] = useState(0);

  const goYear = (delta) => {
    const nextYearIndex = yearIndex + delta;
    if (nextYearIndex < 0 || nextYearIndex >= years.length) return;
    setYearDirection(delta);
    onSelect(getFirstMilestoneIndexForYear(milestones, years[nextYearIndex]));
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      goYear(-1); // newer year (toward present)
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      goYear(1); // older year (toward past)
    } else if (event.key === "Home") {
      event.preventDefault();
      setYearDirection(-1);
      onSelect(getFirstMilestoneIndexForYear(milestones, years[0]));
    } else if (event.key === "End") {
      event.preventDefault();
      setYearDirection(1);
      onSelect(getFirstMilestoneIndexForYear(milestones, years[years.length - 1]));
    }
  };

  const yearMotion = reducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: yearDirection >= 0 ? 14 : -14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: yearDirection >= 0 ? -10 : 10 },
      };

  return (
    <div
      className="relative mx-auto flex w-full max-w-[500px] flex-col overflow-x-hidden"
      role="group"
      aria-label="Career timeline"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex min-h-[min(22rem,70vw)] items-stretch gap-3 sm:gap-4">
        {/* Year chapter + year navigation — vertically centered as a block */}
        <div className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center self-stretch sm:w-[5.5rem]">
          <button
            type="button"
            aria-label="Newer year"
            disabled={yearIndex <= 0}
            onClick={() => goYear(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-sm text-slate-500 transition enabled:hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-25"
          >
            ↑
          </button>
          <JourneyYearLabel periodKey={activeYear} />
          <button
            type="button"
            aria-label="Older year"
            disabled={yearIndex >= years.length - 1}
            onClick={() => goYear(1)}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-sm text-slate-500 transition enabled:hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-25"
          >
            ↓
          </button>
        </div>

        {/* Milestone group — vertically centered; even distribution within the year */}
        <div className="relative flex min-w-0 flex-1 flex-col self-stretch">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 top-3 w-px bg-slate-700/70"
            style={{ left: "calc(2.75rem + 0.5rem + 0.5rem)" }}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeYear}
              initial={yearMotion.initial}
              animate={yearMotion.animate}
              exit={yearMotion.exit}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
              className="relative flex min-h-full flex-1 flex-col justify-evenly"
            >
              {yearEntries.map(({ milestone, index }) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={milestone.id}
                    type="button"
                    aria-current={isActive ? "step" : undefined}
                    aria-label={[
                      formatJourneyPeriod(milestone),
                      milestone.title,
                      milestone.subtitle,
                      milestone.type,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                    onClick={() => onSelect(index)}
                    className={`relative grid w-full grid-cols-[2.75rem_1rem_minmax(0,1fr)] items-start gap-x-2 rounded-md py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 ${
                      isActive ? "opacity-100" : "opacity-55 hover:opacity-85"
                    }`}
                  >
                    <span
                      className={`col-start-1 justify-self-end pt-0.5 text-[10px] font-semibold tracking-[0.16em] ${
                        isActive ? "text-cyan-300/90" : "text-slate-500"
                      }`}
                    >
                      {milestone.monthLabel ?? ""}
                    </span>

                    <span className="col-start-2 flex justify-center pt-1.5">
                      <span
                        className={`rounded-full ${
                          isActive
                            ? "h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_0_3px_rgba(15,23,42,0.95),0_0_10px_rgba(34,211,238,0.3)]"
                            : "h-2 w-2 bg-slate-500"
                        }`}
                      />
                    </span>

                    <span className="col-start-3 min-w-0">
                      <span
                        className={`block text-sm font-semibold leading-5 sm:text-[0.95rem] ${
                          isActive ? "text-slate-50" : "text-slate-400"
                        }`}
                      >
                        {milestone.title}
                      </span>
                      {milestone.subtitle ? (
                        <span
                          className={`mt-0.5 block text-xs leading-4 sm:text-[0.8rem] ${
                            isActive ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {milestone.subtitle}
                        </span>
                      ) : null}
                      <span
                        className={`mt-1 block text-[10px] uppercase tracking-[0.16em] ${
                          isActive ? "text-slate-500" : "text-slate-600"
                        }`}
                      >
                        {milestone.type}
                      </span>
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
