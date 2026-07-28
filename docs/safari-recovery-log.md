# Safari recovery log

Controlled incremental optimisation from the pre-remediation baseline.

| Step | Feature | Desktop | Mobile | Safari crash | Notes |
|------|----------|---------|--------|--------------|-------|
| Baseline | Original portfolio (678ed1c) | Original | Original | Expected | Pre-remediation baseline restored |
| Step 1 | Shared ticker animation scheduler | Unchanged | Unchanged | Still present (~every 2–3 min) | Partial improvement; shared rAF reduced pressure but did not eliminate crash |
| Step 2 | Shared ticker ResizeObserver | Unchanged | Unchanged | Still present (test ~19:25→19:26) | No observable improvement vs Step 1; shared RO appears neutral for the crash |
| Step 3 | Pause offscreen ticker animation (shared IO) | Unchanged while in view | Unchanged while in view | Still present (test 14:33→~14:35, ~2 min) | No observable improvement vs Step 1; offscreen ticker pause does not appear to address the primary crash cause |
| Step 4 | Reduce mobile radar animation cadence (~30 FPS) | Unchanged | Same visuals; capped sweep updates | Pending device test | CSS sweep on desktop; mobile/iOS single rAF at ~30 FPS with matched period |

## Activation (Step 4)

Reduced radar sweep cadence applies when **either**:
- `matchMedia("(max-width: 639px)")` matches (existing mobile radar CSS breakpoint), **or**
- user agent matches `iPhone` / `iPod` (covers iPhone landscape wider than 639px)

Large-screen tablets that are neither ≤639px nor iPhone/iPod keep the original CSS sweep.

## Future candidates

- Continuously animated mobile Risk Radar was tested in Step 4 (cadence only). Further radar opts (visibility gating, glow, will-change, element count) remain separate later steps if needed.
