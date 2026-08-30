/**
 * Minimal in-memory D1 stand-in for Worker unit tests (no Cloudflare runtime).
 */

function deepClone(value) {
  return structuredClone(value);
}

export function createMemoryD1() {
  /** @type {{
   *   sessions: Map<string, Record<string, unknown>>,
   *   events: Array<Record<string, unknown>>,
   *   ingest_counters: Map<string, { day: string, requests: number, event_writes: number }>,
   * }} */
  const state = {
    sessions: new Map(),
    events: [],
    ingest_counters: new Map(),
  };

  let eventId = 1;
  let failNext = false;

  const api = {
    /** Test helper */
    _state: state,
    /** Test helper — force next statement to throw */
    _failNext() {
      failNext = true;
    },
    prepare(sql) {
      const text = String(sql).replace(/\s+/g, " ").trim();

      const stmt = {
        bind(...params) {
          stmt._params = params;
          return stmt;
        },
        async first() {
          if (failNext) {
            failNext = false;
            throw new Error("D1 boom SELECT secret stack");
          }
          if (text.includes("FROM ingest_counters") && text.includes("requests")) {
            const day = stmt._params[0];
            const row = state.ingest_counters.get(day);
            return row ? { requests: row.requests } : null;
          }
          if (text.includes("FROM ingest_counters") && text.includes("event_writes")) {
            const day = stmt._params[0];
            const row = state.ingest_counters.get(day);
            return row ? { event_writes: row.event_writes } : null;
          }
          if (text.includes("FROM sessions WHERE session_id")) {
            const id = stmt._params[0];
            return state.sessions.has(id) ? { ok: 1 } : null;
          }
          return null;
        },
        async run() {
          if (failNext) {
            failNext = false;
            throw new Error("D1 boom WRITE secret stack SELECT * FROM sessions");
          }

          if (text.startsWith("INSERT INTO ingest_counters")) {
            const day = stmt._params[0];
            if (!state.ingest_counters.has(day)) {
              state.ingest_counters.set(day, {
                day,
                requests: 0,
                event_writes: 0,
              });
            }
            return { meta: { changes: 1 } };
          }

          if (text.startsWith("UPDATE ingest_counters SET requests")) {
            const day = stmt._params[0];
            const row = state.ingest_counters.get(day) || {
              day,
              requests: 0,
              event_writes: 0,
            };
            row.requests += 1;
            state.ingest_counters.set(day, row);
            return { meta: { changes: 1 } };
          }

          if (text.startsWith("UPDATE ingest_counters SET event_writes")) {
            const [inc, day] = stmt._params;
            const row = state.ingest_counters.get(day) || {
              day,
              requests: 0,
              event_writes: 0,
            };
            row.event_writes += Number(inc);
            state.ingest_counters.set(day, row);
            return { meta: { changes: 1 } };
          }

          if (text.startsWith("INSERT OR IGNORE INTO sessions")) {
            const [
              session_id,
              visitor_id,
              started_at,
              referrer_class,
              referrer_host,
              country,
              device_class,
              browser_family,
              landing_path,
            ] = stmt._params;
            if (!state.sessions.has(session_id)) {
              state.sessions.set(session_id, {
                session_id,
                visitor_id,
                started_at,
                ended_at: null,
                active_ms: null,
                referrer_class,
                referrer_host,
                country,
                device_class,
                browser_family,
                landing_path,
              });
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }

          if (text.startsWith("UPDATE sessions")) {
            const [ended_at, active_ms, session_id] = stmt._params;
            const row = state.sessions.get(session_id);
            if (!row) return { meta: { changes: 0 } };
            row.ended_at = ended_at;
            row.active_ms = active_ms;
            return { meta: { changes: 1 } };
          }

          if (text.startsWith("INSERT INTO events")) {
            const [session_id, visitor_id, ts, name, props_json] = stmt._params;
            state.events.push({
              id: eventId++,
              session_id,
              visitor_id,
              ts,
              name,
              props_json,
            });
            return { meta: { changes: 1 } };
          }

          throw new Error(`Unhandled SQL in memory D1: ${text}`);
        },
      };

      stmt._params = [];
      return stmt;
    },
    /** Snapshot for assertions (no IP fields ever present). */
    dump() {
      return {
        sessions: [...state.sessions.values()].map(deepClone),
        events: state.events.map(deepClone),
        ingest_counters: [...state.ingest_counters.values()].map(deepClone),
      };
    },
  };

  return api;
}
