import { AnimatePresence, motion } from "framer-motion";
import { experiences } from "../portfolioData.js";
import { lensSurfaceClass } from "../portfolioLens.js";
import { prefersReducedMotion } from "../portfolioSectionNavigation.js";
import { Section, SurfaceCard } from "../portfolioUi.jsx";
import { PORTFOLIO_SECTION_TITLES } from "../sectionCatalog.js";

export default function ExperienceSection({
  selectedLens = "Overview",
  expandedExperiences = {},
  toggleExperienceDetails,
}) {
  const reducedMotion = prefersReducedMotion();
  const expandTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" };
  const detailsTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: "easeOut" };

  return (
    <Section
      id="experience"
      title={PORTFOLIO_SECTION_TITLES.experience}
      className="bg-slate-950/80"
    >
      <div className="experience-list-shell relative max-w-5xl">
        <div
          data-experience-list-viewport
          className="experience-list-viewport"
          aria-label="Professional experience list"
        >
          <div className="experience-list-content relative">
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-3 top-2 w-px bg-slate-800 sm:left-4"
            />
            <div className="space-y-6">
              {experiences.map((exp) => {
                const isUpcoming = Boolean(exp.upcoming);
                const hasDetails =
                  !isUpcoming &&
                  Array.isArray(exp.details) &&
                  exp.details.length > 0;
                const isExpanded =
                  hasDetails && Boolean(expandedExperiences[exp.id]);
                const detailsId = `${exp.id}-details`;
                const summaryPoints = Array.isArray(exp.points) ? exp.points : [];

                return (
                  <motion.article
                    key={exp.id}
                    initial={reducedMotion ? false : { opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    data-role-lens-id={exp.id}
                    className="relative pl-10 sm:pl-12"
                  >
                    <div className="absolute left-[7px] top-6 h-3 w-3 rounded-full border border-slate-950 bg-cyan-300 shadow-[0_0_0_5px_rgba(15,23,42,0.95)] sm:left-[11px]" />
                    <SurfaceCard
                      className={`p-5 sm:p-6 ${lensSurfaceClass(selectedLens, "experiences", exp.id)}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-cyan-300">
                            {exp.period}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-50">
                            {exp.role}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {exp.company}
                          </p>
                        </div>
                      </div>

                      {isUpcoming && exp.upcomingNote ? (
                        <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                          {exp.upcomingNote}
                        </p>
                      ) : null}

                      {!isUpcoming && (exp.note || exp.intro) ? (
                        <div className="mt-3 space-y-3">
                          {exp.note ? (
                            <p className="text-sm leading-6 text-slate-300 sm:text-base">
                              {exp.note}
                            </p>
                          ) : null}
                          {exp.intro ? (
                            <p className="text-sm leading-6 text-slate-300 sm:text-base">
                              {exp.intro}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {exp.reference?.href && exp.reference?.label ? (
                        <a
                          href={exp.reference.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex text-xs text-cyan-200/70 underline decoration-cyan-400/25 underline-offset-2 transition hover:text-cyan-100 hover:decoration-cyan-300/50"
                        >
                          {exp.reference.label}
                        </a>
                      ) : null}

                      {!isUpcoming ? (
                        <>
                          <AnimatePresence initial={false} mode="wait">
                            {!isExpanded ? (
                              <motion.ul
                                key="summary"
                                initial={
                                  reducedMotion ? false : { opacity: 0, height: 0 }
                                }
                                animate={{ opacity: 1, height: "auto" }}
                                exit={
                                  reducedMotion
                                    ? undefined
                                    : { opacity: 0, height: 0 }
                                }
                                transition={expandTransition}
                                className="mt-4 space-y-2 overflow-hidden text-sm leading-6 text-slate-300 sm:text-base"
                              >
                                {hasDetails ? (
                                  <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                                    Summary
                                  </li>
                                ) : null}
                                {summaryPoints.map((point) => (
                                  <li key={point} className="flex gap-3">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </motion.ul>
                            ) : null}
                          </AnimatePresence>

                          {hasDetails ? (
                            <div className="mt-5 border-t border-slate-800/80 pt-4">
                              {!isExpanded ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExperienceDetails(exp.id)}
                                  aria-expanded={false}
                                  aria-controls={detailsId}
                                  className="inline-flex min-h-11 items-center text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                                >
                                  View details
                                </button>
                              ) : null}

                              <AnimatePresence initial={false}>
                                {isExpanded ? (
                                  <motion.div
                                    key="details"
                                    id={detailsId}
                                    initial={
                                      reducedMotion
                                        ? false
                                        : { opacity: 0, height: 0, y: -6 }
                                    }
                                    animate={{ opacity: 1, height: "auto", y: 0 }}
                                    exit={
                                      reducedMotion
                                        ? undefined
                                        : { opacity: 0, height: 0, y: -6 }
                                    }
                                    transition={detailsTransition}
                                    className="overflow-hidden"
                                  >
                                    <ul className="space-y-2.5 text-sm leading-6 text-slate-300 sm:text-base">
                                      <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                                        Details
                                      </li>
                                      {exp.details.map((detail) => (
                                        <li key={detail} className="flex gap-3">
                                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                                          <span>{detail}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleExperienceDetails(exp.id)
                                      }
                                      aria-expanded={true}
                                      aria-controls={detailsId}
                                      className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                                    >
                                      Show less
                                    </button>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </SurfaceCard>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
