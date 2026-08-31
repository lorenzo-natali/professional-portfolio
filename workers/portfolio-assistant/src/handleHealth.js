import { PHASE, SERVICE_NAME } from "./constants.js";
import { corsHeaders } from "./cors.js";
import { hasOpenAiApiKey, isAssistantAiEnabled } from "./openai/client.js";

/**
 * @param {string | null} allowOrigin
 * @param {{ OPENAI_API_KEY?: string, ASSISTANT_AI_ENABLED?: string, QUOTA_KV?: unknown }} env
 * @returns {Response}
 */
export function handleHealthGet(allowOrigin, env = {}) {
  const aiEnabled = isAssistantAiEnabled(env);
  const keyPresent = hasOpenAiApiKey(env);
  const quotaReady = Boolean(env.QUOTA_KV);
  const openaiReady = aiEnabled && keyPresent && quotaReady;

  const body = JSON.stringify({
    ok: true,
    service: SERVICE_NAME,
    phase: PHASE,
    openai: openaiReady,
    ai_enabled: aiEnabled,
    openai_configured: keyPresent,
    quota_configured: quotaReady,
  });
  return new Response(body, {
    status: 200,
    headers: corsHeaders(allowOrigin, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}
