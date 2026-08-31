/**
 * Bounded raw body read for POST /ask.
 * Ceiling is enforced on actual bytes; Content-Length is advisory early reject only.
 */

import { MAX_ASK_BODY_BYTES } from "./constants.js";

/**
 * @typedef {{ ok: true, value: unknown } | { ok: false, error: string, httpStatus: number }} BodyReadResult
 */

/**
 * @param {Request} request
 * @param {{ maxBytes?: number }} [options]
 * @returns {Promise<BodyReadResult>}
 */
export async function readAskJsonBody(request, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_ASK_BODY_BYTES;

  const contentLength = request.headers.get("content-length");
  if (contentLength != null && contentLength !== "") {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false, error: "payload_too_large", httpStatus: 413 };
    }
  }

  let buffer;
  try {
    buffer = await request.arrayBuffer();
  } catch {
    return { ok: false, error: "malformed_json", httpStatus: 400 };
  }

  if (buffer.byteLength > maxBytes) {
    return { ok: false, error: "payload_too_large", httpStatus: 413 };
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return { ok: false, error: "malformed_json", httpStatus: 400 };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "malformed_json", httpStatus: 400 };
  }
}
