# Safari iOS Workload Audit

**Scope:** Technical Safari iOS / WebKit rendering, animation, compositing, and memory workload of the **live production portfolio homepage**.  
**Out of scope:** Copy, IA, Profile Coverage semantics/scoring, recruiter interpretation, evidence taxonomy.  
**Mode:** Audit only. Application code and CSS unchanged. Step 6 not started.  
**Baseline crash:** restored at `900e1d6`. Device results: `docs/safari-recovery-log.md` (Steps 1–5).  
**Evidence labels:** **Fact** = in source; **Inference** = code + WebKit pattern + Step results; **Hypothesis** = needs Inspector/device measurement.

---

## 1. Live rendering and animation architecture

### Production mount (idle homepage)

`App.jsx` mounts `PortfolioCore` sections (Hero → Role Lens → Capabilities → Credentials → Experience → Projects → Education → Risk Radar), Portfolio Assistant, Beyond **card**. `ARGovernanceView` returns `null` when `open === false` (`src/components/ar/ARGovernanceView.jsx`) — **no idle WebGL/camera**.

### Who owns continuous work

| System | File / symbol | Mechanism | Writes | Layout reads | Cleanup |
|--------|---------------|-----------|--------|--------------|---------|
| Ticker frames | `createTickerFrameScheduler.js` `tick` / `subscribeTickerFrame` | 1 shared `requestAnimationFrame` | — | — | `cancelAnimationFrame` when 0 subscribers |
| Ticker motion | `TickerStream.jsx` `onFrame` | Per-subscriber callback | `track.style.transform` (`translate3d`) | — | unsubscribe on unmount / IO hide |
| Ticker measure | `createTickerResizeObserver.js` → `measure` | 1 shared `ResizeObserver` | transform on measure | `track.scrollWidth` | unobserve + disconnect when empty |
| Ticker visibility | `createTickerVisibilityObserver.js` | 1 shared `IntersectionObserver` | — | — | unobserve + disconnect when empty |
| Body glow clock | `src/index.css` `body` + `@keyframes lens-glow-clock` + `@property --lens-glow` | CSS infinite 2.8s | inherited custom property | — | never gated; `prefers-reduced-motion` only |
| Role Lens letters | `RoleLens.jsx` + `.role-lens-letter` / `role-lens-type-scan` | CSS infinite 4.4s | transform scale, opacity, text-shadow | — | DOM detach |
| Role Lens sticky | `RoleLens.jsx` sticky + `backdrop-blur` | sticky compositing | — | — | mounted with section |
| Radar sweep desktop | `.radar-sweep` `animation: radar-sweep` | CSS rotate infinite | transform | — | detach / reduced-motion |
| Radar sweep mobile/iPhone | `radarSweepCadence.js` `startCappedRadarSweep` | 1 rAF chain ~30 FPS | `element.style.transform` rotate | — | cancel rAF + clear class/transform |
| Radar pulses | `RiskRadar.jsx` dual `motion.span` `repeat: Infinity` | Framer Motion | scale, opacity | — | Framer on unmount / view change |
| Project stage | `.project-stage-current` / `project-stage-blink` | CSS 1s steps infinite | background-color | — | detach |
| Assistant preview | `App.jsx` `PortfolioAssistant` `setInterval(3600)` | timer → React state | text via React | — | `clearInterval` |
| Finite Framer | Hero, Experience `whileInView`, deck/radar tabs, assistant UI | enter/exit only | opacity/x/y/height | — | Framer |

**Multi-owner components:** `TickerStream` (rAF + mask + will-change + backdrop-blur); `RiskRadar` risk-map (sweep CSS/JS + Framer pulses + panel backdrop-blur); `RoleLens` (sticky blur + 9 CSS clocks + optional reset pulse).

---

## 2. Inventory of all continuous animation systems

Idle Overview, risk-map default, Beyond closed, intro dismissed:

