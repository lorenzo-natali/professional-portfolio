import { useLayoutEffect, useRef, useState } from "react";
import { projectStages } from "./portfolioData.js";

export function Section({ eyebrow, title, children, className = "", id }) {
  return (
    <section id={id} className={`border-t border-slate-800/70 px-5 py-16 sm:px-8 lg:px-10 lg:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-9 flex flex-col gap-2 sm:mb-10">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">{eyebrow}</p>
          )}
          <h2 className="text-2xl font-semibold tracking-tight !text-slate-50 sm:text-3xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export function SurfaceCard({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-slate-800/80 bg-slate-900/55 shadow-lg shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/75 hover:shadow-xl hover:shadow-slate-950/30 ${className}`}
    >
      {children}
    </div>
  );
}

// Minimal, self-positioning academic-focus info indicator. Opens above the
// trigger by default, flips below when there is not enough room, and shifts
// horizontally to stay within the viewport. Hover, keyboard focus and tap all
// reveal the contextual tooltip.
export function AcademicFocusInfo({ id, text, label = "Academic focus" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ side: "top", shiftX: 0 });
  const btnRef = useRef(null);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const reposition = () => {
      const btn = btnRef.current;
      const tip = tipRef.current;
      if (!btn || !tip) return;
      const b = btn.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Prefer opening above; flip below only if there is not enough room above
      // but enough room below.
      let side = "top";
      if (b.top - t.height - margin < 0 && b.bottom + t.height + margin <= vh) {
        side = "bottom";
      }

      // Center horizontally on the trigger, then clamp inside the viewport.
      const centerX = b.left + b.width / 2;
      const desiredLeft = centerX - t.width / 2;
      const clampedLeft = Math.max(margin, Math.min(desiredLeft, vw - t.width - margin));
      setPos({ side, shiftX: clampedLeft - desiredLeft });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    btnRef.current?.blur();
  };

  return (
    <span
      className="relative ml-1 inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label="Show academic focus"
        aria-describedby={open ? id : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span aria-hidden="true" className="font-serif text-[14px] italic leading-none">
          i
        </span>
      </button>
      <span
        ref={tipRef}
        id={id}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${pos.shiftX}px))` }}
        className={`absolute left-1/2 z-30 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-slate-800 bg-slate-950/95 px-3 py-2 text-left shadow-md shadow-slate-950/40 transition-opacity duration-150 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        } ${pos.side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
      >
        <span className="block text-[11px] font-medium text-slate-500">{label}</span>
        <span className="mt-0.5 block text-sm font-normal leading-6 text-slate-300">{text}</span>
      </span>
    </span>
  );
}

export function ProjectStageIndicator({ stage }) {
  const stageIndex = projectStages.indexOf(stage);
  if (stageIndex < 0) return null;

  const stageBars = (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {projectStages.map((item, index) => {
        const isCurrent = index === stageIndex;
        const isReached = index <= stageIndex;
        return (
          <span
            key={item}
            className={`h-1.5 w-5 rounded-full ${
              isCurrent
                ? "project-stage-current bg-cyan-200"
                : isReached
                  ? "bg-cyan-400/45"
                  : "bg-slate-700/70"
            }`}
          />
        );
      })}
    </div>
  );

  return (
    <div
      className="flex flex-col items-start gap-1.5 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-2"
      aria-label={`Development stage: ${stage}`}
      title={`Development stage: ${stage}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 font-medium whitespace-nowrap text-slate-500">Development stage</span>
        <span className="text-slate-700">·</span>
        <span className="font-medium text-cyan-100/80">{stage}</span>
      </div>
      <div className="sm:ml-1">{stageBars}</div>
    </div>
  );
}
