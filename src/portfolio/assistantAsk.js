import { BEYOND_CV_ACTION } from "./beyondCvEasterEgg.js";

const PROVIDER_ERRORS = new Set([
  "openai_timeout",
  "openai_unavailable",
  "invalid_provider_response",
]);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}

/**
 * Public portfolio links only. Evidence ids, topics, and claim metadata are not shown.
 * @param {unknown} evidence
 */
export function signalIdsFromEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];
  /** @type {string[]} */
  const ids = [];
  for (const item of evidence) {
    if (!isRecord(item) || !Array.isArray(item.signalIds)) continue;
    for (const signalId of item.signalIds) {
      if (typeof signalId === "string") ids.push(signalId);
    }
  }
  return ids;
}

/**
 * Classify one POST /ask result. Does not retry or infer a quota color from HTTP 429 alone.
 * @param {number} httpStatus
 * @param {unknown} body
 * @returns {{ type: "answer", answer: string, signalIds: string[], action?: string } | { type: "quota" } | { type: "provider" } | { type: "invalid" }}
 */
export function interpretAskResult(httpStatus, body) {
  if (httpStatus === 429 && isRecord(body) && body.ok === false && body.error === "quota_exceeded") {
    return { type: "quota" };
  }
  if (isRecord(body) && body.ok === false && PROVIDER_ERRORS.has(String(body.error))) {
    return { type: "provider" };
  }
  if (
    httpStatus === 200 &&
    isRecord(body) &&
    body.ok === true &&
    typeof body.answer === "string" &&
    body.answer.trim() &&
    Array.isArray(body.evidence)
  ) {
    const result = {
      type: "answer",
      answer: body.answer,
      signalIds: signalIdsFromEvidence(body.evidence),
    };
    if (body.action === BEYOND_CV_ACTION) result.action = BEYOND_CV_ACTION;
    return result;
  }
  return { type: "invalid" };
}
