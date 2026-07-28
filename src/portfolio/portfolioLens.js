import { lensRelevance, roleLenses } from "./portfolioData.js";

export const lensOptions = roleLenses.filter((lens) => lens.name !== "Overview");

export function isOverviewLens(selectedLens) {
  return selectedLens === "Overview";
}

export function isLensRelevant(selectedLens, group, value) {
  if (isOverviewLens(selectedLens)) return true;
  return lensRelevance[selectedLens]?.[group]?.includes(value) ?? false;
}

export function lensSurfaceClass(selectedLens, group, value, accent = "cyan") {
  if (isOverviewLens(selectedLens)) return "";
  if (isLensRelevant(selectedLens, group, value)) {
    return accent === "violet"
      ? "role-lens-highlight-violet border-violet-300/60 bg-violet-400/[0.095] opacity-100"
      : "role-lens-highlight-cyan border-cyan-300/60 bg-cyan-400/[0.095] opacity-100";
  }
  return "opacity-55";
}

export function getRadarTone(maturity) {
  if (maturity === "Primary domain") {
    return {
      activeDot: "border-cyan-100 bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
      pulsePrimary: "border-cyan-300/45 shadow-[0_0_18px_rgba(34,211,238,0.24)]",
      pulseSecondary: "border-cyan-200/25",
      badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
      dot: "bg-cyan-300",
      link: "text-cyan-100 hover:text-cyan-50",
    };
  }

  if (maturity === "Developing domain") {
    return {
      activeDot: "border-violet-200 bg-violet-300 shadow-[0_0_24px_rgba(167,139,250,0.34)]",
      pulsePrimary: "border-violet-300/45 shadow-[0_0_18px_rgba(167,139,250,0.22)]",
      pulseSecondary: "border-violet-200/25",
      badge: "border-violet-400/25 bg-violet-400/10 text-violet-100",
      dot: "bg-violet-300",
      link: "text-violet-100 hover:text-violet-50",
    };
  }

  return {
    activeDot: "border-amber-100 bg-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.28)]",
    pulsePrimary: "border-amber-300/40 shadow-[0_0_18px_rgba(252,211,77,0.18)]",
    pulseSecondary: "border-amber-200/22",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    dot: "bg-amber-300",
    link: "text-amber-100 hover:text-amber-50",
  };
}

export function getCoverageTone(band) {
  if (band === "STRONG") {
    return {
      badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
      dot: "bg-cyan-300",
      link: "text-cyan-100 hover:text-cyan-50",
    };
  }

  if (band === "DEVELOPING") {
    return {
      badge: "border-violet-400/25 bg-violet-400/10 text-violet-100",
      dot: "bg-violet-300",
      link: "text-violet-100 hover:text-violet-50",
    };
  }

  return {
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    dot: "bg-amber-300",
    link: "text-amber-100 hover:text-amber-50",
  };
}