| # | System | Mechanism | Instances | Continuously active? | Offscreen active? | Approx. surface |
|---|--------|-----------|-----------|----------------------|-------------------|-----------------|
| 1 | Shared ticker rAF | JS `requestAnimationFrame` | 1 loop; 0–2 subscribers | Yes if any ticker intersecting | **No** (Step 3 unsubscribes) | Drives tracks below |
| 2 | Ticker track transforms | JS `translate3d` | 2 tracks (`stackStreams`) | Yes when subscribed | Motion no; DOM/layers yes | ~full content width × 2 rows; wide duplicated item strip |
| 3 | Body `lens-glow-clock` | CSS `@keyframes` on `body` | 1 | **Yes always** | **Yes** | Document inheritance tree |
| 4 | Role Lens letter-scan | CSS `role-lens-type-scan` | **9** spans | Yes | **Yes** (while mounted) | Small sticky title row |
| 5 | Role Lens reset pulse | CSS `role-lens-reset-pulse` | 0–1 | Only if lens ≠ Overview | Yes if active | Tiny control |
| 6 | Radar sweep | CSS **or** mobile rAF (`radarSweepCadence.js`) | 1 | Yes on risk-map | **Yes** (no IO gate) | Circular plane ≤ ~500×500 CSS px |
| 7 | Radar Framer pulses | Framer Infinity ×2 | 2 | Yes on risk-map | **Yes** | Node-local rings |
| 8 | Project stage blink | CSS `project-stage-blink` | 1 | Yes while Projects mounted | **Yes** | ~few CSS px bars |
| 9 | Assistant interval | `setInterval` 3.6s | 1 | Yes (non-frame) | n/a | Sidebar text |

**Live continuous frame-class systems: 8** (rows 1–8; treat shared rAF + its transforms as one scheduling system with 2 surfaces).  
**Including low-frequency timer: 9.**

**Static but continuous compositor cost (not animation clocks):** many `backdrop-blur` surfaces — `SurfaceCard` (`portfolioUi.jsx`), assistant aside (`App.jsx`), language chips (`HeroSection.jsx`), attestation cards (`CredentialsSection.jsx`), radar panel (`RiskRadar.jsx`), Role Lens sticky.

**Not continuous idle:** Hero Framer entrance; Experience `whileInView` once; ProjectDeck Framer on change; Beyond AR/WebGL when closed.

---

## 3. Transform / paint / composite ownership map

| Element | File / selector | Animated props | Path | CPU | Paint | Composite | GPU / layer | Notes |
|---------|-----------------|----------------|------|-----|-------|-----------|-------------|-------|
| Ticker track | `TickerStream.jsx` `.will-change-transform` under `.ticker-mask` | `transform` | JS → composite | Med | Med | **Very high** | **High** | Mask + will-change + transform; parent `backdrop-blur` |
| Ticker chrome | `.ticker-stream` `backdrop-blur` | — | backdrop-filter | Low | Low | High | High | Always |
| Body glow | `body` / `--lens-glow` | custom property | CSS | Med? | Med? | High? | Med | Cost magnitude = **hypothesis** on Overview |
| Lens shadows | `.role-lens-highlight-*`, `.role-lens-radar-node` | box-shadow via var | CSS when classed | Low–med | Med–high | High | Med | Active lens only |
| Letter spans | `.role-lens-letter` | scale, opacity, text-shadow | CSS | Low–med | Med | Med–high | Med | 9 clocks |
| Sticky bar | `RoleLens.jsx` sticky `backdrop-blur` | — | sticky + backdrop | Low | Low | High | High | Over scrolling content |
| Radar sweep | `.radar-sweep` / `--cadence-capped` | rotate; `filter: blur` | CSS or JS | Low–med | Med | **High** | **High** | Filter on moving gradient |
| Radar panel | Risk map wrapper `backdrop-blur` | — | backdrop-filter | Low | Low | High | High | Large square |
| Radar pulses | `RiskRadar.jsx` `motion.span` | scale, opacity | Framer JS | Med | Med | Med | Low–med | 2nd owner on radar |
| Stage blink | `.project-stage-current` | background-color | CSS | Negligible | Low | Low | Negligible | Tiny |
| SurfaceCards | `portfolioUi.jsx` `backdrop-blur` | — | backdrop-filter ×N | Low | Low | High agg. | High agg. | Capabilities/experience/education/projects/radar side |
| Profile image | `public/profile.png` ~1.35MB in assistant | — | decode | Low | Low | Low | Med–high memory | Fact: file size |

