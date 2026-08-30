# Portfolio analytics Worker (Phase A)

First-party ingest endpoint for the professional portfolio.

- **Runtime:** Cloudflare Worker + D1
- **Route:** `POST /analytics`
- **Frontend instrumentation:** not included in Phase A

## Local development (later)

```bash
cd workers/portfolio-analytics
npx wrangler d1 create portfolio-analytics
# put the returned database_id into wrangler.toml (do not commit secrets)
npx wrangler d1 migrations apply portfolio-analytics --local
npx wrangler dev
```

## Production deploy (later — not executed in Phase A)

1. Create D1 database in the Cloudflare account.
2. Copy `wrangler.production.toml.example` → local deploy config; set `database_id` and `ANALYTICS_ALLOWED_ORIGINS` to the GitHub Pages origin.
3. Apply migrations: `wrangler d1 migrations apply portfolio-analytics --remote`
4. Deploy Worker: `wrangler deploy`
5. Optional: set `ANALYTICS_ENABLED=false` as a kill switch without touching the site.
6. Point a future frontend client at `https://<worker-host>/analytics`.

## Kill switch

`ANALYTICS_ENABLED=false|0|off|no` → `204` with **no** D1 writes.

## Protective ceilings

- `ANALYTICS_MAX_REQUESTS_PER_DAY` (UTC day, D1 `ingest_counters`)
- `ANALYTICS_MAX_EVENT_WRITES_PER_DAY`

Set either to `0` to disable that ceiling.

## Deferred (intentionally)

- Per-IP rate limiting (would need KV/DO or Cloudflare rate-limit product; do not store IP for this)
- `daily_stats` rollups
- Dashboard / public reads
- Event idempotency keys / dedupe store
- Frontend visitor IDs / sendBeacon

## Security model

`/analytics` is a public hostile endpoint. CORS/Origin checks are browser conveniences only — not authentication.
