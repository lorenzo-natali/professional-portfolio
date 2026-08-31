# Portfolio Assistant Worker (Phase B)

Dedicated Cloudflare Worker for grounded, single-turn Portfolio Assistant Q&A.

- **Runtime:** Cloudflare Worker + Workers KV (quota counters only)
- **Routes:** `GET /health`, `POST /ask`
- **Model:** `gpt-5.6-luna` via OpenAI Responses API (server-fixed)
- **Frontend:** unchanged — no client calls in Phase B

Isolated from `workers/portfolio-analytics/`.

## Knowledge pack

```bash
npm run generate:assistant-knowledge
npm run verify:assistant-knowledge   # fails if pack.js is stale vs canonical sources
```

Pack items include `claimType` semantic metadata. Generation excludes `assistantPrompts` / `signalMap` as fact sources (navigation aliases are resolved at runtime).

## Ask pipeline (Step B.2 / B.3)

1. Private / unsupported / psychological / identity gate → local answer, **zero OpenAI**
2. Deterministic retrieval V2 (exact tokens + bilingual aliases + intent ranking)
3. Evidence sufficiency gate → local answer if incompatible, **zero OpenAI**
4. Quota → OpenAI Responses API (grounded evidence + claimTypes + narrativeTypes)

Public `/ask` evidence shape: `{ id, topic, claimType, signalIds, narrativeType? }`.

Canonical career narrative: `src/portfolio/professionalNarrative.js` → generated pack (`topic: professional_narrative`, `claimType: career_direction`).
Default voice: **authorized first-person** (server-controlled; third-person remains buildable).

## Local development

Uses committed `wrangler.toml` (localhost CORS + `ASSISTANT_CLIENT_IP_MODE=dev`).

```bash
cd workers/portfolio-assistant
npx wrangler secret put OPENAI_API_KEY
npx wrangler dev
```

**Never deploy `wrangler.toml` to production** — it allows localhost origins.

## Production deploy (explicit)

Production deploy config is gitignored `wrangler.local.toml`, aligned with
`wrangler.production.toml.example`.

Invariants:

- `ASSISTANT_ALLOWED_ORIGINS` = exactly `https://lorenzo-natali.github.io`
- `ASSISTANT_CLIENT_IP_MODE` = `cloudflare` (require `CF-Connecting-IP`)
- Abuse limits are positive integers (defaults 80 / 12 / 4). **`0` is invalid** and fails closed.

```bash
npm run verify:assistant-worker-production-config
cd workers/portfolio-assistant
npx wrangler secret put OPENAI_API_KEY --config wrangler.local.toml
npx wrangler deploy --config wrangler.local.toml
```

Package convenience (does not deploy secrets for you):

```bash
npm run deploy:assistant-worker:production
```

Never commit OpenAI keys or real KV ids.

## Abuse / body / IP semantics

| Control | Behavior |
|---------|----------|
| Raw body | Max **6144 bytes** before JSON parse; oversize → `413` `payload_too_large` |
| Question | Max 500 chars after parse |
| Trusted IP | Production: `CF-Connecting-IP` only. Missing → fail closed before KV/OpenAI. `X-Forwarded-For` ignored. Dev mode: fixed `dev-local` identity |
| Quota config | Missing/empty → compiled defaults. `0`, negative, NaN, non-numeric, out-of-bounds → `server_configuration_error`, zero OpenAI |
| Retrieval miss | Local answer, zero OpenAI, zero quota |
| Kill switch | `ASSISTANT_AI_ENABLED=false` → zero OpenAI |

Quota counters remain a **soft** check-then-act ceiling (not atomic).

## Contracts

### `GET /health`

```json
{
  "ok": true,
  "service": "portfolio-assistant",
  "phase": "B",
  "openai": true,
  "ai_enabled": true,
  "openai_configured": true,
  "quota_configured": true
}
```

### `POST /ask`

Request: `{ "question": "..." }`

Success: `{ "ok": true, "answer": "...", "evidence": [{ "id": "...", "topic": "..." }] }`
