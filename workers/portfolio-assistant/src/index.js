import {
  corsHeaders,
  optionsResponse,
  parseAllowedOrigins,
  resolveCorsOrigin,
} from "./cors.js";
import { handleAskPost } from "./handleAsk.js";
import { handleHealthGet } from "./handleHealth.js";

/**
 * Cloudflare Worker entry — Portfolio Assistant Phase B (grounded OpenAI).
 * No frontend coupling. Secrets via env bindings only.
 *
 * @param {Request} request
 * @param {Record<string, any>} env
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
      return handleHealthGet(origin, env);
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
      return handleAskPost(request, origin, env);
    }

    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: corsHeaders(origin, {
        "Content-Type": "application/json; charset=utf-8",
      }),
    });
  },
};
