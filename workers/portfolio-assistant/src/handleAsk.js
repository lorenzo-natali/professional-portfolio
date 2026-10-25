import { corsHeaders } from "./cors.js";
import { BEYOND_CV_ACTION, isBeyondCvEligible } from "./knowledge/beyondCvEligibility.js";
import {
  evaluateEvidenceSufficiency,
  evaluatePrivateOrUnsupportedGate,
  INSUFFICIENT_EVIDENCE_ANSWER,
  localizeWorkerAnswer,
  toPublicEvidence,
} from "./knowledge/gates.js";
import { analyzeQuery, retrieveKnowledge } from "./knowledge/retrieve.js";
import {
  createGroundedAnswer,
  hasOpenAiApiKey,
  isAssistantAiEnabled,
} from "./openai/client.js";
import { consumeAskQuota } from "./quota.js";
import { readAskJsonBody } from "./readAskJsonBody.js";
import { isAllowedAskContentType, validateAskBody } from "./validate.js";

/**
 * @param {number} status
 * @param {string | null} allowOrigin
 * @param {{ ok: false, error: string }} payload
 */
function jsonError(status, allowOrigin, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(allowOrigin, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}

/**
 * Sufficiency failures that are safety refusals, not missing portfolio evidence.
 * An eligible personal-interest question may invite Beyond CV only for the latter.
 */
const EVIDENCE_REASONS_WITHOUT_BEYOND_CV = new Set([
  "private_information",
  "injection_probe",
]);

/**
 * Beyond CV may accompany a missing-evidence answer only after privacy and
 * safety gates have passed. Instruction probes stay refusals without an invite.
 * @param {string} question
 * @param {string} [reason]
 */
function mayInviteBeyondCv(question, reason) {
  if (!isBeyondCvEligible(question)) return false;
  if (reason && EVIDENCE_REASONS_WITHOUT_BEYOND_CV.has(reason)) return false;
  if (analyzeQuery(question).concepts.includes("injection")) return false;
  return true;
}

/**
 * @param {string | null} allowOrigin
 * @param {string} question
 * @param {string} answer
 * @param {{ beyondCv?: boolean }} [options]
 */
function localAnswer(allowOrigin, question, answer, options = {}) {
  const payload = {
    ok: true,
    answer: localizeWorkerAnswer(question, answer),
    evidence: [],
  };
  if (options.beyondCv) {
    payload.action = BEYOND_CV_ACTION;
  }
  return new Response(
    JSON.stringify(payload),
    {
      status: 200,
      headers: corsHeaders(allowOrigin, {
        "Content-Type": "application/json; charset=utf-8",
      }),
    },
  );
}

/**
 * Phase B /ask — grounded OpenAI Responses API (single-turn) with retrieval + sufficiency gates.
 *
 * @param {Request} request
 * @param {string | null} allowOrigin
 * @param {Record<string, any>} env
 * @param {{ fetchImpl?: typeof fetch, createAnswer?: typeof createGroundedAnswer }} [deps]
 * @returns {Promise<Response>}
 */
export async function handleAskPost(request, allowOrigin, env, deps = {}) {
  if (!isAllowedAskContentType(request.headers.get("content-type"))) {
    return jsonError(415, allowOrigin, {
      ok: false,
      error: "unsupported_media_type",
    });
  }

  const bodyRead = await readAskJsonBody(request);
  if (!bodyRead.ok) {
    return jsonError(bodyRead.httpStatus, allowOrigin, {
      ok: false,
      error: bodyRead.error,
    });
  }

  const result = validateAskBody(bodyRead.value);
  if (!result.ok) {
    return jsonError(result.httpStatus, allowOrigin, {
      ok: false,
      error: result.error.code,
    });
  }

  if (!isAssistantAiEnabled(env)) {
    return jsonError(503, allowOrigin, {
      ok: false,
      error: "server_configuration_error",
    });
  }

  if (!hasOpenAiApiKey(env)) {
    return jsonError(503, allowOrigin, {
      ok: false,
      error: "server_configuration_error",
    });
  }

  const privateGate = evaluatePrivateOrUnsupportedGate(result.question);
  if (privateGate.blocked) {
    return localAnswer(allowOrigin, result.question, privateGate.answer);
  }

  const retrieved = retrieveKnowledge(result.question);
  if (retrieved.length === 0) {
    return localAnswer(allowOrigin, result.question, INSUFFICIENT_EVIDENCE_ANSWER, {
      beyondCv: mayInviteBeyondCv(result.question, "no_evidence"),
    });
  }

  const sufficiency = evaluateEvidenceSufficiency({
    question: result.question,
    evidence: retrieved,
  });
  if (!sufficiency.ok) {
    return localAnswer(allowOrigin, result.question, sufficiency.answer, {
      beyondCv: mayInviteBeyondCv(result.question, sufficiency.reason),
    });
  }

  const quota = await consumeAskQuota({ request, env });
  if (!quota.ok) {
    return jsonError(quota.httpStatus, allowOrigin, {
      ok: false,
      error: quota.error,
    });
  }

  const createAnswer = deps.createAnswer || createGroundedAnswer;
  const ai = await createAnswer({
    apiKey: String(env.OPENAI_API_KEY),
    question: result.question,
    evidence: retrieved.map(({ id, topic, claimType, narrativeType, text }) => ({
      id,
      topic,
      claimType,
      ...(narrativeType ? { narrativeType } : {}),
      text,
    })),
    fetchImpl: deps.fetchImpl,
  });

  if (!ai.ok) {
    return jsonError(ai.httpStatus, allowOrigin, {
      ok: false,
      error: ai.error,
    });
  }

  const payload = {
    ok: true,
    answer: ai.answer,
    evidence: toPublicEvidence(retrieved),
  };
  if (isBeyondCvEligible(result.question)) payload.action = BEYOND_CV_ACTION;

  return new Response(
    JSON.stringify(payload),
    {
      status: 200,
      headers: corsHeaders(allowOrigin, {
        "Content-Type": "application/json; charset=utf-8",
      }),
    },
  );
}
