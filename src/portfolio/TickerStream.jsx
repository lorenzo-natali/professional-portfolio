import { useEffect, useRef } from "react";
import { lensRelevance } from "./portfolioData.js";
import { isLensRelevant } from "./portfolioLens.js";
import { subscribeTickerFrame } from "./createTickerFrameScheduler.js";
import { subscribeTickerResize } from "./createTickerResizeObserver.js";
import { subscribeTickerVisibility } from "./createTickerVisibilityObserver.js";

export default function TickerStream({ stream, selectedLens = "Overview" }) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const halfWidthRef = useRef(0);
  const frameUnsubscribeRef = useRef(null);
  const visibleRef = useRef(true);

  const isRiskStream = stream.accent === "cyan";
  const dotClass = isRiskStream ? "bg-cyan-300/80 shadow-cyan-300/20" : "bg-violet-300/80 shadow-violet-300/20";
  const labelClass = isRiskStream ? "text-cyan-200" : "text-violet-200";
  const borderClass = isRiskStream ? "border-cyan-400/25" : "border-violet-400/25";
  const backgroundClass = isRiskStream ? "bg-cyan-400/[0.04]" : "bg-violet-400/[0.04]";
  const hasStreamHighlights = (lensRelevance[selectedLens]?.streamItems?.length ?? 0) > 0;

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return undefined;

    const speed = 28;

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2;
      if (stream.direction === "right" && offsetRef.current === 0) {
        offsetRef.current = -halfWidthRef.current;
      }
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    const onFrame = (time) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!pausedRef.current && halfWidthRef.current > 0) {
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
      }
    };

    const stopFrames = () => {
      if (frameUnsubscribeRef.current) {
        frameUnsubscribeRef.current();
        frameUnsubscribeRef.current = null;
      }
    };

    const startFrames = () => {
      if (frameUnsubscribeRef.current) return;
      // Avoid a large time jump after being offscreen or mouse-paused.
      lastTimeRef.current = 0;
      frameUnsubscribeRef.current = subscribeTickerFrame(onFrame);
    };

    const setVisible = (visible) => {
      visibleRef.current = visible;
      if (visible) {
        startFrames();
      } else {
        stopFrames();
      }
    };

    measure();
    // Assume visible until the shared observer delivers its first entry so the
    // ticker always starts (and can be paused if the first entry is offscreen).
    visibleRef.current = true;
    startFrames();

    const unsubscribeResize = subscribeTickerResize(track, measure);
    const unsubscribeVisibility = subscribeTickerVisibility(root, setVisible);

    return () => {
      stopFrames();
      unsubscribeVisibility();
      unsubscribeResize();
    };
  }, [stream.direction]);

  return (
    <div
      ref={rootRef}
      className={`ticker-stream overflow-hidden border-y-2 ${borderClass} ${backgroundClass} backdrop-blur`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
        lastTimeRef.current = 0;
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-2">
        <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${labelClass}`}>{stream.label}</span>
      </div>
      <div className="ticker-mask overflow-hidden py-2.5">
        <div ref={trackRef} className="flex w-max items-center whitespace-nowrap will-change-transform">
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
