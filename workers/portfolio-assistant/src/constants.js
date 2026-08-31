/**
 * Phase A Portfolio Assistant Worker — request limits and static markers.
 * No OpenAI, no persistence, no tracking.
 */

/** Conservative free-form question cap (characters). */
export const MAX_QUESTION_LENGTH = 500;

/** Service identity for /health and Phase-A stub responses. */
export const SERVICE_NAME = "portfolio-assistant";

export const PHASE = "A";
