import { motion } from "framer-motion";
import { callouts } from "./arContent";

export default function ContextualCallouts({ visible, reducedMotion }) {
  if (!visible && !reducedMotion) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.45 }}
      className="space-y-2"
    >
      {callouts.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2.5 backdrop-blur-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/90">{item.title}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.body}</p>
        </div>
      ))}
    </motion.div>
  );
}