---

## 4. Relative CPU / GPU / Paint / Composite / Memory workload table

Values: negligible | low | medium | high | very high. Not absolute ms/MB.

| Rank | Component / effect | CPU | GPU | Paint | Composite | Memory / layers | Sustained? | Offscreen active? | Confidence |
|------|--------------------|-----|-----|-------|-----------|-----------------|------------|-------------------|------------|
| 1 | Ticker transform + mask + will-change + blur | medium | high | medium | very high | high | yes (hero) | motion no; layers yes | high |
| 2 | Body `lens-glow-clock` | medium | medium | medium | high | medium | yes | yes | high presence; medium magnitude |
| 3 | Aggregated `backdrop-blur` surfaces | low | high | low–medium | high | high | yes | yes mounted | high |
| 4 | Role Lens letters ×9 + sticky blur | low–medium | medium–high | medium | high | medium | yes | letters yes | medium–high |
| 5 | Radar sweep filter + panel blur | low–medium | high | medium | high | high | yes | **yes** | medium–high |
| 6 | Radar Framer pulses ×2 | medium | medium | medium | medium | low–medium | yes | **yes** | medium |
| 7 | Shared ticker rAF (post–Step 1) | medium | low | low | low | low | while visible | no | high |
| 8 | Project stage blink | negligible | low | low | low | negligible | yes | yes | medium |
| 9 | Assistant `setInterval` | low | low | low | low | low | intermittent | n/a | high |
| 10 | Large PNG decode (`profile.png`) | low | low | low | low | medium–high | once | retained | high (size) |
| 11 | Beyond AR/WebGL | very high | very high | high | very high | very high | **only if open** | n/a idle | high |

---

## 5. Ranked top workload candidates

1. **Ticker masked / promoted continuous transforms** in `backdrop-blur` chrome — `TickerStream.jsx`, `.ticker-mask`, `will-change-transform`.  
2. **Document-wide `lens-glow-clock`** — `src/index.css` `body`.  
3. **Page-wide `backdrop-blur` / translucent layer stack** — `SurfaceCard`, sticky Role Lens, radar panel, assistant.  
4. **Role Lens multi-clock letter-scan + sticky backdrop** — `RoleLens.jsx`, `.role-lens-letter`.  
5. **Radar filtered/rotated sweep + large panel blur + offscreen continuation** — `.radar-sweep`, `radarSweepCadence.js`, `RiskRadar.jsx` panel.  
6. **Radar Framer `repeat: Infinity` pulses** — second animation owner on same section.  
7. Residual ticker main-thread rAF (improved by Step 1, still real when hero visible).

**Risk Radar role:** **one cumulative contributor**, not the sole dominant cause (Steps 4–5: cadence/softening did not clear crash).

---

## 6. Lifecycle and cleanup audit

| System | Create | Pause | Resume | Dispose | Duplicate guard | Page visibility | Class | Risk note |
|--------|--------|-------|--------|---------|-----------------|-----------------|-------|-----------|
| Ticker rAF scheduler | First subscribe | 0 subscribers → cancel | New subscribe | Map delete | Single `rafId` | None | **SAFE** | — |
| TickerStream effect | Mount: measure, start, RO, IO | IO false / mouseenter | IO true / mouseleave | stop + unsub RO/IO | `frameUnsubscribeRef` | None | **SAFE WITH TESTS** | StrictMode double-invoke |
| Shared RO/IO | First subscribe | — | — | disconnect at 0 | Singletons | None | **SAFE** | — |
| Radar capped rAF | `mapView==='risk-map'` + mobile/iPhone predicate | Leave risk-map / unmount only | Remount effect | cancel + clear style | One chain per effect | None | **SAFE WITH TESTS** | No live MQ rebind on rotate |
| CSS glow/letters/stage | Stylesheet | `prefers-reduced-motion` only | — | Detach | n/a | **None** | **SUSPICIOUS** | Always-on idle cost |
| Framer pulses | Active domain + risk-map | Unmount / tab change | Remount | Framer | Per tree | None; **runs offscreen** | **SUSPICIOUS** | Offscreen continuous |
| Assistant interval | Mount | — | — | `clearInterval` | One timer | None | **SAFE** | — |
| AcademicFocusInfo scroll/resize | Tooltip open | — | — | removeListener | — | — | **SAFE** | Interaction only |
| Beyond View | `open===true` | Close → null | Re-open | Portal teardown | — | AR traces only | **SAFE** idle | Not idle crash owner |

