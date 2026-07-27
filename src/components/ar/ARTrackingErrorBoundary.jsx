import { Component } from "react";

/**
 * Narrow error boundary for the live AR tracking subtree.
 * Records diagnostics and notifies the parent fallback without closing the portal
 * or setting arOpen(false).
 */
export class ARTrackingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "ar-tracking-render-error";
    try {
      if (typeof window !== "undefined") {
        window.__arRotateAudit?.note?.("windowError", {
          message: String(message).slice(0, 160),
          componentStack: String(info?.componentStack || "").slice(0, 240),
        });
        window.__arRotateAudit?.note?.("application_fallback", {
          cleanupReason: "tracking-error-boundary",
        });
        window.__arRotateAudit?.persistNow?.();
      }
    } catch {
      // Diagnostics must never affect WebAR.
    }
    try {
      this.props.onError?.(error instanceof Error ? error : new Error(String(error)));
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default ARTrackingErrorBoundary;
