/**
 * Phase A analytics request contract — strict allowlists and hard limits.
 * Public endpoint: treat all input as hostile.
 */

export const ANALYTICS_SCHEMA_VERSION = 1;

/** Conservative body cap (bytes) in the 4–8 KB range. */
export const MAX_BODY_BYTES = 6144;

export const MAX_EVENTS_PER_REQUEST = 10;
export const MAX_PROPS_PER_EVENT = 8;
export const MAX_STRING_LENGTH = 96;
export const MAX_PATH_LENGTH = 128;

export const TOP_LEVEL_KEYS = Object.freeze([
  "v",
  "visitor_id",
  "session_id",
  "sent_at",
  "events",
]);

export const EVENT_KEYS = Object.freeze(["name", "ts", "props"]);

export const REFERRER_CLASSES = Object.freeze([
  "linkedin",
  "github",
  "google",
  "direct",
  "other",
]);

export const PROJECT_VIEW_SOURCES = Object.freeze([
  "deck",
  "assistant",
  "navigator",
]);

export const BEYOND_CV_SOURCES = Object.freeze(["card", "deeplink"]);

export const OUTBOUND_TARGETS = Object.freeze(["linkedin", "github"]);

/**
 * Exact prop allowlist per event name.
 * Empty array = no props permitted (props must be {} or omitted → normalized to {}).
 */
export const EVENT_PROP_SCHEMA = Object.freeze({
  portfolio_visit: Object.freeze(["referrer_class", "landing_path"]),
  session_end: Object.freeze(["active_ms"]),
  experience_open: Object.freeze(["experience_id"]),
  project_view: Object.freeze(["project_id", "source"]),
  assistant_open: Object.freeze([]),
  assistant_curated_question: Object.freeze(["prompt_id", "category"]),
  beyond_cv_open: Object.freeze(["source"]),
  outbound_click: Object.freeze(["target"]),
  project_repository_click: Object.freeze(["project_id"]),
});

export const ALLOWED_EVENT_NAMES = Object.freeze(
  Object.keys(EVENT_PROP_SCHEMA)
);

/** UUID string (hex form; version/variant not over-constrained). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
