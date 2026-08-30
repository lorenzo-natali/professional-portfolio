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

## Runtime

- Boot: `bootProduction` → `installPortfolioAnalytics()`
- Idle: **zero** timers / rAF / polling / analytics IO
- Listeners when active: `visibilitychange`, `pagehide` only
- Network: one `portfolio_visit` POST + one `session_end` beacon/fetch keepalive
