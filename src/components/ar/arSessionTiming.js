/**
 * Shared AR session timing constants.
 *
 * Pose-filter reset after continuous target loss uses this threshold so brief
 * jitter cannot desync stabilizer and session lifecycle.
 */
export const AR_SESSION_RESET_MS = 1400;