**Lifecycle risks counted: 4** (always-on CSS clocks; Framer offscreen; radar MQ path; StrictMode ticker — last is low).

No verified homepage idle leak of accumulating rAF/RO/IO after clean unmount (**hypothesis** to confirm with `createPortfolioRuntimeCounters.js` / Inspector).

---

## 7. Offscreen workload audit

| System | Offscreen behaviour | Category of waste |
|--------|---------------------|-------------------|
| Ticker rAF | **Stopped** (Step 3) | — |
| Ticker DOM + mask + blur + will-change layers | **Retained** | Layer/memory (C) |
| `lens-glow-clock` | **Runs** | Continuous CSS (A) |
| Role Lens letters | **Run** | Continuous CSS (A) |
| Project stage blink | **Runs** | Continuous CSS (A) |
| Radar sweep CSS/JS | **Runs** (no IntersectionObserver) | Continuous animate + filter (A/C) |
| Radar Framer pulses | **Run** | Continuous JS (A) |
| SurfaceCard / panel backdrop-blur | **Retained** while mounted | GPU surfaces (C) |
| Beyond AR | **Not mounted** | — |

---

## 8. Cost/opportunity optimisation matrix

**A** = real continuous workload reduction · **B** = visual speed/opacity change, uncertain workload cut · **C** = GPU surface / layer / memory reduction.

| Rank | Change | Target | Cat | Reduction | Visual | Risk | Diagnostic | Rollback | Rec |
|------|--------|--------|-----|-----------|--------|------|------------|----------|-----|
| 1 | Gate `lens-glow-clock` off on Overview | `index.css` + lens flag | A | high | very small | low | highly isolating | single revert | **immediate** |
| 2 | Mobile-only remove `.ticker-mask` `mask-image` | `index.css` | A+C | high | small–noticeable | low | strong | single revert | **immediate** |
| 3 | Mobile-only drop ticker `will-change-transform` **or** stream `backdrop-blur` (one only) | `TickerStream.jsx` | C / A+C | moderate–high | very small | low | strong | single revert | **next** |
| 4 | Pause radar sweep + Framer pulses when `#risk-radar` not intersecting | `RiskRadar.jsx` | A+C | moderate–high | imperceptible offscreen | low–mod | strong | single revert | **next** |
| 5 | Mobile-only `filter: none` on `.radar-sweep` | `index.css` | A+C | moderate | small | trivial | strong | single revert | **next** |
| 6 | Disable `.role-lens-letter` animation on mobile | `index.css` | A | moderate | noticeable | trivial | useful | single revert | later |
| 7 | Sticky Role Lens without `backdrop-blur` on mobile | `RoleLens.jsx` | C | moderate | small | trivial | useful | single revert | later |
| 8 | Mobile strip `SurfaceCard` `backdrop-blur` | `portfolioUi.jsx` | C | high | noticeable | low–mod | useful | revert | later |
| 9 | Further slow/fainter radar sweep | radar CSS/JS | **B** | negligible–small | noticeable | trivial | weak | revert | **avoid** |
| 10 | Remove Risk Radar section | sections | A | very high | redesign | mod | limited | harder | **avoid** first |
| 11 | Broad multi-effect “stability profile” | many | mixed | very high | high | architectural | weak | hard | **avoid** |

---

## 9. Review of Safari recovery Steps 1–5

