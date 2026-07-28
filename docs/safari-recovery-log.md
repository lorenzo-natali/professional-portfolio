# Safari recovery log

Controlled incremental optimisation from the pre-remediation baseline.

| Step | Feature | Desktop | Mobile | Safari crash | Notes |
|------|----------|---------|--------|--------------|-------|
| Baseline | Original portfolio (678ed1c) | Original | Original | Expected | Pre-remediation baseline restored |
| Step 1 | Shared ticker animation scheduler | Unchanged | Unchanged | Still present (~every 2–3 min) | Partial improvement; shared rAF reduced pressure but did not eliminate crash |
| Step 2 | Shared ticker ResizeObserver | Unchanged | Unchanged | Still present (test ~19:25→19:26) | No observable improvement vs Step 1; shared RO appears neutral for the crash |
| Step 3 | Pause offscreen ticker animation (shared IO) | Unchanged while in view | Unchanged while in view | Still present (test 14:33→~14:35, ~2 min) | No observable improvement vs Step 1; offscreen ticker pause does not appear to address the primary crash cause |
| Step 4 | Reduce mobile radar animation cadence (~30 FPS) | Unchanged | Visually almost identical | Still present (test 14:41→~14:42, ~1 min) | No observable stability improvement; sweep frame cadence alone does not appear to be the primary cause (do not infer Step 4 worsened stability from one short test) |
| Step 5 | Soften mobile radar sweep (24s + lower intensity) | Unchanged | Slower/fainter sweep | Pending device test | Keeps Step 4 ~30 FPS rAF; period 24s; opacity 0.55 + softer capped-only gradient |

## Activation (Steps 4–5)

Mobile radar sweep profile applies when **either**:
- `matchMedia("(max-width: 639px)")` matches (existing mobile radar CSS breakpoint), **or**
- user agent matches `iPhone` / `iPod` (covers iPhone landscape wider than 639px)

Large-screen tablets that are neither ≤639px nor iPhone/iPod keep the original CSS sweep.

## Future candidates

- Further radar opts (visibility gating, glow, will-change, element count) remain separate later steps if needed.
