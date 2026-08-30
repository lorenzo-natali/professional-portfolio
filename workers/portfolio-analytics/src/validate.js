import {
  ALLOWED_EVENT_NAMES,
  ANALYTICS_SCHEMA_VERSION,
  BEYOND_CV_SOURCES,
  EVENT_KEYS,
  EVENT_PROP_SCHEMA,
  ISO_TIMESTAMP_RE,
  MAX_EVENTS_PER_REQUEST,
  MAX_PROPS_PER_EVENT,
  MAX_PATH_LENGTH,
  MAX_STRING_LENGTH,
  OUTBOUND_TARGETS,
  PROJECT_VIEW_SOURCES,
  REFERRER_CLASSES,
  TOP_LEVEL_KEYS,
  UUID_RE,
} from "./constants.js";

/**
 * @typedef {{ code: string, message: string }} ValidationError
 * @typedef {{
 *   ok: true,
 *   value: {
 *     visitor_id: string,
 *     session_id: string,
 *     sent_at: string,
 *     events: Array<{ name: string, ts: string, props: Record<string, string | number> }>
 *   }
 * } | { ok: false, error: ValidationError, httpStatus: number }} ValidationResult
 */

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isIsoTimestamp(value) {
  if (typeof value !== "string" || !ISO_TIMESTAMP_RE.test(value)) return false;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return false;
  // Reject absurd timestamps (before 2020 / more than 1 day in the future).
  const min = Date.parse("2020-01-01T00:00:00Z");
  const max = Date.now() + 24 * 60 * 60 * 1000;
  return ms >= min && ms <= max;
}

/**
 * @param {unknown} value
 * @param {number} maxLen
 * @returns {boolean}
 */
function isBoundedString(value, maxLen = MAX_STRING_LENGTH) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLen;
}

/**
 * @param {string} name
 * @param {unknown} props
 * @returns {{ ok: true, props: Record<string, string | number> } | { ok: false, error: ValidationError }}
 */
export function validateEventProps(name, props) {
  const allowed = EVENT_PROP_SCHEMA[name];
  if (!allowed) {
    return {
      ok: false,
      error: { code: "unknown_event", message: "Unknown event name." },
    };
  }

  const raw = props === undefined || props === null ? {} : props;
  if (typeof raw !== "object" || Array.isArray(raw) || raw === null) {
    return {
      ok: false,
      error: { code: "invalid_props", message: "Event props must be an object." },
    };
  }

  const keys = Object.keys(raw);
  if (keys.length > MAX_PROPS_PER_EVENT) {
    return {
      ok: false,
      error: { code: "too_many_props", message: "Too many event props." },
    };
  }

  for (const key of keys) {
    if (!allowed.includes(key)) {
      return {
        ok: false,
        error: {
          code: "unknown_prop",
          message: `Unexpected prop "${key}" for event "${name}".`,
        },
      };
    }
  }

  /** @type {Record<string, string | number>} */
  const out = {};

  for (const key of allowed) {
    if (!(key in raw)) continue;
    const value = raw[key];

    if (key === "active_ms") {
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 12 * 60 * 60 * 1000
      ) {
        return {
          ok: false,
          error: { code: "invalid_prop", message: "Invalid active_ms." },
        };
      }
      out.active_ms = value;
      continue;
    }

    if (key === "referrer_class") {
      if (typeof value !== "string" || !REFERRER_CLASSES.includes(value)) {
        return {
          ok: false,
          error: { code: "invalid_prop", message: "Invalid referrer_class." },
        };
      }
      out.referrer_class = value;
      continue;
    }

    if (key === "landing_path") {
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.length > MAX_PATH_LENGTH ||
        !value.startsWith("/") ||
        value.includes("://") ||
        value.includes("\n") ||
        value.includes("\0")
      ) {
        return {
          ok: false,
          error: { code: "invalid_prop", message: "Invalid landing_path." },
        };
      }
      out.landing_path = value;
      continue;
    }

    if (key === "source") {
      const allow =
        name === "project_view" ? PROJECT_VIEW_SOURCES : BEYOND_CV_SOURCES;
      if (typeof value !== "string" || !allow.includes(value)) {
        return {
          ok: false,
          error: { code: "invalid_prop", message: "Invalid source." },
        };
      }
      out.source = value;
      continue;
    }

    if (key === "target") {
      if (typeof value !== "string" || !OUTBOUND_TARGETS.includes(value)) {
        return {
          ok: false,
          error: { code: "invalid_prop", message: "Invalid target." },
        };
      }
      out.target = value;
      continue;
    }

    // Generic id / category strings
    if (!isBoundedString(value)) {
      return {
        ok: false,
        error: {
          code: "invalid_prop",
          message: `Invalid string prop "${key}".`,
        },
      };
    }
    if (typeof value !== "string") {
      return {
        ok: false,
        error: { code: "invalid_prop", message: `Invalid prop "${key}".` },
      };
    }
    out[key] = value;
  }

  // Required props
  if (name === "session_end" && !("active_ms" in out)) {
    return {
      ok: false,
      error: { code: "missing_prop", message: "session_end requires active_ms." },
    };
  }
  if (name === "experience_open" && !("experience_id" in out)) {
    return {
      ok: false,
      error: {
        code: "missing_prop",
        message: "experience_open requires experience_id.",
      },
    };
  }
  if (name === "project_view" && !("project_id" in out)) {
    return {
      ok: false,
      error: {
        code: "missing_prop",
        message: "project_view requires project_id.",
      },
    };
  }
  if (name === "assistant_curated_question") {
    if (!("prompt_id" in out) || !("category" in out)) {
      return {
        ok: false,
        error: {
          code: "missing_prop",
          message: "assistant_curated_question requires prompt_id and category.",
        },
      };
    }
  }
  if (name === "outbound_click" && !("target" in out)) {
    return {
      ok: false,
      error: {
        code: "missing_prop",
        message: "outbound_click requires target.",
      },
    };
  }

  return { ok: true, props: out };
}

