import { lazy, Suspense, useEffect, useState } from "react";
import {
  getAppFeaturesForSiteDiagMode,
  getSiteDiagSubsystemMatrix,
  isFullAppSiteDiagMode,
  isSiteDiagSubsystemEnabled,
  markSiteDiagInit,
} from "./siteDiag.js";
import { getPortfolioRuntimeOwnerMatrix } from "./portfolioRuntimeOwners.js";
import { getFullVsEffectsDeltaMatrix } from "./fullVsEffectsDelta.js";
import { getPortfolioSectionRuntimeAudit } from "./sectionRuntimeAudit.js";
import {
  getSectionLabel,
  getSectionsForSiteDiagMode,
} from "../portfolio/sectionCatalog.js";
import {
  PortfolioLifecycleAppProbe,
  PortfolioLifecycleBootBanner,
  SiteDiagTickerProbe,
} from "./PortfolioLifecycleBoundary.jsx";

const MotionEffectsBody = lazy(() => import("./SiteDiagMotionEffectsBody.jsx"));

const panelStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(1200px 600px at 20% -10%, rgba(34,211,238,0.12), transparent), linear-gradient(180deg, #020617 0%, #0f172a 55%, #020617 100%)",
  color: "#e2e8f0",
  fontFamily:
    '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  padding: "72px 20px 40px",
};

const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.45,
};

/**
 * True subtractive full-App variant loader.
 * Beyond modules are imported only when features.beyond is true.
 * Section bisection passes features.sections so App/PortfolioCore dynamic-imports
 * only that half/quarter (App does not statically import EAGER_SECTION_MODULES).
 */
function FullAppVariant({ mode }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const features = getAppFeaturesForSiteDiagMode(mode);
    async function load() {
      try {
        markSiteDiagInit("fullPortfolioApp", mode);
        markSiteDiagInit("runtimeCounters", mode);
        if (features.assistant) markSiteDiagInit("portfolioAssistant", mode);
        if (features.intro) markSiteDiagInit("portfolioIntro", mode);

        const sectionIds = getSectionsForSiteDiagMode(mode);
        if (sectionIds) {
          markSiteDiagInit("sectionBisect", sectionIds.join(","));
          for (const id of sectionIds) {
            markSiteDiagInit(`section:${id}`, mode);
          }
        }

        const [{ default: App }] = await Promise.all([import("../App.jsx")]);

        let beyondModules = null;
        if (features.beyond) {
          markSiteDiagInit("arBeyond", mode);
          markSiteDiagInit("canvasWebgl", "on-demand-when-open");
          if (features.preload) {
            markSiteDiagInit("arPreloadEager", mode);
            beyondModules = await import("../components/ar/beyondBundle.js");
          } else {
            beyondModules = await import(
              "../components/ar/beyondBundleDeferred.jsx"
            );
          }
        }

        if (!cancelled) {
          setPayload({ App, beyondModules, features });
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (error) {
    return (
      <div style={{ ...panelStyle, ...mono }}>
        Failed to load full App variant: {String(error?.message || error)}
      </div>
    );
  }

  if (!payload) {
    return <div style={{ ...panelStyle, ...mono }}>Loading full App variant…</div>;
  }

  const { App, beyondModules, features: f } = payload;
  return <App features={f} beyondModules={beyondModules} />;
}

/**
 * @param {{ mode: import("./siteDiag.js").SiteDiagMode }} props
 */
export default function SiteDiagRoot({ mode }) {
  useEffect(() => {
    markSiteDiagInit("lifecycleTrace", mode);
    markSiteDiagInit("reactRoot", mode);
    markSiteDiagInit("staticText", mode);
    if (isSiteDiagSubsystemEnabled(mode, "staticShell")) {
      markSiteDiagInit("staticShell", mode);
    }
    if (isSiteDiagSubsystemEnabled(mode, "framerMotion")) {
      markSiteDiagInit("framerMotion", mode);
    }
    if (isSiteDiagSubsystemEnabled(mode, "framerMotionInfinite")) {
      markSiteDiagInit("framerMotionInfinite", mode);
    }
    if (isSiteDiagSubsystemEnabled(mode, "tickerRaf")) {
      markSiteDiagInit("tickerRaf", mode);
    }
    if (isSiteDiagSubsystemEnabled(mode, "cssInfiniteAnimations")) {
      markSiteDiagInit("cssInfiniteAnimations", mode);
    }
  }, [mode]);

  const matrix = getSiteDiagSubsystemMatrix(mode);
  const audit = getPortfolioRuntimeOwnerMatrix();
  const delta = getFullVsEffectsDeltaMatrix();
  const sectionAudit = getPortfolioSectionRuntimeAudit();
  const sectionIds = getSectionsForSiteDiagMode(mode);

  if (isFullAppSiteDiagMode(mode)) {
    return (
      <>
        <PortfolioLifecycleBootBanner />
        <SiteDiagMatrixHud
          mode={mode}
          matrix={matrix}
          sectionIds={sectionIds}
          compact
        />
        <PortfolioLifecycleAppProbe>
          <FullAppVariant mode={mode} />
        </PortfolioLifecycleAppProbe>
      </>
    );
  }

  const rootStyle =
    mode === "blank"
      ? {
          minHeight: "100vh",
          background: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          padding: "72px 20px 40px",
        }
      : panelStyle;

  return (
    <div data-site-diag-root={mode} style={rootStyle}>
      <PortfolioLifecycleBootBanner />
      <header style={{ maxWidth: 720, margin: "0 auto 28px" }}>
        <p
          style={{
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 11,
            color: "#67e8f9",
            fontWeight: 600,
          }}
        >
          siteDiag
        </p>
        <h1 style={{ fontSize: 28, margin: "8px 0 10px", fontWeight: 650 }}>
          {mode === "blank"
            ? "Blank diagnostic shell"
            : mode === "shell"
              ? "Static shell"
              : mode === "motion"
                ? "Motion shell"
                : "Effects shell"}
        </h1>
        <p style={{ opacity: 0.82, maxWidth: 560 }}>
          Idle Safari reset isolation. This mode only enables the subsystems listed
          below. No automatic reloads.
        </p>
      </header>

      <SiteDiagMatrixHud mode={mode} matrix={matrix} />

      {mode === "blank" ? (
        <BlankBody />
      ) : mode === "shell" ? (
        <StaticShellBody />
      ) : (
        <Suspense fallback={<div style={mono}>Loading motion/effects body…</div>}>
          <MotionEffectsBody mode={mode} />
        </Suspense>
      )}

      {mode === "effects" ? <SiteDiagTickerProbe /> : null}

      <details style={{ maxWidth: 900, margin: "28px auto 0", ...mono }}>
        <summary style={{ cursor: "pointer" }}>
          Global runtime-owner audit (homepage)
        </summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, opacity: 0.9 }}>
          {audit
            .map(
              (row) =>
                `${row.subsystem} | homepage=${row.mountedOnHomepage} | ${row.loopListenerObserver} | cleanup=${row.cleanup} | risk=${row.suspectedRisk}`,
            )
            .join("\n")}
        </pre>
      </details>

      <details style={{ maxWidth: 900, margin: "16px auto 0", ...mono }}>
        <summary style={{ cursor: "pointer" }}>
          Full App vs siteDiag=effects delta
        </summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, opacity: 0.9 }}>
          {delta
            .map(
              (row) =>
                `${row.file} | homepage=${row.mountedOnHomepage} | beforeInteract=${row.startsBeforeUserInteraction} | longLived=${row.longLivedResource} | cleanup=${row.cleanup} | beyondEra=${row.introducedOrChangedDuringBeyond} | risk=${row.risk}`,
            )
            .join("\n")}
        </pre>
      </details>

      <details style={{ maxWidth: 900, margin: "16px auto 0", ...mono }}>
        <summary style={{ cursor: "pointer" }}>
          Per-section runtime audit
        </summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, opacity: 0.9 }}>
          {sectionAudit
            .map(
              (row) =>
                `${row.section} | ${row.files} | runtime=${row.continuousRuntime} | css=${row.compositorHeavyCss} | observers=${row.observers} | cleanup=${row.cleanup} | risk=${row.risk}`,
            )
            .join("\n")}
        </pre>
      </details>
    </div>
  );
}

