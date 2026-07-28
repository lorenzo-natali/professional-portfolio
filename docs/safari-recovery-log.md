# Safari recovery log

Controlled incremental optimisation from the pre-remediation baseline.

| Step | Feature | Desktop | Mobile | Safari crash | Notes |
|------|----------|---------|--------|--------------|-------|
| Baseline | Original portfolio (678ed1c) | Original | Original | Expected | Pre-remediation baseline restored |
| Step 1 | Shared ticker animation scheduler | Unchanged | Unchanged | Still present (~every 2–3 min) | Partial improvement; shared rAF reduced pressure but did not eliminate crash |
| Step 2 | Shared ticker ResizeObserver | Unchanged | Unchanged | Still present (test ~19:25→19:26) | No observable improvement vs Step 1; shared RO appears neutral for the crash |
| Step 3 | Pause offscreen ticker animation (shared IO) | Unchanged while in view | Unchanged while in view | Still present (test 14:33→~14:35, ~2 min) | No observable improvement vs Step 1; offscreen ticker pause does not appear to address the primary crash cause |
| Step 4 | Reduce mobile radar animation cadence (~30 FPS) | Unchanged | Visually almost identical | Still present (test 14:41→~14:42, ~1 min) | No observable stability improvement; sweep frame cadence alone does not appear to be the primary cause (do not infer Step 4 worsened stability from one short test) |
| Step 5 | Soften mobile radar sweep (24s + lower intensity) | Unchanged | Slower/fainter sweep | Pending / see device notes | Keeps Step 4 ~30 FPS rAF; period 24s; opacity 0.55 + softer capped-only gradient |
| Step 6 | Gate inactive lens glow clock | Unchanged on Overview; glow only when lens active | Same as desktop logic | **Pending real-device Safari test** | Stops `lens-glow-clock` while Overview; restores original clock for non-Overview |

## Step 6 detail

- **Hypothesis:** Continuous `body` `lens-glow-clock` / `--lens-glow` may create document-wide style/compositing work even when Overview has no highlight consumers.
- **Exact variable:** Whether `lens-glow-clock` runs while `selectedLens === "Overview"`.
- **Overview visual:** No difference expected — Overview never applies `.role-lens-highlight-*` / `.role-lens-radar-node` consumers of `--lens-glow`.
- **Non-Overview:** Original synchronized glow retained (`2.8s ease-in-out infinite`, same keyframes); marker `html[data-lens-glow-active="true"]` enables the same animation.
- **Tests/build:** Step 6 focused tests + full suite + production build (see commit).
- **Device:** Real-device Safari testing still pending — do not claim a performance improvement yet.

## Activation (Steps 4–5)

Mobile radar sweep profile applies when **either**:
- `matchMedia("(max-width: 639px)")` matches (existing mobile radar CSS breakpoint), **or**
- user agent matches `iPhone` / `iPod` (covers iPhone landscape wider than 639px)

Large-screen tablets that are neither ≤639px nor iPhone/iPod keep the original CSS sweep.

## Future candidates

- Further radar / ticker mask / backdrop-filter isolations remain separate later steps if needed. Do not combine into Step 6.
