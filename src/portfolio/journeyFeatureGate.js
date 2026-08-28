/**
 * TEMPORARY FEATURE GATE — Journey public visibility
 *
 * Journey stays fully available in local development and Vitest
 * (`import.meta.env.DEV` / `MODE === "test"`).
 * Production builds show a Coming Soon placeholder instead of the Journey UI.
 *
 * TO REMOVE WHEN JOURNEY IS READY:
 * 1. Delete this file.
 * 2. In RiskRadar.jsx, search for "JOURNEY_ENABLED" / "JourneyComingSoon" and
 *    restore unconditional JourneyTimeline + Journey detail panel rendering.
 */
export const JOURNEY_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === "test";
