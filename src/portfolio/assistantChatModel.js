/**
 * Presentation constants for the AI Portfolio Assistant chat shell.
 * No network, no model name, no fabricated answers.
 */

export const ASSISTANT_QUESTION_MAX_LENGTH = 500;

/** Show the character counter once the draft reaches this length. */
export const ASSISTANT_COUNTER_REVEAL_AT = 400;

export const ASSISTANT_WELCOME_MESSAGE =
  "Hi! I’m here to help you learn more about Lorenzo’s professional background, expertise, and projects. What would you like to know?";

/** Canonical disclaimer. The joined string stays in sync with the four paragraphs. */
export const ASSISTANT_ABOUT_PARAGRAPHS = [
  "This AI Assistant is powered by OpenAI and draws on information from Lorenzo's portfolio and additional background materials to provide deeper insights into his professional experience, projects, interests, and career journey.",
  "Responses are AI-generated and may contain inaccuracies. Please verify important information independently.",
  "To ensure fair access, the Assistant has a limited daily capacity. Please use it thoughtfully.",
  "Please do not share personal, confidential, or sensitive information.",
];

export const ASSISTANT_ABOUT_TEXT = ASSISTANT_ABOUT_PARAGRAPHS.join(" ");

export const ASSISTANT_UNAVAILABLE_MESSAGE =
  "AI Assistant is temporarily unavailable.";

export const ASSISTANT_ERROR_MESSAGE =
  "The assistant could not complete that request.";

export const ASSISTANT_VISITOR_LIMIT_MESSAGE =
  "You have reached today's question limit for this assistant. It resets at the next UTC day.";

export const ASSISTANT_GLOBAL_LIMIT_MESSAGE =
  "The assistant has reached its shared daily capacity. It resets at the next UTC day.";

export const ASSISTANT_BURST_MESSAGE = "Please wait a few seconds and try again.";

/** Covers POST /ask fetch and response.json. Longer than the Worker OpenAI timeout. */
export const ASSISTANT_ASK_TIMEOUT_MS = 25000;

/** Shown only when a message is explicitly marked development-only. */
export const DEVELOPMENT_PREVIEW_LABEL =
  "Development preview — not a live AI response";

/**
 * @param {string} value
 */
export function clampAssistantQuestion(value) {
  return String(value ?? "").slice(0, ASSISTANT_QUESTION_MAX_LENGTH);
}

/**
 * @param {string} value
 */
export function canSendAssistantQuestion(value) {
  return clampAssistantQuestion(value).trim().length > 0;
}

/**
 * Keep only signal ids that exist in the verified portfolio signal map
 * and already carry a label plus a navigation target.
 *
 * @param {unknown} signalIds
 * @param {Record<string, { label?: string, href?: string, target?: { type?: string, id?: string } }> | null | undefined} signalMap
 */
export function resolveVerifiedSignals(signalIds, signalMap) {
  if (!Array.isArray(signalIds) || !signalMap) return [];
  /** @type {Array<{ id: string, label: string, href: string, target: { type?: string, id?: string } }>} */
  const resolved = [];
  const seen = new Set();
  for (const signalId of signalIds) {
    if (typeof signalId !== "string" || seen.has(signalId)) continue;
    const signal = signalMap[signalId];
    if (!signal?.label || !signal.target) continue;
    seen.add(signalId);
    resolved.push({
      id: signalId,
      label: signal.label,
      href: signal.href ?? "#",
      target: signal.target,
    });
  }
  return resolved;
}
