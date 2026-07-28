# Safari recovery log

Controlled incremental optimisation from the pre-remediation baseline.

| Step | Feature | Desktop | Mobile | Safari crash | Notes |
|------|----------|---------|--------|--------------|-------|
| Baseline | Original portfolio (678ed1c) | Original | Original | Expected | Pre-remediation baseline restored |
| Step 1 | Shared ticker animation scheduler | Unchanged | Unchanged | Still present (~every 2–3 min) | Partial improvement; shared rAF reduced pressure but did not eliminate crash |
| Step 2 | Shared ticker ResizeObserver | Unchanged (pixel-identical) | Unchanged (pixel-identical) | Pending device test | One RO instance; Step 1 rAF scheduler retained |
