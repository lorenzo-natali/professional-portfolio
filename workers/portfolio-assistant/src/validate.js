import { MAX_QUESTION_LENGTH } from "./constants.js";

/**
 * @typedef {{ code: string, message: string }} ValidationError
 * @typedef {{ ok: true, question: string } | { ok: false, error: ValidationError, httpStatus: number }} AskValidationResult
 */

/**
 * @param {string | null} contentType
 * @returns {boolean}
 */
export function isAllowedAskContentType(contentType) {
  if (!contentType || typeof contentType !== "string") return false;
  const base = contentType.split(";")[0].trim().toLowerCase();
  return base === "application/json";
}

/**
 * Validate Phase-A /ask JSON body. Accepts only `{ question: string }`.
 * Extra top-level keys are ignored (not echoed).
 *
 * @param {unknown} body
 * @returns {AskValidationResult}
 */
export function validateAskBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "invalid_body",
        message: "Request body must be a JSON object.",
      },
    };
  }

  if (!Object.prototype.hasOwnProperty.call(body, "question")) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "missing_question",
        message: "Missing required field: question.",
      },
    };
  }

  const raw = /** @type {{ question: unknown }} */ (body).question;
  if (typeof raw !== "string") {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "invalid_question_type",
        message: "Field question must be a string.",
      },
    };
  }

  const question = raw.trim();
  if (question.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "empty_question",
        message: "Question must not be empty.",
      },
    };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "question_too_long",
        message: `Question must be at most ${MAX_QUESTION_LENGTH} characters.`,
      },
    };
  }

  return { ok: true, question };
}