function BlankBody() {
  return (
    <div data-site-diag-blank="1" style={{ maxWidth: 640, margin: "0 auto", ...mono }}>
      <p>Static React text only.</p>
      <p>No portfolio sections · no animation · no decorative runtime.</p>
    </div>
  );
}

function StaticShellBody() {
  return (
    <div data-site-diag-shell="shell" style={{ maxWidth: 900, margin: "0 auto" }}>
      <section
        style={{
          borderTop: "1px solid rgba(51,65,85,0.8)",
          padding: "20px 0",
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>About</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
          Static layout and typography shell for crash isolation. Assistant, AR,
          canvas and WebGL stay off in this mode.
        </p>
      </section>
      <section
        style={{
          borderTop: "1px solid rgba(51,65,85,0.8)",
          padding: "20px 0",
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Experience</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
          Risk · Controls · Technology — static section copy only.
        </p>
      </section>
      <p style={{ ...mono, marginTop: 20, opacity: 0.7 }}>
        Disabled by contract: framerMotion · tickerRaf · cssInfiniteAnimations ·
        portfolioAssistant · arBeyond · canvasWebgl
      </p>
    </div>
  );
}

function SiteDiagMatrixHud({ mode, matrix, sectionIds = null, compact = false }) {
  return (
    <div
      data-site-diag-matrix={mode}
      style={{
        ...(compact
          ? {
              position: "fixed",
              top: 8,
              right: 8,
              zIndex: 2147483000,
              maxWidth: 300,
              maxHeight: "70vh",
              overflow: "auto",
            }
          : {
              maxWidth: 720,
              margin: "0 auto 24px",
            }),
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.4)",
        background: "rgba(15,23,42,0.92)",
        ...mono,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        enabled subsystems · siteDiag={mode}
      </div>
      {sectionIds ? (
        <div
          data-site-diag-sections={mode}
          style={{ marginBottom: 8, opacity: 0.95 }}
        >
          sections:{" "}
          {sectionIds.map((id) => getSectionLabel(id)).join(" · ")}
        </div>
      ) : null}
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {matrix.map((row) => (
          <li
            key={row.id}
            data-site-diag-subsystem={row.id}
            data-enabled={row.enabled ? "1" : "0"}
          >
            {row.enabled ? "ON " : "off"} · {row.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
