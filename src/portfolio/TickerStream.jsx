import { useEffect, useRef } from "react";
import { lensRelevance } from "./portfolioData.js";
import { isLensRelevant } from "./portfolioLens.js";
import { getTickerScheduler } from "./createTickerScheduler.js";

/**
 * Marquee ticker — shares one global rAF scheduler across all instances.
 * Pauses while offscreen; no per-instance requestAnimationFrame.
 */
export default function TickerStream({ stream, selectedLens = "Overview" }) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const subscriptionRef = useRef(null);

  const isRiskStream = stream.accent === "cyan";
  const dotClass = isRiskStream ? "bg-cyan-300/80 shadow-cyan-300/20" : "bg-violet-300/80 shadow-violet-300/20";
  const labelClass = isRiskStream ? "text-cyan-200" : "text-violet-200";
  const borderClass = isRiskStream ? "border-cyan-400/25" : "border-violet-400/25";
  const backgroundClass = isRiskStream ? "bg-cyan-400/[0.04]" : "bg-violet-400/[0.04]";
  const hasStreamHighlights = (lensRelevance[selectedLens]?.streamItems?.length ?? 0) > 0;
  const speed = 28;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2;
      if (stream.direction === "right" && offsetRef.current === 0 && halfWidthRef.current > 0) {
        offsetRef.current = -halfWidthRef.current;
      }
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    const update = (delta) => {
      if (pausedRef.current || halfWidthRef.current <= 0) return;
      const movement = speed * delta;
      if (stream.direction === "right") {
        offsetRef.current += movement;
        if (offsetRef.current >= 0) {
          offsetRef.current -= halfWidthRef.current;
        }
      } else {
        offsetRef.current -= movement;
        if (offsetRef.current <= -halfWidthRef.current) {
          offsetRef.current += halfWidthRef.current;
        }
      }
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    const sub = getTickerScheduler().subscribe(track, { update, measure });
    subscriptionRef.current = sub;

    return () => {
      sub.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [stream.direction]);

  return (
    <div
      className={`ticker-stream overflow-hidden border-y-2 ${borderClass} ${backgroundClass}`}
      data-ticker-stream="1"
      data-ticker-accent={isRiskStream ? "cyan" : "violet"}
      onMouseEnter={() => {
        pausedRef.current = true;
        subscriptionRef.current?.setPaused(true);
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
        subscriptionRef.current?.setPaused(false);
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-2">
        <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${labelClass}`}>{stream.label}</span>
      </div>
      <div className="ticker-mask overflow-hidden py-2.5">
        <div ref={trackRef} className="flex w-max items-center whitespace-nowrap">
          {[...stream.items, ...stream.items].map((item, index) => (
            <span
              key={`${stream.label}-${item}-${index}`}
              className={`inline-flex items-center text-sm font-medium transition ${
                !hasStreamHighlights || isLensRelevant(selectedLens, "streamItems", item)
                  ? "text-slate-100"
                  : "text-slate-500 opacity-75"
              }`}
            >
              <span className="px-4">{item}</span>
              <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${dotClass}`} aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
