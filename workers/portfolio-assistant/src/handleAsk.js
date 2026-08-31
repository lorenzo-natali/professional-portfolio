import { corsHeaders } from "./cors.js";
import {
  evaluateEvidenceSufficiency,
  evaluatePrivateOrUnsupportedGate,
  INSUFFICIENT_EVIDENCE_ANSWER,
  toPublicEvidence,
} from "./knowledge/gates.js";
import { retrieveKnowledge } from "./knowledge/retrieve.js";
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
 * @param {string | null} allowOrigin
 * @param {string} answer
 */
function localAnswer(allowOrigin, answer) {
  return new Response(
    JSON.stringify({
      ok: true,
      answer,
      evidence: [],
    }),
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
    return localAnswer(allowOrigin, privateGate.answer);
  }

  const retrieved = retrieveKnowledge(result.question);
  if (retrieved.length === 0) {
    return localAnswer(allowOrigin, INSUFFICIENT_EVIDENCE_ANSWER);
  }

  const sufficiency = evaluateEvidenceSufficiency({
    question: result.question,
    evidence: retrieved,
  });
  if (!sufficiency.ok) {
    return localAnswer(allowOrigin, sufficiency.answer);
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

  return new Response(
    JSON.stringify({
      ok: true,
      answer: ai.answer,
      evidence: toPublicEvidence(retrieved),
    }),
    {
      status: 200,
      headers: corsHeaders(allowOrigin, {
        "Content-Type": "application/json; charset=utf-8",
      }),
    },
  );
}
