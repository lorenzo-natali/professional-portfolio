/**
 * DEV preview for MindAR tracking-feature experiments.
 * Reads public/ar/targets/experiments/* only — never touches live AR paths.
 */

const BASE = `${import.meta.env.BASE_URL || "./"}`.replace(/\/?$/, "/");
const EXP = `${BASE}ar/targets/experiments/`;

const ORDER = ["baseline", "contrast", "feature-balanced", "combined"];

function fmtBands(bands) {
  if (!bands) return "—";
  return `T${bands.top}/M${bands.middle}/B${bands.bottom}`;
}

function cardHtml(variant, showOverlay) {
  const t0 = variant.trackingLevels?.[0];
  const t1 = variant.trackingLevels?.[1];
  const img = showOverlay
    ? `${EXP}overlay-${variant.id}.jpg`
    : `${EXP}${variant.png}`;
  const mindLabel = variant.mind?.startsWith("..")
    ? "live cv-page-1.mind (read-only)"
    : variant.mind;
  const meta = [
    `mind: ${mindLabel}`,
    `mind bytes: ${variant.mindBytes?.toLocaleString?.() ?? variant.mindBytes}`,
    `detection all: ${fmtBands(variant.detectionAll)} (${variant.detectionAll?.total ?? 0})`,
    `tracking L0: ${t0?.total ?? 0} → ${fmtBands(t0?.bands)}`,
    `tracking L1: ${t1?.total ?? 0} → ${fmtBands(t1?.bands)}`,
    `ink bottom15%: white ${variant.ink?.bottom15?.whitePct}% · dark ${variant.ink?.bottom15?.darkPct}%`,
    `score: ${variant.ranking?.score?.toFixed?.(2) ?? "—"}`,
  ].join("\n");

  return `
    <article class="card" data-id="${variant.id}">
      <h2>${variant.label} <span>${variant.id}</span></h2>
      <img src="${img}" alt="${variant.label}" loading="lazy" />
      <div class="meta">${meta}</div>
    </article>
  `;
}

async function loadReport() {
  const res = await fetch(`${EXP}experiment-report.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Missing experiment report (${res.status})`);
  return res.json();
}

function render(report, showOverlay) {
  const byId = Object.fromEntries(report.variants.map((v) => [v.id, v]));
  const grid = document.getElementById("grid");
  grid.innerHTML = ORDER.map((id) => cardHtml(byId[id], showOverlay)).join("");

  const rec = document.getElementById("rec");
  const r = report.recommendations || {};
  const base = byId.baseline?.trackingLevels?.[0];
  const best = byId[r.technicallyBest]?.trackingLevels?.[0];
  rec.innerHTML = `
    <strong>Recommendations</strong><br/>
    Technically best: <code>${r.technicallyBest}</code> ·
    iPhone test candidate: <code>${r.iphoneTestCandidate}</code><br/>
    Contrast alone helps tracking bands: <code>${r.contrastAloneHelps}</code> ·
    Graphics needed vs contrast: <code>${r.graphicsNeeded}</code><br/>
    Baseline L0 ${base?.total} (${fmtBands(base?.bands)}) →
    best L0 ${best?.total} (${fmtBands(best?.bands)})<br/>
    Live guards: PNG/MIND untouched = <code>${report.liveGuards?.liveFilesUntouched}</code>
  `;
}

async function boot() {
  const showOverlayEl = document.getElementById("showOverlay");
  const reloadBtn = document.getElementById("reload");
  let report = await loadReport();
  render(report, showOverlayEl.checked);

  showOverlayEl.addEventListener("change", () => {
    render(report, showOverlayEl.checked);
  });
  reloadBtn.addEventListener("click", async () => {
    report = await loadReport();
    render(report, showOverlayEl.checked);
  });
}

boot().catch((err) => {
  document.getElementById("rec").textContent = String(err?.message || err);
});
