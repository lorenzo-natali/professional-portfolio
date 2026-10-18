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
 * Keep diagnostic tokens to short identifiers. Free text is never logged.
 * @param {unknown} value
 * @returns {string | null}
 */
function safeDiagnosticToken(value) {
  return typeof value === "string" && /^[a-z0-9_]{1,64}$/i.test(value) ? value : null;
}

/**
 * Local Wrangler diagnostic only. Public /ask body stays invalid_provider_response.
 * @param {"incomplete_response" | "empty_output" | "invalid_response_shape"} category
 * @param {unknown} payload
 */
function logRejectedProviderResponse(category, payload) {
  const root = payload && typeof payload === "object" ? /** @type {Record<string, unknown>} */ (payload) : null;
  const details =
    root && root.incomplete_details && typeof root.incomplete_details === "object"
      ? /** @type {Record<string, unknown>} */ (root.incomplete_details)
      : null;
  const providerStatus = safeDiagnosticToken(root ? root.status : null) ?? "none";
  const incompleteReason = safeDiagnosticToken(details ? details.reason : null) ?? "none";
  console.warn(
    `portfolio-assistant invalid_provider_response category=${category} provider_status=${providerStatus} incomplete_reason=${incompleteReason}`,
  );
}

/**
 * Public /ask body stays openai_unavailable. Status only; the body is never read.
 * @param {number} status
 */
function logProviderHttpFailure(status) {
  const safeStatus =
    Number.isInteger(status) && status >= 100 && status <= 599 ? String(status) : "none";
  console.warn(`portfolio-assistant openai_unavailable provider_http_status=${safeStatus}`);
}

/**
 * Map thrown fetch failures to a fixed category. Names and messages are not logged.
 * @param {unknown} err
 * @returns {"network" | "unexpected"}
 */
function classifyProviderException(err) {
  const name = err && typeof err === "object" ? /** @type {{ name?: unknown }} */ (err).name : "";
  if (name === "TypeError") return "network";
  return "unexpected";
}

/**
 * @param {unknown} err
 */
function logProviderException(err) {
  console.warn(
    `portfolio-assistant openai_unavailable exception_category=${classifyProviderException(err)}`,
  );
}

/**
 * Incomplete Responses API results are failures even when partial text is present.
 * Missing status stays compatible with fixtures that only send output_text.
 * @param {unknown} payload
 */
function isIncompleteProviderResponse(payload) {
  if (!payload || typeof payload !== "object") return false;
  const root = /** @type {Record<string, unknown>} */ (payload);
  if (root.status !== "incomplete") return false;
  const details = root.incomplete_details;
  const reason =
    details && typeof details === "object"
      ? /** @type {Record<string, unknown>} */ (details).reason
      : undefined;
  // max_output_tokens and any other incomplete reason are non-retryable.
  // Partial text is discarded either way and is not returned to the visitor.
  return reason === "max_output_tokens" || root.status === "incomplete";
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
      logProviderHttpFailure(response.status);
      return { ok: false, error: "openai_unavailable", httpStatus: 503 };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      logRejectedProviderResponse("invalid_response_shape", null);
      return { ok: false, error: "invalid_provider_response", httpStatus: 502 };
    }

    // Responses API can return nonempty output_text with status "incomplete"
    // (for example incomplete_details.reason "max_output_tokens"). That text
    // is not a finished answer and must not be shown. No automatic retry.
    if (isIncompleteProviderResponse(payload)) {
      logRejectedProviderResponse("incomplete_response", payload);
      return { ok: false, error: "invalid_provider_response", httpStatus: 502 };
    }

    const answer = extractOutputText(payload);
    if (!answer) {
      logRejectedProviderResponse("empty_output", payload);
      return { ok: false, error: "invalid_provider_response", httpStatus: 502 };
    }

    return { ok: true, answer };
  } catch (err) {
    const name = err && typeof err === "object" ? /** @type {any} */ (err).name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "openai_timeout", httpStatus: 504 };
    }
    logProviderException(err);
    return { ok: false, error: "openai_unavailable", httpStatus: 503 };
  } finally {
    clearTimeout(timer);
  }
}
