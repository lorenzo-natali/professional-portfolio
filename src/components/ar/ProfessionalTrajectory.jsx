import { motion } from "framer-motion";
import { trajectorySteps } from "./arContent";

export default function ProfessionalTrajectory({ visible, reducedMotion }) {
  if (!visible && !reducedMotion) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.45 }}
      className="rounded-lg border border-slate-700/70 bg-slate-950/55 px-3 py-3 backdrop-blur-sm"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">
        Professional trajectory
      </p>
      <ol className="space-y-1">
        {trajectorySteps.map((step, index) => (
          <li key={step} className="text-center">
            <span className="text-xs font-medium text-slate-100">{step}</span>
            {index < trajectorySteps.length - 1 && (
              <div className="my-0.5 text-[10px] text-slate-500" aria-hidden="true">
                ↓
              </div>
            )}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
