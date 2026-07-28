import { AnimatePresence, motion } from "framer-motion";
import { roleLenses, lensSummaries } from "./portfolioData.js";
import { isOverviewLens, lensOptions } from "./portfolioLens.js";

export default function RoleLens({ selectedLens, onSelectLens }) {
  const lens = roleLenses.find((item) => item.name === selectedLens) ?? roleLenses[0];
  const hasActiveLens = !isOverviewLens(selectedLens);
  const roleLensLetters = "ROLE LENS".split("");

  return (
    <section id="role-lens" className="border-t border-slate-800/70 bg-slate-950/95 px-5 py-3 sm:px-8 sm:py-2 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="sticky top-0 z-30 overflow-hidden bg-slate-950/90 py-4 backdrop-blur sm:py-3">
          <div className="relative flex flex-col gap-3 sm:gap-2.5">
            <div className="flex flex-col gap-1.5 sm:gap-1">
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300/80 sm:text-xs sm:tracking-[0.28em]"
                  aria-label="Role Lens"
                >
                  {roleLensLetters.map((letter, index) => (
                    <span
                      key={`${letter}-${index}`}
                      aria-hidden="true"
                      className="role-lens-letter inline-block"
                      style={{ animationDelay: `${index * 0.12}s` }}
                    >
                      {letter === " " ? "\u00A0" : letter}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-400 sm:mt-0.5 sm:text-xs sm:leading-normal sm:text-sm">
                  Select a lens to highlight relevant sections across the portfolio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 sm:gap-2">
              {lensOptions.map((item) => {
                const isActive = item.name === selectedLens;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onSelectLens(item.name)}
                    className={`shrink-0 rounded-md border px-3.5 py-2 text-sm font-medium transition sm:px-3 sm:py-1.5 ${
                      isActive
                        ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                        : "border-slate-700/80 bg-slate-900/45 text-slate-300 hover:border-violet-300/35 hover:text-slate-100"
                    }`}
                  >
                    {item.label ?? item.name}
                  </button>
                );
              })}
              {hasActiveLens ? (
                <button
                  type="button"
                  onClick={() => onSelectLens("Overview")}
                  className="role-lens-reset-active self-center text-sm font-medium text-cyan-100/80 underline decoration-cyan-300/20 underline-offset-4 transition hover:text-cyan-50 hover:decoration-cyan-200/50 sm:text-xs"
                >
                  Reset lens
                </button>
              ) : (
                <span className="self-center text-sm text-slate-600 sm:text-xs">No lens selected</span>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {hasActiveLens && (
            <motion.div
              key={lens.name}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="py-2 text-sm text-slate-400"
            >
              <span className="font-medium text-cyan-100">{lens.label ?? lens.name} lens active</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>{lensSummaries[lens.name]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
