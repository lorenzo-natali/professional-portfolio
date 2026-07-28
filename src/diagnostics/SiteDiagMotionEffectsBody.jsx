import { motion } from "framer-motion";
import { isSiteDiagSubsystemEnabled } from "./siteDiag.js";

/**
 * Lazy-loaded Framer Motion body for siteDiag=motion|effects only.
 * blank/shell never import this module.
 *
 * @param {{ mode: "motion" | "effects" }} props
 */
export default function SiteDiagMotionEffectsBody({ mode }) {
  const enableInfinite = isSiteDiagSubsystemEnabled(mode, "framerMotionInfinite");
  const enableCssFx = isSiteDiagSubsystemEnabled(mode, "cssInfiniteAnimations");

  return (
    <div data-site-diag-shell={mode} style={{ maxWidth: 900, margin: "0 auto" }}>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          borderTop: "1px solid rgba(51,65,85,0.8)",
          padding: "20px 0",
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>About</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
          Shell plus Framer Motion. Assistant, AR, canvas and WebGL stay off.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
        style={{
          borderTop: "1px solid rgba(51,65,85,0.8)",
          padding: "20px 0",
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Experience</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
          Risk · Controls · Technology — motion-enabled section copy.
        </p>
        {enableInfinite ? (
          <div style={{ position: "relative", width: 48, height: 48, marginTop: 16 }}>
            <motion.span
              data-site-diag-infinite-pulse="1"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                border: "1px solid rgba(34,211,238,0.55)",
              }}
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: [0.45, 1.7], opacity: [0, 0.65, 0] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
        ) : null}
      </motion.section>

      {enableCssFx ? (
        <div
          data-site-diag-css-fx="1"
          className="role-lens-highlight-cyan"
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(34,211,238,0.35)",
          }}
        >
          CSS infinite lens-glow / highlight class attached (homepage visual effects class).
        </div>
      ) : null}

      <p
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          marginTop: 20,
          opacity: 0.7,
        }}
      >
        Disabled by contract: portfolioAssistant · arBeyond · canvasWebgl
        {mode === "motion"
          ? " · tickerRaf · framerMotionInfinite · cssInfiniteAnimations"
          : ""}
      </p>
    </div>
  );
}
