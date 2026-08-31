import {
  OPENAI_MAX_OUTPUT_TOKENS,
  OPENAI_MODEL,
  OPENAI_RESPONSES_URL,
  OPENAI_TIMEOUT_MS,
} from "../constants.js";
import {
  buildUserEvidenceMessage,
  extractOutputText,
  getSystemInstructions,
} from "./prompt.js";

/**
 * @typedef {{
 *   ok: true,
 *   answer: string
 * } | {
 *   ok: false,
 *   error:
 *     | "openai_timeout"
 *     | "openai_unavailable"
 *     | "openai_rate_limited"
 *     | "invalid_provider_response"
 *     | "server_configuration_error",
 *   httpStatus: number
 * }} OpenAiAskResult
 */

/**
 * @param {unknown} env
 * @returns {boolean}
 */
export function isAssistantAiEnabled(env) {
  const raw = env && typeof env === "object" ? /** @type {any} */ (env).ASSISTANT_AI_ENABLED : undefined;
  if (raw === undefined || raw === null || raw === "") return true;
  const v = String(raw).trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off" || v === "no");
}

/**
 * @param {unknown} env
 * @returns {boolean}
 */
export function hasOpenAiApiKey(env) {
  const key = env && typeof env === "object" ? /** @type {any} */ (env).OPENAI_API_KEY : undefined;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Single-turn OpenAI Responses API call. No tools, no store, fixed model.
 *
 * @param {{
 *   apiKey: string,
 *   question: string,
 *   evidence: Array<{ id: string, topic: string, text: string }>,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 * }} args
 * @returns {Promise<OpenAiAskResult>}
 */
export async function createGroundedAnswer({
  apiKey,
  question,
  evidence,
  fetchImpl = fetch,
  timeoutMs = OPENAI_TIMEOUT_MS,
}) {
  if (!apiKey || typeof apiKey !== "string") {
    return {
      ok: false,
      error: "server_configuration_error",
      httpStatus: 503,
    };
  }

  const body = {
    model: OPENAI_MODEL,
    instructions: getSystemInstructions(),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildUserEvidenceMessage({ question, evidence }),
          },
        ],
      },
    ],
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    // GPT-5.6 family: omit temperature (unsupported non-default values).
    // Default effort is medium if omitted — pin low for factual short Q&A.
    reasoning: { effort: "low" },
    store: false,
    tools: [],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      return { ok: false, error: "openai_rate_limited", httpStatus: 503 };
    }

    if (!response.ok) {
      return { ok: false, error: "openai_unavailable", httpStatus: 503 };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "invalid_provider_response", httpStatus: 502 };
    }

    const answer = extractOutputText(payload);
    if (!answer) {
      return { ok: false, error: "invalid_provider_response", httpStatus: 502 };
    }

    return { ok: true, answer };
  } catch (err) {
    const name = err && typeof err === "object" ? /** @type {any} */ (err).name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "openai_timeout", httpStatus: 504 };
    }
    return { ok: false, error: "openai_unavailable", httpStatus: 503 };
  } finally {
    clearTimeout(timer);
  }
}
