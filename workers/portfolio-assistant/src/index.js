import {
  corsHeaders,
  optionsResponse,
  parseAllowedOrigins,
  resolveCorsOrigin,
} from "./cors.js";
import { handleAskPost } from "./handleAsk.js";
import { handleHealthGet } from "./handleHealth.js";

/**
 * Cloudflare Worker entry — Portfolio Assistant Phase A skeleton.
 * No OpenAI, no persistence, no frontend coupling.
 *
 * @param {Request} request
 * @param {{ ASSISTANT_ALLOWED_ORIGINS?: string }} env
 */
export default {
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.ASSISTANT_ALLOWED_ORIGINS);
    const origin = resolveCorsOrigin(request.headers.get("Origin"), allowed);

    if (request.method === "OPTIONS") {
      return optionsResponse(origin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/health") {
      if (request.method !== "GET") {
        return new Response(
          JSON.stringify({ ok: false, error: "method_not_allowed" }),
          {
            status: 405,
            headers: corsHeaders(origin, {
              "Content-Type": "application/json; charset=utf-8",
              Allow: "GET, OPTIONS",
            }),
          },
        );
      }
      return handleHealthGet(origin);
    }

    if (path === "/ask") {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ ok: false, error: "method_not_allowed" }),
          {
            status: 405,
            headers: corsHeaders(origin, {
              "Content-Type": "application/json; charset=utf-8",
              Allow: "POST, OPTIONS",
            }),
          },
        );
      }
      return handleAskPost(request, origin);
    }

    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: corsHeaders(origin, {
        "Content-Type": "application/json; charset=utf-8",
      }),
    });
  },
};
