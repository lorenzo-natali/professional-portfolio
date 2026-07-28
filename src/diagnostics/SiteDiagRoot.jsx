import { lazy, Suspense, useEffect } from "react";
import {
  getSiteDiagSubsystemMatrix,
  isSiteDiagSubsystemEnabled,
  markSiteDiagInit,
} from "./siteDiag.js";
import { getPortfolioRuntimeOwnerMatrix } from "./portfolioRuntimeOwners.js";
import {
  PortfolioLifecycleAppProbe,
  PortfolioLifecycleBootBanner,
  SiteDiagTickerProbe,
} from "./PortfolioLifecycleBoundary.jsx";

const FullPortfolioApp = lazy(() => import("../App.jsx"));
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
    if (isSiteDiagSubsystemEnabled(mode, "fullPortfolioApp")) {
      markSiteDiagInit("fullPortfolioApp", mode);
      markSiteDiagInit("portfolioAssistant", "via-full-app");
      markSiteDiagInit("portfolioIntro", "via-full-app");
      markSiteDiagInit("arBeyond", "via-full-app-on-demand");
      markSiteDiagInit("canvasWebgl", "via-ar-on-demand");
    }
  }, [mode]);

  const matrix = getSiteDiagSubsystemMatrix(mode);
  const audit = getPortfolioRuntimeOwnerMatrix();

  if (mode === "full") {
    return (
      <>
        <PortfolioLifecycleBootBanner />
        <SiteDiagMatrixHud mode={mode} matrix={matrix} compact />
        <PortfolioLifecycleAppProbe>
          <Suspense
            fallback={
              <div style={{ ...panelStyle, ...mono }}>Loading full portfolio…</div>
            }
          >
            <FullPortfolioApp />
          </Suspense>
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

function SiteDiagMatrixHud({ mode, matrix, compact = false }) {
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
              maxWidth: 280,
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
