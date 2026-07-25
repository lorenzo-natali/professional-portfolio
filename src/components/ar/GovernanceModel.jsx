import { motion } from "framer-motion";
import { governanceStatement } from "./arContent";

const nodes = [
  { id: "risk", label: "RISK", x: 18, y: 58 },
  { id: "controls", label: "CONTROLS", x: 50, y: 86 },
  { id: "technology", label: "TECHNOLOGY", x: 82, y: 58 },
  { id: "governance", label: "GOVERNANCE", x: 50, y: 22 },
];

function Node({ label, x, y, visible, delay = 0, reducedMotion }) {
  if (!visible && !reducedMotion) return null;
  return (
    <motion.g
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : delay }}
    >
      <circle cx={`${x}%`} cy={`${y}%`} r="4.5" fill="#67e8f9" fillOpacity="0.9" />
      <circle cx={`${x}%`} cy={`${y}%`} r="7" fill="none" stroke="#67e8f9" strokeOpacity="0.35" strokeWidth="1" />
      <text
        x={`${x}%`}
        y={`${y - 9}%`}
        textAnchor="middle"
        className="fill-slate-100"
        style={{ fontSize: "9px", letterSpacing: "0.14em", fontWeight: 500 }}
      >
        {label}
      </text>
    </motion.g>
  );
}

export default function GovernanceModel({ phase, reducedMotion }) {
  const showRisk = reducedMotion || phase >= 1;
  const showControls = reducedMotion || phase >= 2;
  const showTechnology = reducedMotion || phase >= 3;
  const showLines = reducedMotion || phase >= 4;
  const showGovernance = reducedMotion || phase >= 5;

  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 px-3 py-3 backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300/90">Governance model</p>
      <svg viewBox="0 0 100 100" className="mx-auto h-40 w-full max-w-[240px]" aria-hidden="true">
        {showLines && (
          <motion.g
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
          >
            <line x1="18%" y1="58%" x2="50%" y2="86%" stroke="#64748b" strokeWidth="0.8" />
            <line x1="82%" y1="58%" x2="50%" y2="86%" stroke="#64748b" strokeWidth="0.8" />
            <line x1="18%" y1="58%" x2="50%" y2="22%" stroke="#64748b" strokeWidth="0.8" />
            <line x1="82%" y1="58%" x2="50%" y2="22%" stroke="#64748b" strokeWidth="0.8" />
            <line x1="50%" y1="86%" x2="50%" y2="22%" stroke="#67e8f9" strokeOpacity="0.55" strokeWidth="0.9" />
          </motion.g>
        )}
        <Node {...nodes[0]} visible={showRisk} delay={0} reducedMotion={reducedMotion} />
        <Node {...nodes[1]} visible={showControls} delay={0.1} reducedMotion={reducedMotion} />
        <Node {...nodes[2]} visible={showTechnology} delay={0.15} reducedMotion={reducedMotion} />
        <Node {...nodes[3]} visible={showGovernance} delay={0.2} reducedMotion={reducedMotion} />
      </svg>
      {(showGovernance || reducedMotion) && (
        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-1 text-center text-[11px] leading-5 text-slate-300"
        >
          {governanceStatement}
        </motion.p>
      )}
    </div>
  );
}
