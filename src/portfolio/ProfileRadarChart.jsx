import {
  coverageBandMagnitude,
  coverageBandMax,
  coverageBandText,
  profileCoverage,
} from "./portfolioData.js";

export default function ProfileRadarChart({ activeId, onSelect }) {
  const centerX = 80;
  const centerY = 72;
  const maxRadius = 28;
  const labelRadius = 45;
  const angleFor = (index) => (-90 + index * (360 / profileCoverage.length)) * (Math.PI / 180);
  const pointFor = (index, radius) => {
    const angle = angleFor(index);
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };
  // Radar magnitudes are discrete visualization values derived from qualitative
  // evidence-coverage bands; they are not proficiency scores.
  // Headroom keeps the strongest spike just inside the outer ring: STRONG lands
  // on the second-outermost grid ring (0.8) rather than touching the edge.
  const spikeHeadroom = 0.8;
  const radiusForBand = (band) => (coverageBandMagnitude[band] / coverageBandMax) * maxRadius * spikeHeadroom;
  const coveragePolygonPoints = profileCoverage
    .map((axis, index) => {
      const point = pointFor(index, radiusForBand(axis.band));
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center justify-center overflow-visible rounded-2xl border border-slate-800/80 bg-slate-950/45 px-2 py-4 sm:px-4">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_52%)]" />
      <div className="relative z-10 mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
          Evidence coverage
        </span>
      </div>
      <svg className="relative z-10 aspect-[160/130] w-full max-w-[560px] overflow-visible" viewBox="0 0 160 130" role="img" aria-label="Indicative profile evidence coverage chart">
        {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
          <polygon
            key={level}
            points={profileCoverage
              .map((_, index) => {
                const point = pointFor(index, maxRadius * level);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="0.35"
          />
        ))}
        {profileCoverage.map((axis, index) => {
          const outer = pointFor(index, maxRadius);
          const isActive = activeId === axis.id;
          const label = pointFor(index, labelRadius);
          const labelAnchor = label.x > centerX + 8 ? "start" : label.x < centerX - 8 ? "end" : "middle";
          return (
            <g
              key={axis.id}
              role="button"
              tabIndex="0"
              aria-label={`${axis.label}: ${coverageBandText[axis.band]}`}
              aria-pressed={isActive}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(axis.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(axis.id);
                }
              }}
            >
              <line
                x1={centerX}
                y1={centerY}
                x2={outer.x}
                y2={outer.y}
                stroke={isActive ? "rgba(103,232,249,0.38)" : "rgba(148,163,184,0.16)"}
                strokeWidth={isActive ? "0.5" : "0.35"}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                className={`${isActive ? "fill-cyan-100" : "fill-slate-300"} text-[5px] font-medium sm:text-[3.75px]`}
              >
                {axis.shortLabel.map((line, lineIndex) => (
                  <tspan key={line} x={label.x} dy={lineIndex === 0 ? 0 : 5}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        <polygon
          points={coveragePolygonPoints}
          fill="rgba(34,211,238,0.16)"
          stroke="rgba(103,232,249,0.78)"
          strokeWidth="0.65"
        />
        {profileCoverage.map((axis, index) => {
          const point = pointFor(index, radiusForBand(axis.band));
          const isActive = activeId === axis.id;
          return (
            <circle
              key={axis.id}
              cx={point.x}
              cy={point.y}
              r={isActive ? "1.45" : "1.05"}
              fill={isActive ? "rgba(224,251,255,0.98)" : "rgba(165,243,252,0.94)"}
              className="cursor-pointer drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]"
              onClick={() => onSelect(axis.id)}
            />
          );
        })}
      </svg>
      <div className="relative z-10 mt-1 min-h-[32px] w-full max-w-[460px] px-2 text-center">
        <p className="text-[11px] leading-5 text-slate-500">
          Coverage reflects the strength and breadth of supporting portfolio evidence, not a proficiency score.
        </p>
      </div>
    </div>
  );
}
