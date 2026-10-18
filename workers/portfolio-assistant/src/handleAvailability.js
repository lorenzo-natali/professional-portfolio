import { corsHeaders } from "./cors.js";
import { readAskAvailability } from "./quota.js";

/**
 * Read-only daily quota state for the visitor identity POST /ask would use.
 * Does not consume quota and does not call OpenAI.
 *
 * @param {Request} request
 * @param {string | null} allowOrigin
 * @param {Record<string, any>} env
 * @param {number} [nowMs]
 * @returns {Promise<Response>}
 */
export async function handleAvailabilityGet(request, allowOrigin, env, nowMs = Date.now()) {
  const result = await readAskAvailability({ request, env, nowMs });
  const headers = corsHeaders(allowOrigin, {
    "Content-Type": "application/json; charset=utf-8",
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status: result.httpStatus,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      state: result.state,
      resets_at: result.resetsAt,
    }),
    {
      status: 200,
      headers,
    },
  );
}
