import { PHASE, SERVICE_NAME } from "./constants.js";
import { corsHeaders } from "./cors.js";

/**
 * @param {string | null} allowOrigin
 * @returns {Response}
 */
export function handleHealthGet(allowOrigin) {
  const body = JSON.stringify({
    ok: true,
    service: SERVICE_NAME,
    phase: PHASE,
    openai: false,
  });
  return new Response(body, {
    status: 200,
    headers: corsHeaders(allowOrigin, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}
