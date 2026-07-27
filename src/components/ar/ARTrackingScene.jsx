import { useEffect, useRef } from "react";
import { useARTracking } from "./tracking/useARTracking";

/**
 * Owns the tracking lifecycle through the abstraction only.
 * Fills the camera shell; stays transparent so MindAR video remains visible.
 */
export default function ARTrackingScene({
  active,
  onReady,
  onTargetFound,
  onTargetLost,
  onInterestOpen,
  onError,
  onUnsupported,
}) {
  const containerRef = useRef(null);
  const { adapter } = useARTracking();
  const callbacksRef = useRef({
    onReady,
    onTargetFound,
    onTargetLost,
    onInterestOpen,
    onError,
    onUnsupported,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onTargetFound,
      onTargetLost,
      onInterestOpen,
      onError,
      onUnsupported,
    };
  }, [onReady, onTargetFound, onTargetLost, onInterestOpen, onError, onUnsupported]);

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
      onInterestOpen: (id) => {
        if (!cancelled) callbacksRef.current.onInterestOpen?.(id);
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

  return (
    <div
      ref={containerRef}
      data-ar-tracking-container="true"
      className="ar-tracking-container"
      aria-hidden="true"
    />
  );
}
