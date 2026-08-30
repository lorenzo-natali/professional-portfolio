# Portfolio analytics client (Phase B)

Minimal first-party client: visit + active duration + session_end.

## Enable (production only)

GitHub Pages injects these at build time via `.github/workflows/deploy-pages.yml`:

```bash
VITE_PORTFOLIO_ANALYTICS_ENABLED=true
VITE_PORTFOLIO_ANALYTICS_ENDPOINT=https://portfolio-analytics.natalilorenzo-0ee.workers.dev
```

Client POSTs to `{endpoint}/analytics`. Both must be present. Default / unset → complete no-op (no IDs, listeners, or network).

## Owner exclusion

| Action | Effect |
|--------|--------|
| `?analytics=off` | Sets `localStorage["portfolio.analytics.exclude"]="1"`, strips query via `history.replaceState`, analytics no-op |
| `?analytics=on` | Clears exclusion (intentional test/debug), strips query |
| localhost / 127.0.0.1 / Vite `DEV` | Always excluded |

Exclusion is not authentication.

## Interaction events (Phase C)

While analytics is installed and eligible, call:

```js
import { trackPortfolioEvent } from "./createPortfolioAnalytics.js";

trackPortfolioEvent("experience_open", { experience_id: "experience-boc" });
```

`trackPortfolioEvent` no-ops when analytics is disabled, excluded, or not installed.
Alive-page transport only (`application/json`). Never send prompt/answer text — only allowlisted IDs/enums.

Phase C.1 also emits `project_repository_click` `{ project_id }` from ProjectDeck “View repository”
(distinct from Hero `outbound_click` `{ target: "github" }`).
