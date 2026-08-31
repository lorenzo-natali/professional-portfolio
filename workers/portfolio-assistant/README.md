# Portfolio Assistant Worker (Phase A)

Dedicated Cloudflare Worker skeleton for the future free-form Portfolio Assistant API.

- **Runtime:** Cloudflare Worker (no D1 / KV in Phase A)
- **Routes:** `GET /health`, `POST /ask`
- **OpenAI:** not connected (Phase A stub only)
- **Frontend:** unchanged — no client calls in Phase A

This Worker is logically isolated from `workers/portfolio-analytics/`.

## Local development (later)

```bash
cd workers/portfolio-assistant
npx wrangler dev
```

Optional: copy `wrangler.toml` → `wrangler.local.toml` (gitignored) for machine-specific overrides.

## Production deploy (later — not executed in Phase A)

1. Copy `wrangler.production.toml.example` values into the Cloudflare deploy config.
2. Set `ASSISTANT_ALLOWED_ORIGINS` to the GitHub Pages origin (`https://lorenzo-natali.github.io`).
3. Deploy: `wrangler deploy` from this directory.
4. Do **not** add an OpenAI secret until a later phase that explicitly requires it.

## Phase A contracts

### `GET /health`

```json
{ "ok": true, "service": "portfolio-assistant", "phase": "A", "openai": false }
```

### `POST /ask`

Request:

```json
{ "question": "What is your background in internal audit?" }
```

Success (deterministic stub — no model call):

```json
{
  "ok": true,
  "phase": "A",
  "stub": true,
  "openai": false,
  "echo": { "question": "What is your background in internal audit?" },
  "answer": "Phase A deterministic stub. OpenAI is not connected. Your question was received and validated."
}
```

## Security model

`/ask` will be a public endpoint once wired. CORS/Origin checks are browser conveniences only — not authentication.
Phase A performs no tracking, IP storage, cookies, or persistence.

## Deferred (intentionally)

- OpenAI API calls and secrets
- Grounded retrieval / knowledge pack
- Rate limiting / quotas (KV or Durable Objects)
- Frontend free-form input
- Conversation history