| Step | Mechanism affected | Result | Retain? | Neutral complexity? | Obscures later measures? |
|------|-------------------|--------|---------|---------------------|--------------------------|
| 1 Shared ticker rAF | Fewer JS loops (`createTickerFrameScheduler.js`) | Crash delayed ~2–3 min | **Keep** | No | Remember baseline had N loops |
| 2 Shared ResizeObserver | Deduped measure | No improvement | Keep hygiene | **Yes** | Minor |
| 3 Offscreen ticker pause | Unsubscribe rAF when non-intersecting | No improvement (hero usually visible) | **Keep** | No | Hero-dwell tests rarely hit pause |
| 4 Radar ~30 FPS rAF | Lower update rate; surface still filtered | No clear win; ~1 min crash in one test | Keep pending better radar A/C tests | Adds mobile path | Don’t credit “FPS” for later wins |
| 5 Slower/fainter sweep | Mostly **B** (same ~30 FPS, still composited) | Possible small delay; crash remains | Keep as visual profile or revert if confounds filter A/B | Low | **Yes** — not proof of workload cut |

---

## 10. Recommended next five isolated experiments

One technical variable each. Desktop unchanged where possible. **Not implemented here.**

### Exp 1 (best next) — Gate `lens-glow-clock` on Overview
- **Variable:** body glow animation running vs stopped when `selectedLens === "Overview"`.
- **Files:** `src/index.css`; minimal state → `data-` attribute.
- **Expect:** Category **A** continuous CSS reduction.
- **Unchanged:** tickers, radar, blurs.
- **Device test:** ≥ 5 min Overview idle + light scroll.
- **Success / fail:** crash delay/absence vs unchanged → glow primary or not.

### Exp 2 — Mobile-only remove ticker `mask-image`
- **Variable:** `.ticker-mask` mask present vs absent.
- **File:** `src/index.css`.
- **Expect:** **A+C** (mask×transform).
- **Unchanged:** speed, rAF, radar, glow.

### Exp 3 — Mobile-only remove ticker `will-change-transform` **or** `backdrop-blur` (pick one)
- **Variable:** one of those two.
- **File:** `TickerStream.jsx` / CSS.
- **Expect:** **C** (and possibly A).

### Exp 4 — Radar offscreen pause (sweep + Framer pulses)
- **Variable:** continuous radar work while non-intersecting.
- **File:** `RiskRadar.jsx`.
- **Expect:** **A+C**; on-screen look identical.

### Exp 5 — Mobile-only remove `.radar-sweep` `filter: blur`
- **Variable:** filter on sweep only.
- **File:** `src/index.css`.
- **Expect:** **A+C** after Steps 4–5 failed on cadence/opacity.

---

## 11. Safari Web Inspector validation procedure

**Setup:** Mac Safari → Develop → iPhone → production URL; Timelines, Layers, Memory; Beyond closed; intro dismissed; Overview.

| Protocol | Action | Signal |
|----------|--------|--------|
| Hero dwell | Idle 5–10 min on load | Crash without radar in view → tickers/glow/backdrop |
| Full scroll | Repeated slow scroll | Sticky blur + offscreen radar still animating |
| Radar dwell | Idle on `#risk-radar` 5–10 min | Radar-local pressure |
| Lens toggle | Overview ↔ lens | Glow clock / shadow invalidation |
| Layers | Inspect ticker tracks, sticky bar, radar plane, cards | Large/promoted/masked/blur layers |
| Timelines | Script vs Rendering | CPU (JS/rAF) vs compositor-quiet crash |
| Memory | Watch 5–10 min | Climb → layer/memory class |
| Remount | Expand experience, switch projects, open/close assistant | Duplicate clocks / leaks |
| Rotate | Portrait/landscape | Radar cadence path without remount |

**Failure-class mapping**

| Class | Evidence |
|-------|----------|
| CPU | Dense Script; long tasks; rAF; Step 1-like improvement |
| GPU/compositor | Large layer set; compositing with quiet JS; backdrop/mask |
| Paint | Large paint rects on masked tickers / filtered sweep / shadows |
| Memory/layers | Rising memory; retained layers; time-delayed crash |
| Layout thrash | Per-frame layout (unexpected; measure is RO-driven) |
| Leak | rAF/RO/IO counts grow across remount cycles |

---

## 12. Final recommendation

