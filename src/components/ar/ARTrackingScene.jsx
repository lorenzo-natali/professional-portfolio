import { useEffect, useRef } from "react";
import { useARTracking } from "./tracking/useARTracking";

/**
 * Owns the tracking lifecycle through the abstraction only.
 * Never imports MindAR directly.
 */
export default function ARTrackingScene({
  active,
  onReady,
  onTargetFound,
  onTargetLost,
  onError,
  onUnsupported,
}) {
  const containerRef = useRef(null);
  const { adapter } = useARTracking();
  const callbacksRef = useRef({ onReady, onTargetFound, onTargetLost, onError, onUnsupported });

  useEffect(() => {
    callbacksRef.current = { onReady, onTargetFound, onTargetLost, onError, onUnsupported };
  }, [onReady, onTargetFound, onTargetLost, onError, onUnsupported]);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return undefined;
    let cancelled = false;

    adapter.start(container, {
      onReady: () => {
        if (!cancelled) callbacksRef.current.onReady?.();
      },
      onTargetFound: () => {
        if (!cancelled) callbacksRef.current.onTargetFound?.();
      },
      onTargetLost: () => {
        if (!cancelled) callbacksRef.current.onTargetLost?.();
      },
      onError: (error) => {
        if (!cancelled) callbacksRef.current.onError?.(error);
      },
      onUnsupported: (reason) => {
        if (!cancelled) callbacksRef.current.onUnsupported?.(reason);
      },
    });

    return () => {
      cancelled = true;
      adapter.stop();
      container.innerHTML = "";
    };
  }, [active, adapter]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true" />;
}
