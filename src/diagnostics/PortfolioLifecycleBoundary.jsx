import { Component, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace";

/**
 * Diagnostic ErrorBoundary — records to lifecycle trace.
 * Does NOT redirect to homepage and does NOT call location.reload.
 */
export class PortfolioLifecycleBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try {
      getPortfolioLifecycleTrace()?.recordErrorBoundary?.(error, info);
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error instanceof Error
          ? this.state.error.message
          : String(this.state.error);
      return (
        <div
          data-site-diag-error-boundary="1"
          style={{
            minHeight: "100vh",
            padding: 24,
            background: "#0f172a",
            color: "#e2e8f0",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>siteDiag ErrorBoundary</h1>
          <p style={{ opacity: 0.85, marginBottom: 12 }}>
            Recorded to __portfolioLifecycleTrace — no automatic reload or homepage redirect.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{message}</pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f8fafc",
            }}
            onClick={() => this.setState({ error: null })}
          >
            Dismiss (stay on this document)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Records App mount/unmount into the lifecycle trace (full mode).
 */
export function PortfolioLifecycleAppProbe({ children }) {
  useEffect(() => {
    getPortfolioLifecycleTrace()?.recordAppMount?.();
    return () => {
      getPortfolioLifecycleTrace()?.recordAppUnmount?.();
    };
  }, []);
  return children;
}

/**
 * Boot banner: current/previous documentBootId + previous session end.
 */
export function PortfolioLifecycleBootBanner() {
  const [summary, setSummary] = useState(() =>
    getPortfolioLifecycleTrace()?.buildSummary?.() ?? null,
  );

  useEffect(() => {
    const tick = () => {
      setSummary(getPortfolioLifecycleTrace()?.buildSummary?.() ?? null);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!summary || summary.enabled === false) return null;

  return (
    <div
      data-site-diag-boot-banner="1"
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2147483000,
        maxWidth: "min(92vw, 420px)",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.45)",
        background: "rgba(15,23,42,0.92)",
        color: "#e2e8f0",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>portfolio lifecycle</div>
      <div>boot: {summary.documentBootId}</div>
      <div>prev: {summary.previousDocumentBootId ?? "none"}</div>
      <div>prevEnd: {summary.previousSessionEnd}</div>
      <div>
        nav: {summary.navigationType} · t={Math.round((summary.elapsedMs || 0) / 1000)}s
      </div>
      <div>
        roots: {summary.reactRootMountCount} · app↑{summary.appMountCount}/↓
        {summary.appUnmountCount}
      </div>
      <div style={{ opacity: 0.8, marginTop: 4 }}>
        last: {summary.lastReason ?? "—"}
      </div>
      <button
        type="button"
        style={{
          marginTop: 8,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid #475569",
          background: "#1e293b",
          color: "#f8fafc",
          fontSize: 11,
        }}
        onClick={() => {
          void getPortfolioLifecycleTrace()?.copy?.();
        }}
      >
        Copy lifecycle
      </button>
    </div>
  );
}

/**
 * Fixed-size owner probe for ticker rAF (effects mode).
 * One owner only — proves a single rAF chain.
 */
export function SiteDiagTickerProbe() {
  const trackRef = useRef(null);
  const [frames, setFrames] = useState(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    let offset = 0;
    let half = 0;
    let last = 0;
    let frameId = 0;
    let count = 0;

    const measure = () => {
      half = el.scrollWidth / 2 || 1;
    };

    const animate = (time) => {
      if (!last) last = time;
      const delta = (time - last) / 1000;
      last = time;
      offset -= 28 * delta;
      if (offset <= -half) offset += half;
      el.style.transform = `translate3d(${offset}px, 0, 0)`;
      count += 1;
      if (count % 30 === 0) setFrames(count);
      frameId = requestAnimationFrame(animate);
    };

    measure();
    let ro = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      ro?.disconnect?.();
    };
  }, []);

  return (
    <div data-site-diag-ticker="1" style={{ overflow: "hidden", marginTop: 16 }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
        tickerRaf owner=SiteDiagTickerProbe frames≈{frames}
      </div>
      <div
        ref={trackRef}
        style={{ display: "flex", width: "max-content", whiteSpace: "nowrap", gap: 24 }}
      >
        {["Risk", "Controls", "Technology", "Risk", "Controls", "Technology"].map(
          (label, i) => (
            <span key={`${label}-${i}`} style={{ opacity: 0.9 }}>
              {label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
