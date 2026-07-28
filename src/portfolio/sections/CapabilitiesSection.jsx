import { motion } from "framer-motion";
import { expertise } from "../portfolioData.js";
import { isLensRelevant, lensSurfaceClass } from "../portfolioLens.js";
import { Section, SurfaceCard } from "../portfolioUi.jsx";

export default function CapabilitiesSection({ selectedLens = "Overview" }) {
  return (
    <Section id="capabilities" title="Professional Capabilities">
      <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
        {expertise.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              data-role-lens-id={item.id}
              className="group p-1"
              whileHover={isLensRelevant(selectedLens, "capabilities", item.id) ? { y: -5, scale: 1.01 } : { y: -3 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <SurfaceCard className={`h-full p-5 sm:p-6 ${lensSurfaceClass(selectedLens, "capabilities", item.id)}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3 group-hover:scale-110" />
                  <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
                </div>
                {item.id === "capability-international-cross-cultural" && (
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">
                    Transversal capability
                  </p>
                )}
                <p className="mt-4 leading-7 text-slate-300">{item.text}</p>
              </SurfaceCard>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
