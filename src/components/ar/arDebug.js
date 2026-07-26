/**
 * Development-only AR debug flags.
 * Constants must remain false in production builds unless intentionally flipped for a local session.
 */

/** Document-plane proof frame on the MindAR anchor. */
export const AR_SHOW_ANCHOR_PROOF = false;

/**
 * Force interest-objects layout debug even without `?arInterestsDebug=1`.
 * Keep false in committed code; enable locally while tuning poses.
 */
export const AR_INTERESTS_DEBUG = false;