| Item | Conclusion |
|------|------------|
| **Single best next experiment** | **Gate `body` `lens-glow-clock` so it does not run on Overview** (Step 6). Do not change tickers or radar in that step. |
| **Most likely failure class** | **Cumulative GPU/compositor + layer/memory pressure**, with a **proven CPU/scheduling** component (Step 1). |
| **Risk Radar** | **One cumulative contributor**, not sole dominant cause. |
| **Keep Steps** | **1, 3, 4, 5**; keep **2** as hygiene. |
| **Later revert candidates** | Step **2** (neutral); Step **5** if it confounds filter experiments. |
| **Avoid next** | More Category **B** “make it slower”; remove Risk Radar first; broad multi-effect profile. |

### Category reminder
- **A** — fewer clocks, pause offscreen, remove mask/filter work.  
- **B** — slower/fainter while same surface still updates (Step 5 pattern).  
- **C** — fewer/smaller GPU-backed surfaces (`backdrop-filter`, `will-change`, large retained layers).

---

## Appendix — Material findings (citations)

### Ticker animation
- **Files:** `src/portfolio/TickerStream.jsx`, `createTickerFrameScheduler.js`, `HeroSection.jsx`  
- **Mechanism:** shared rAF → `translate3d`  
- **Instances:** 2 streams  
- **Continuous / offscreen:** yes / motion no  
- **Surface:** full-width × 2  
- **CPU high-med · GPU high · Paint med · Memory high** · Confidence **high**

### Ticker mask
- **Selector:** `src/index.css` `.ticker-mask` `mask-image`  
- **Instances:** 2  
- **With transform child:** yes  
- **Composite/GPU very high suspicion** · Confidence **high** (pattern), **medium** (crash share)

### Body glow
- **Selector:** `src/index.css` `body { animation: lens-glow-clock ... }`, `@property --lens-glow`  
- **Instances:** 1  
- **Continuous / offscreen:** yes / yes  
- **CPU/GPU/paint uncertain magnitude** · Confidence **high** (runs), **medium** (cost)

### Role Lens letters + sticky
- **Files:** `RoleLens.jsx`; `.role-lens-letter`; sticky `backdrop-blur`  
- **Instances:** 9 + 1 bar  
- **Continuous / offscreen:** yes / yes  
- Confidence **medium–high**

### Radar sweep
- **Files:** `RiskRadar.jsx`, `radarSweepCadence.js`, `.radar-sweep`, `.radar-sweep--cadence-capped`  
- **Mechanism:** CSS rotate or JS ~30 FPS rotate + `filter: blur`  
- **Instances:** 1  
- **Offscreen:** **yes**  
- Confidence **medium–high**; primacy **low** after Steps 4–5

### Radar pulses
- **File:** `RiskRadar.jsx` `motion.span` `repeat: Infinity` ×2  
- **Offscreen:** yes · Confidence **medium**

### Backdrop-filter stack
- **Files:** `portfolioUi.jsx` `SurfaceCard`; `App.jsx` assistant; `RiskRadar.jsx` panel; `CredentialsSection.jsx`; `HeroSection.jsx` chips; `RoleLens.jsx` sticky  
- **Continuous composite:** yes · Confidence **high**

### Beyond idle
- **File:** `ARGovernanceView.jsx` — `if (!open || !portalHost) return null`  
- **Idle continuous AR:** none · Confidence **high**

### Absences (homepage idle)
- No portfolio `useMotionValue` / `useAnimation`  
- No homepage canvas/WebGL  
- No portfolio `MutationObserver`  
- No animation pause on `visibilitychange`

**Searches performed:** `requestAnimationFrame`, `cancelAnimationFrame`, `setInterval`, `setTimeout`, `@keyframes` / `animation:`, Framer Motion / `AnimatePresence` / `motion.`, `transform`, `opacity`, `filter`, `backdrop-filter` / `backdrop-blur`, `blur`, shadow utilities, `mask-image`, `will-change`, sticky/fixed, `IntersectionObserver`, `ResizeObserver`, scroll/resize listeners, visibility lifecycle, canvas/SVG/WebGL, mobile/iPhone radar paths (`radarSweepCadence.js`).

**This document contains no Profile Coverage semantic, scoring, or information-architecture audit.**
