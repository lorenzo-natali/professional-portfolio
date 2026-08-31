/**
 * International Mobility snapshot view — static raster map + marker overlay.
 * No timers, rAF, observers, drag, zoom, or continuous animation.
 *
 * Overlay percentages are relative to the image box (same aspect as the PNG),
 * not the outer Snapshot card chrome.
 */

import europeMobilityMap from "../assets/europe-mobility-map.png";
import {
  beyondEuropeRegions,
  currentBase,
  EUROPE_MAP_INTRINSIC,
  preferredLocations,
} from "./mobilityData.js";

/**
 * @param {{
 *   location: import("./mobilityData.js").MobilityLocation,
 *   role: "base" | "preferred",
 * }} props
 */
function MobilityNode({ location, role }) {
  const isBase = role === "base";
  const ariaLabel = isBase
    ? `${location.city}, ${location.country} — current professional base`
    : `${location.city}, ${location.country} — preferred relocation location`;
  const { x, y } = location.displayPosition;
  const positionStyle = { left: `${x}%`, top: `${y}%` };

  if (isBase) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        style={positionStyle}
      >
        <span
          aria-hidden="true"
          className="block h-2.5 w-2.5 rounded-full border border-cyan-300/70 bg-cyan-300/90 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
        />
      </button>
    );
  }

  // Preferred markers are static (no hover/focus affordance).
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="pointer-events-none absolute z-10 block h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500 bg-slate-700"
      style={positionStyle}
    />
  );
}

/**
 * Single-line city name only — country stays in data + node aria-label / right panel.
 * @param {{ location: import("./mobilityData.js").MobilityLocation, emphasize?: boolean }} props
 */
function MobilityLabel({ location, emphasize = false }) {
  const anchor = location.labelAnchor ?? "start";
  const left = location.displayPosition.x + location.labelOffset.x;
  const top = location.displayPosition.y + location.labelOffset.y;
  const transform =
    anchor === "middle"
      ? "translate(-50%, -50%)"
      : anchor === "end"
        ? "translate(-100%, -50%)"
        : "translate(0, -50%)";

  return (
    <p
      className={`absolute whitespace-nowrap font-semibold uppercase tracking-[0.1em] sm:tracking-[0.11em] ${
        emphasize
          ? "text-[10px] text-slate-50 sm:text-[11px]"
          : "text-[8px] text-slate-200 sm:text-[9px]"
      }`}
      style={{ left: `${left}%`, top: `${top}%`, transform }}
    >
      {location.city}
    </p>
  );
}

/**
 * Map canvas for the left Snapshot panel.
 */
export default function InternationalMobility() {
  const aspect = `${EUROPE_MAP_INTRINSIC.width} / ${EUROPE_MAP_INTRINSIC.height}`;

  return (
    <div className="mx-auto w-full max-w-[500px]">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/55"
        style={{ aspectRatio: aspect }}
        data-testid="international-mobility-map"
      >
        {/* Image + overlay share this box 1:1 (no letterboxing inside). */}
        <img
          src={europeMobilityMap}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          data-testid="europe-mobility-map-image"
        />

        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {preferredLocations.map((location) => (
            <MobilityLabel key={`label-${location.id}`} location={location} />
          ))}
          <MobilityLabel location={currentBase} emphasize />
        </div>

        <div className="absolute inset-0">
          {preferredLocations.map((location) => (
            <MobilityNode
              key={location.id}
              location={location}
              role="preferred"
            />
          ))}
          <MobilityNode location={currentBase} role="base" />
        </div>
      </div>
    </div>
  );
}

/**
 * Right-panel summary — broader international mobility (Europe is on the map).
 */
export function InternationalMobilitySummary() {
  return (
    <div data-testid="international-mobility-summary">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        International Mobility
      </p>

      <div className="mt-5 border-b border-slate-800 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Current base
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-50">
          {currentBase.city}, {currentBase.country}
        </h3>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Open to relocation
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
          European preferred locations
        </p>
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Beyond Europe
        </p>
        <div className="mt-4 space-y-4">
          {beyondEuropeRegions.map((region) => (
            <div key={region.id}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {region.region}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">
                {region.cities.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
