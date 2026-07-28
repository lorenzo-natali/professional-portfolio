# Safari recovery log

Controlled incremental optimisation from the pre-remediation baseline.

| Step | Feature | Desktop | Mobile | Safari crash | Notes |
|------|----------|---------|--------|--------------|-------|
| Baseline | Original portfolio (678ed1c) | Original | Original | Expected | Pre-remediation baseline restored |
| Step 1 | Shared ticker animation scheduler | Unchanged | Unchanged | Still present (~every 2–3 min) | Partial improvement; shared rAF reduced pressure but did not eliminate crash |
| Step 2 | Shared ticker ResizeObserver | Unchanged | Unchanged | Still present (test ~19:25→19:26) | No observable improvement vs Step 1; shared RO appears neutral for the crash |
| Step 3 | Pause offscreen ticker animation (shared IO) | Unchanged while in view | Unchanged while in view | Pending device test | One IntersectionObserver; unsubscribe from shared rAF while offscreen |

## Future candidates

- Continuously animated mobile Risk Radar is considered a likely high-cost component and must be tested in a later isolated step. Do not modify it during Step 3.
