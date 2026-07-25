import { useMemo, useState } from "react";
import { createMindARTrackingAdapter } from "./MindARTrackingAdapter";
import { ARTrackingContext } from "./ARTrackingContext";

/**
 * Provides a tracking adapter to the AR experience.
 * Default implementation: MindAR. UI must not import MindAR directly.
 */
export function ARTrackingProvider({ children, createAdapter }) {
  const [adapter] = useState(() => (createAdapter || createMindARTrackingAdapter)());
  const value = useMemo(() => ({ adapter }), [adapter]);

  return <ARTrackingContext.Provider value={value}>{children}</ARTrackingContext.Provider>;
}
