import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

const CORNERS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

const VIEW_CX = 16;
const VIEW_CY = 16;
const SCALE = 7.1;
const PITCH_DEG = -30;
/** Camera distance — must stay clearly larger than max |z| after rotation (~1.7). */
const CAMERA_Z = 4.8;
const FOCAL = 3.6;

function projectCube(yawDeg) {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (PITCH_DEG * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);

  return CORNERS.map(([x, y, z]) => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const depth = CAMERA_Z - z2;
    const w = FOCAL / depth;
    return {
      x: VIEW_CX + x1 * w * SCALE,
      y: VIEW_CY + y2 * w * SCALE,
      z: z2,
    };
  });
}

function applyProjectedEdges(lines, yawDeg) {
  const pts = projectCube(yawDeg);
  for (let i = 0; i < EDGES.length; i += 1) {
    const [a, b] = EDGES[i];
    const line = lines[i];
    if (!line) continue;
    const pa = pts[a];
    const pb = pts[b];
    const depth = (pa.z + pb.z) * 0.5;
    // Near edges: brighter + thicker; far edges: softer — reads as volume at ~28px.
    const t = Math.min(1, Math.max(0, (depth + 1.6) / 3.2));
    const alpha = 0.42 + t * 0.58;
    const width = 0.95 + t * 0.55;

    line.setAttribute("x1", pa.x.toFixed(2));
    line.setAttribute("y1", pa.y.toFixed(2));
    line.setAttribute("x2", pb.x.toFixed(2));
    line.setAttribute("y2", pb.y.toFixed(2));
    line.setAttribute("stroke-width", width.toFixed(2));
    line.setAttribute("stroke-opacity", alpha.toFixed(2));
  }
}

function WireframeCube() {
  const reducedMotion = usePrefersReducedMotion();
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const lines = [...svg.querySelectorAll("line")];

    if (reducedMotion) {
      applyProjectedEdges(lines, 42);
      return undefined;
    }

    const periodMs = 13000;
    let frameId = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = ((now - start) % periodMs) / periodMs;
      applyProjectedEdges(lines, 42 + t * 360);
      frameId = requestAnimationFrame(tick);
    };

    applyProjectedEdges(lines, 42);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [reducedMotion]);

  const initial = projectCube(42);

  return (
    <span className="ar-cube-anchor" aria-hidden="true">
      <svg
        ref={svgRef}
        className="ar-cube-svg"
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        {EDGES.map(([a, b], index) => (
          <line
            key={index}
            x1={initial[a].x}
            y1={initial[a].y}
            x2={initial[b].x}
            y2={initial[b].y}
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
}

export default function ARGovernanceCard({ onLaunch }) {
  return (
    <button
      type="button"
      onClick={onLaunch}
      aria-label="Open AR CV Lens"
      className="ar-lens-button group relative flex w-full items-center justify-between rounded-full border border-cyan-400/75 bg-transparent px-5 py-3 text-cyan-300 outline-none transition-[border-color,box-shadow] hover:border-cyan-300 focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-400/35"
      style={{
        boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 0 18px rgba(34,211,238,0.16)",
      }}
    >
      <WireframeCube />

      <span className="absolute inset-x-0 text-center text-[12px] font-medium uppercase tracking-[0.28em] text-cyan-300">
        AR CV Lens
      </span>

      <span
        className="relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center text-cyan-300/90 transition-transform duration-200 group-hover:translate-x-[3px] group-focus-visible:translate-x-[3px] group-hover:text-cyan-200 group-focus-visible:text-cyan-200"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path
            d="M6 3.5 10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