/**
 * @param {unknown} body
 * @returns {ValidationResult}
 */
export function validateAnalyticsBody(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "invalid_json", message: "Body must be a JSON object." },
    };
  }

  const keys = Object.keys(body);
  for (const key of keys) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      return {
        ok: false,
        httpStatus: 400,
        error: {
          code: "unknown_field",
          message: `Unexpected top-level field "${key}".`,
        },
      };
    }
  }

  for (const required of TOP_LEVEL_KEYS) {
    if (!(required in body)) {
      return {
        ok: false,
        httpStatus: 400,
        error: {
          code: "missing_field",
          message: `Missing top-level field "${required}".`,
        },
      };
    }
  }

  if (body.v !== ANALYTICS_SCHEMA_VERSION) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "unsupported_version", message: "Unsupported schema version." },
    };
  }

  if (!isUuid(body.visitor_id) || !isUuid(body.session_id)) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "invalid_uuid", message: "Invalid visitor_id or session_id." },
    };
  }

  if (!isIsoTimestamp(body.sent_at)) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "invalid_timestamp", message: "Invalid sent_at." },
    };
  }

  if (!Array.isArray(body.events)) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "invalid_events", message: "events must be an array." },
    };
  }

  if (body.events.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      error: { code: "empty_events", message: "events must not be empty." },
    };
  }

  if (body.events.length > MAX_EVENTS_PER_REQUEST) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "too_many_events",
        message: `At most ${MAX_EVENTS_PER_REQUEST} events per request.`,
      },
    };
  }

  /** @type {Array<{ name: string, ts: string, props: Record<string, string | number> }>} */
  const events = [];

  for (const event of body.events) {
    if (typeof event !== "object" || event === null || Array.isArray(event)) {
      return {
        ok: false,
        httpStatus: 400,
        error: { code: "invalid_event", message: "Each event must be an object." },
      };
    }

    for (const key of Object.keys(event)) {
      if (!EVENT_KEYS.includes(key)) {
        return {
          ok: false,
          httpStatus: 400,
          error: {
            code: "unknown_event_field",
            message: `Unexpected event field "${key}".`,
          },
        };
      }
    }

    if (typeof event.name !== "string" || !ALLOWED_EVENT_NAMES.includes(event.name)) {
      return {
        ok: false,
        httpStatus: 400,
        error: { code: "unknown_event", message: "Unknown event name." },
      };
    }

    if (!isIsoTimestamp(event.ts)) {
      return {
        ok: false,
        httpStatus: 400,
        error: { code: "invalid_timestamp", message: "Invalid event ts." },
      };
    }

    const propsResult = validateEventProps(event.name, event.props);
    if (!propsResult.ok) {
      return {
        ok: false,
        httpStatus: 400,
        error: propsResult.error,
      };
    }

    events.push({
      name: event.name,
      ts: event.ts,
      props: propsResult.props,
    });
  }

  return {
    ok: true,
    value: {
      visitor_id: body.visitor_id,
      session_id: body.session_id,
      sent_at: body.sent_at,
      events,
    },
  };
}
