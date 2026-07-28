import { AnimatePresence, motion } from "framer-motion";
import { experiences } from "../portfolioData.js";
import { lensSurfaceClass } from "../portfolioLens.js";
import { Section, SurfaceCard } from "../portfolioUi.jsx";

export default function ExperienceSection({
  selectedLens = "Overview",
  expandedExperiences = {},
  toggleExperienceDetails,
}) {
  return (
      <Section id="experience" title="Professional Experience" className="bg-slate-950/80">
        <div className="relative max-w-5xl">
          <div className="absolute bottom-0 left-3 top-2 w-px bg-slate-800 sm:left-4" />
          <div className="space-y-6">
            {experiences.map((exp) => {
              const hasDetails = Array.isArray(exp.details) && exp.details.length > 0;
              const isExpanded = hasDetails && Boolean(expandedExperiences[exp.id]);

              return (
                <motion.article
                  key={`${exp.role}-${exp.company}`}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  data-role-lens-id={exp.id}
                  className="relative pl-10 sm:pl-12"
                >
                  <div className="absolute left-[7px] top-6 h-3 w-3 rounded-full border border-slate-950 bg-cyan-300 shadow-[0_0_0_5px_rgba(15,23,42,0.95)] sm:left-[11px]" />
                  <SurfaceCard className={`p-5 sm:p-6 ${lensSurfaceClass(selectedLens, "experiences", exp.id)}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-cyan-300">{exp.period}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">{exp.role}</h3>
                        <p className="mt-1 text-sm text-slate-400">{exp.company}</p>
                        {exp.note && (
                          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
                            {exp.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <AnimatePresence initial={false} mode="wait">
                      {!isExpanded && (
                        <motion.ul
                          key="summary"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="mt-4 space-y-2 overflow-hidden text-sm leading-6 text-slate-300 sm:text-base"
                        >
                          {hasDetails && (
                            <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                              Summary
                            </li>
                          )}
                          {exp.points.map((point) => (
                            <li key={point} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>

                    {hasDetails && (
                    <div className="mt-5 border-t border-slate-800/80 pt-4">
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() => toggleExperienceDetails(exp.id)}
                          aria-expanded={isExpanded}
                          className="text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                        >
                          View details
                        </button>
                      )}

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="details"
                            initial={{ opacity: 0, height: 0, y: -6 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: "easeOut" }}
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
                              onClick={() => toggleExperienceDetails(exp.id)}
                              aria-expanded={isExpanded}
                              className="mt-5 text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                            >
                              Show less
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    )}
                  </SurfaceCard>
                </motion.article>
              );
            })}
          </div>
        </div>
      </Section>
  );
}
