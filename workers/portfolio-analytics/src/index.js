import { corsHeaders, optionsResponse, parseAllowedOrigins, resolveCorsOrigin } from "./cors.js";
import { handleAnalyticsPost } from "./handleAnalytics.js";

/**
 * Cloudflare Worker entry — portfolio analytics ingest only.
 * @param {Request} request
 * @param {import("./handleAnalytics.js").AnalyticsEnv & { ANALYTICS_ALLOWED_ORIGINS?: string }} env
 */
export default {
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.ANALYTICS_ALLOWED_ORIGINS);
    const origin = resolveCorsOrigin(request.headers.get("Origin"), allowed);
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return optionsResponse(origin);
    }

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/analytics") {
      return handleAnalyticsPost(request, env, { headers });
    }

    return new Response(null, { status: 404, headers });
  },
};
