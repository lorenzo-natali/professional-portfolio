import { PHASE } from "./constants.js";
import { corsHeaders } from "./cors.js";
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
 * Phase A /ask — validate input and return a deterministic stub (no OpenAI).
 *
 * @param {Request} request
 * @param {string | null} allowOrigin
 * @returns {Promise<Response>}
 */
export async function handleAskPost(request, allowOrigin) {
  if (!isAllowedAskContentType(request.headers.get("content-type"))) {
    return jsonError(415, allowOrigin, {
      ok: false,
      error: "unsupported_media_type",
    });
  }

  let parsed;
  try {
    parsed = await request.json();
  } catch {
    return jsonError(400, allowOrigin, {
      ok: false,
      error: "malformed_json",
    });
  }

  const result = validateAskBody(parsed);
  if (!result.ok) {
    return jsonError(result.httpStatus, allowOrigin, {
      ok: false,
      error: result.error.code,
    });
  }

  const body = JSON.stringify({
    ok: true,
    phase: PHASE,
    stub: true,
    openai: false,
    echo: {
      question: result.question,
    },
    answer:
      "Phase A deterministic stub. OpenAI is not connected. Your question was received and validated.",
  });

  return new Response(body, {
    status: 200,
    headers: corsHeaders(allowOrigin, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}
