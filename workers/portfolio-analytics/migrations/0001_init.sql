-- Phase A portfolio analytics schema (Cloudflare D1).
-- No raw IP, no daily_stats yet.

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  active_ms INTEGER,
  referrer_class TEXT,
  referrer_host TEXT,
  country TEXT,
  device_class TEXT,
  browser_family TEXT,
  landing_path TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  name TEXT NOT NULL,
  props_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingest_counters (
  day TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  event_writes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_name_ts ON events (name, ts);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON sessions (visitor_id);
