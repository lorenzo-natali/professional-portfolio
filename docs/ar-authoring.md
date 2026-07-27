# AR authoring workflow (local only)

This workflow is **not** part of the public GitHub Pages build (`npm run build` → `dist/`).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Normal local app. Keyboard interest editor available when activated. |
| `npm run dev:authoring` | Vite server with authoring HTML entries (orientation / compare / tracking experiment). |
| `npm run build:authoring` | Emits authoring pages + app to `dist-authoring/` (never deployed). |

Public deploy uses only:

```bash
npm run build
npm run verify:public-dist   # or npm run verify:ar-bundle
```

## Keyboard layout editor (existing)

- **Where:** Beyond the CV camera session (same production interest config: `interestObjectsConfig.js`).
- **Activate (local DEV / authoring):** open the app with `?arInterestsDebug=1`, or set `AR_INTERESTS_DEBUG` to `true` locally in `arDebug.js` (do not commit).
- **Controls:** `1–6` select · arrows / `[` `]` position · `q/e/r/f/t/g` rotate · `z/x` scale · `p/o` print · `m` hierarchy.
- **Export:** console JSON via `p` / `o` or `window.__arInterestsDebug` — paste into `interestObjectsConfig.js` manually.
- **Production:** `?arInterestsDebug=1` has no effect; the editor module is outside the public dependency graph.

## Orientation page (existing)

- **Local URL (dev:authoring):** `/ar-interest-orientation.html`
- **Config:** same `INTEREST_OBJECTS` production transforms as the live AR path.
- **Storage:** `localStorage` key `ar-interest-orientation-dev-v1` (authoring only).
- **Export:** on-page / console copy — manual commit to the repo.
- **Public `dist/`:** page is not emitted by `npm run build`.
