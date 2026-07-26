/**
 * Shared AR session timing constants.
 *
 * Stabilizer pose-filter reset and Professional Evolution entrance reset must
 * use the same continuous-loss threshold so brief jitter cannot desync them.
 */
export const AR_SESSION_RESET_MS = 1400;
