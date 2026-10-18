/**
 * Session-scoped transcript for the portfolio assistant.
 * sessionStorage is per tab and is cleared when that tab closes.
 * The stored value is not sent to the assistant API.
 */

export const ASSISTANT_CONVERSATION_STORAGE_KEY = "portfolio-assistant-conversation-v1";

const STORAGE_VERSION = 1;
const MAX_MESSAGES = 24;
const MAX_TEXT_LENGTH = 8000;
const MAX_ID_LENGTH = 40;
const MAX_SIGNAL_IDS = 8;
const MAX_SIGNAL_ID_LENGTH = 64;
const MAX_STORAGE_CHARS = 60_000;

/**
 * @param {unknown} value
 * @returns {{ id: string, role: "user" | "assistant", text: string, signalIds?: string[] } | null}
 */
function sanitizeMessage(value) {
  if (!value || typeof value !== "object") return null;
  const record = /** @type {{ id?: unknown, role?: unknown, text?: unknown, signalIds?: unknown }} */ (value);
  if (record.role !== "user" && record.role !== "assistant") return null;
  if (typeof record.id !== "string" || !record.id || record.id.length > MAX_ID_LENGTH) return null;
  if (typeof record.text !== "string") return null;
  const text = record.text.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) return null;

  /** @type {{ id: string, role: "user" | "assistant", text: string, signalIds?: string[] }} */
  const message = { id: record.id, role: record.role, text };
  if (record.role === "assistant" && Array.isArray(record.signalIds)) {
    const signalIds = [];
    for (const id of record.signalIds) {
      if (signalIds.length >= MAX_SIGNAL_IDS) break;
      if (typeof id !== "string" || !id || id.length > MAX_SIGNAL_ID_LENGTH) continue;
      if (signalIds.includes(id)) continue;
      signalIds.push(id);
    }
    if (signalIds.length > 0) message.signalIds = signalIds;
  }
  return message;
}

/**
 * @param {unknown} messages
 */
export function sanitizeAssistantConversation(messages) {
  if (!Array.isArray(messages)) return [];
  /** @type {Array<{ id: string, role: "user" | "assistant", text: string, signalIds?: string[] }>} */
  const sanitized = [];
  for (const item of messages) {
    if (sanitized.length >= MAX_MESSAGES) break;
    const message = sanitizeMessage(item);
    if (message) sanitized.push(message);
  }
  return sanitized;
}

/**
 * @param {Storage | null | undefined} storage
 */
function readStorage(storage) {
  if (!storage) return [];
  const raw = storage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
  if (!raw || raw.length > MAX_STORAGE_CHARS) return [];
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || parsed.v !== STORAGE_VERSION) return [];
  return sanitizeAssistantConversation(parsed.messages);
}

/**
 * @param {Storage | null | undefined} [storage]
 */
export function loadAssistantConversation(storage = globalThis.sessionStorage) {
  try {
    return readStorage(storage);
  } catch {
    return [];
  }
}

/**
 * @param {unknown} messages
 * @param {Storage | null | undefined} [storage]
 */
export function saveAssistantConversation(messages, storage = globalThis.sessionStorage) {
  try {
    if (!storage) return;
    const sanitized = sanitizeAssistantConversation(messages);
    let payload = sanitized;
    let serialized = JSON.stringify({ v: STORAGE_VERSION, messages: payload });
    while (serialized.length > MAX_STORAGE_CHARS && payload.length > 0) {
      payload = payload.slice(1);
      serialized = JSON.stringify({ v: STORAGE_VERSION, messages: payload });
    }
    if (serialized.length > MAX_STORAGE_CHARS) return;
    storage.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, serialized);
  } catch {
    // Private mode or a blocked storage API must not break the chat.
  }
}

/**
 * @param {Array<{ id?: string }>} messages
 */
export function highestAssistantMessageSeq(messages) {
  let max = 0;
  for (const message of messages) {
    const match = /^(?:user|assistant)-(\d+)$/.exec(String(message?.id || ""));
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return max;
}
