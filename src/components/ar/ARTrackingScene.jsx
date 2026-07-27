import { useEffect, useRef } from "react";
import { useARTracking } from "./tracking/useARTracking";

/**
 * Owns the tracking lifecycle through the abstraction only.
 * Fills the camera shell; stays transparent so MindAR video remains visible.
 *
 * Teardown: always await adapter.stop(). Session DOM clearing is owned by the
 * adapter cleanup (after MindAR stop) so React never wipes nodes mid-teardown.
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
  const callbacksRef = useRef({
    onReady,
    onTargetFound,
    onTargetLost,
    onError,
    onUnsupported,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onTargetFound,
      onTargetLost,
      onError,
      onUnsupported,
    };
  }, [onReady, onTargetFound, onTargetLost, onError, onUnsupported]);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return undefined;
    let cancelled = false;

    // start() itself awaits any in-flight stop/cleanup before constructing a session
    // (Safe under React StrictMode remount and rapid Close/reopen).
    void adapter.start(container, {
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
      // Kick teardown immediately so an in-flight start observes cleanupPromise /
      // sessionGeneration bump and aborts before onReady. Concurrent stop callers
      // share the same cleanup Promise; DOM clearing stays adapter-owned.
      void adapter.stop();
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
