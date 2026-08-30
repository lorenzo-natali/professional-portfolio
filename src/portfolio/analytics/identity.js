import {
  STORAGE_SESSION_ID,
  STORAGE_VISIT_SENT,
  STORAGE_VISITOR_ID,
} from "./analyticsConfig.js";

/**
 * @returns {string}
 */
export function createUuid() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  // Non-cryptographic fallback — still opaque enough for analytics IDs.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persistent approximate browser id. Falls back to ephemeral id if storage fails.
 * @param {Storage | null | undefined} local
 * @param {() => string} [uuid]
 */
export function getOrCreateVisitorId(local, uuid = createUuid) {
  try {
    const existing = local?.getItem(STORAGE_VISITOR_ID);
    if (existing && typeof existing === "string" && existing.length > 0) {
      return { visitorId: existing, persistent: true };
    }
    const visitorId = uuid();
    local?.setItem(STORAGE_VISITOR_ID, visitorId);
    return { visitorId, persistent: true };
  } catch {
    return { visitorId: uuid(), persistent: false };
  }
}

/**
 * Tab/session scoped id.
 * @param {Storage | null | undefined} session
 * @param {() => string} [uuid]
 */
export function getOrCreateSessionId(session, uuid = createUuid) {
  try {
    const existing = session?.getItem(STORAGE_SESSION_ID);
    if (existing && typeof existing === "string" && existing.length > 0) {
      return existing;
    }
    const sessionId = uuid();
    session?.setItem(STORAGE_SESSION_ID, sessionId);
    return sessionId;
  } catch {
    return uuid();
  }
}

/**
 * @param {Storage | null | undefined} session
 * @param {string} sessionId
 */
export function markVisitSent(session, sessionId) {
  try {
    session?.setItem(STORAGE_VISIT_SENT, sessionId);
  } catch {
    // ignore
  }
}

/**
 * @param {Storage | null | undefined} session
 * @param {string} sessionId
 */
export function wasVisitSent(session, sessionId) {
  try {
    return session?.getItem(STORAGE_VISIT_SENT) === sessionId;
  } catch {
    return false;
  }
}
