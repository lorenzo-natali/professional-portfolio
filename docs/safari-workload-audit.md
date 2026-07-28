# Safari iOS Workload Audit

**Mode:** Audit only (no application source changes).  
**Baseline crash repro:** commit `900e1d6` (pre-remediation restore).  
**Recovery context:** Steps 1–5 landed after restore; device results from `docs/safari-recovery-log.md`.  
**Audit date:** 2026-07-28.  
**Scope:** Idle production homepage (portfolio sections + mounted Beyond *card*); AR/WebGL only when Beyond is open.

---

## 1. Executive summary

### Most likely workload sources (idle homepage)

1. **Cumulative compositor pressure** from many simultaneous semi-transparent / blurred / masked / continuously transformed layers (tickers, sticky Role Lens bar, SurfaceCards, radar panel, sweep filter).
2. **Document-wide CSS custom-property animation** on `body` (`lens-glow-clock`) that runs even when no lens highlights are visible.
3. **Continuous near-viewport motion systems** that remain active in the first screenful: shared ticker `requestAnimationFrame` + `mask-image` + `will-change-transform` + `backdrop-blur`; Role Lens letter-scan CSS; project stage blink; radar sweep + Framer infinite node pulses (radar is further down but stays mounted and animating).

### Crash character (hypothesis grounded in Steps 1–5)

- Step 1 (shared ticker rAF) **measurably delayed** crashes (~every 2–3 min) → **CPU / main-thread animation scheduling** is a real contributor, not the whole story.
- Steps 2–3 (shared ResizeObserver; offscreen ticker pause) **did not help** when tickers typically remain in the first viewport → remaining cost is **not primarily idle offscreen ticker JS**.
- Steps 4–5 (radar cadence / softer slower sweep) **did not clear** the crash → **sweep frame rate / opacity alone** are unlikely to be the primary cause; radar may still contribute via **filter/blur, large backdrop-blur panel, Framer pulses, layer residency**.
- Overall pattern fits **cumulative GPU/compositor + sustained main-thread clocks**, with possible **memory/layer accumulation**, more than a single isolated bug.

**Dominant cause?** Unlikely. Evidence favours **stacked sustained pressure**.

### Top three optimisation opportunities (cost/opportunity)

1. **Gate or stop `body` `lens-glow-clock` unless a Role Lens highlight is active** (mobile/iOS-first) — workload reduction without redesign; strong diagnostic isolation.
2. **Mobile-only remove or replace ticker `mask-image` / `will-change-transform` (keep motion)** — targets WebKit-sensitive masked transforms without changing ticker content.
3. **Pause or finite-limit Risk Radar Framer `repeat: Infinity` pulses +/or remove `.radar-sweep` `filter: blur` on mobile** — isolates remaining radar cost after Steps 4–5 failed on cadence/softening.

---

## 2. Current animation and rendering architecture

### Continuous / recurring systems (idle homepage)

| # | Owner | Mechanism | Frequency / duration | Instances | Visibility behaviour | Affected area |
|---|--------|-----------|----------------------|-----------|----------------------|---------------|
| 1 | Ticker streams | Shared `requestAnimationFrame` (`createTickerFrameScheduler.js`) writing `translate3d` | ~display refresh while subscribed; Step 3 unsubscribes when non-intersecting | **2** streams (`stackStreams` in `portfolioData.js` → `HeroSection.jsx`) | Pauses offscreen (Step 3); hero usually on-screen at load | Full-width hero ticker rows (~viewport width × 2) |
| 2 | Ticker tracks | CSS `will-change-transform` + `mask-image` (`.ticker-mask`) + stream `backdrop-blur` | Continuous while transforming | 2 tracks + 2 masks + 2 blurred stream chrome | Same as tickers | Same |
| 3 | Ticker measure | Shared `ResizeObserver` (`createTickerResizeObserver.js`) | On size changes | 1 observer, 2 elements | Always subscribed while mounted | Track width measurement |
| 4 | Ticker visibility | Shared `IntersectionObserver` (`createTickerVisibilityObserver.js`) | On intersect changes | 1 observer, 2 roots | Always subscribed while mounted | Root bounds |
| 5 | Body glow clock | CSS `body { animation: lens-glow-clock 2.8s ease-in-out infinite }` + `@property --lens-glow` | Continuous forever on homepage | **1** document-level animation; inherited by all descendants | **Always active**, including Overview / offscreen | Entire document inheritance tree |
| 6 | Role Lens letters | CSS `.role-lens-letter` → `role-lens-type-scan` 4.4s infinite (opacity, color, text-shadow, **scale**) | Continuous | **9** letter spans (`RoleLens.jsx`) | Remains active; sticky bar often on-screen while scrolling early sections | Small text row, sticky header |
| 7 | Role Lens reset | CSS `.role-lens-reset-active` pulse when non-Overview | Continuous while lens active | 0–1 | Only when lens selected | Small control |
| 8 | Role Lens sticky bar | `position: sticky` + `backdrop-blur` (`RoleLens.jsx`) | Compositor cost while stuck over scrolling content | 1 bar | Active whenever section sticky engages | Full content width |
| 9 | Radar sweep | Desktop: CSS `@keyframes radar-sweep`; Mobile/iPhone Steps 4–5: single rAF ~30 FPS, 24s period, capped class | Continuous while Risk Map view mounted | 1 sweep layer | **Runs even when radar scrolled offscreen** (no IO gating) | Up to ~500×500px disc |
| 10 | Radar active-node pulses | Framer Motion `motion.span` `repeat: Infinity`, dual rings, scale+opacity | Continuous while risk-map + a domain selected | **2** spans | Continues offscreen while mounted | Local to active node |
| 11 | Project stage blink | CSS `.project-stage-current` `project-stage-blink` 1s steps infinite | Continuous while projects mounted | 1 current stage indicator | Continues offscreen | Tiny indicator |
| 12 | Portfolio Assistant | `setInterval` 3600ms question rotate (`App.jsx`) | Low-frequency | 1 timer | Always while assistant feature on | Sidebar card (not every-frame) |
| 13 | Lens highlight shadows | `.role-lens-highlight-*` / `.role-lens-radar-node` box-shadow driven by `--lens-glow` | Continuous **when classes present** | Variable (capabilities, credentials, experience, projects, radar nodes) | Only with active lens | Multiple cards / nodes |

### Intermittent / interaction-only (lower idle risk)

| Owner | Mechanism | Notes |
|--------|-----------|-------|
| Hero entrance | Framer Motion once (`HeroSection.jsx`) | Finite on mount |
| Experience `whileInView` | Framer once per article | Finite |
| Project deck / radar tab / assistant modal | Framer `AnimatePresence` | Interaction |
| Portfolio intro | Timeouts + full-viewport `backdrop-blur-md` | First visit only (~3.8s) |
| AcademicFocusInfo | resize/scroll listeners | Only while tooltip open |
| Beyond the CV / AR | MindAR, WebGL, camera, multiple rAF | **`ARGovernanceView` returns `null` when `open===false`** — not idle crash owner (prior finding) |
| Beyond card | Static CSS button chrome | Mounted idle; low continuous cost |

### Static but compositor-heavy surfaces (always mounted)

- Many `backdrop-blur` surfaces: `SurfaceCard` (`portfolioUi.jsx`), assistant aside, language chips, credentials attestation cards, radar map panel (`RiskRadar.jsx`).
- Hero full-bleed grid + radial overlays (`HeroSection.jsx`) — large paint area, mostly static.
- `.attestation-rail` `mask-image` fade (`index.css`).
- CodeIAK mascot: static `<img>` with multi `drop-shadow` filters (`index.css` `.codeiakMascotVideoMedia`) — decode + filter cost, not a continuous animation loop.
- No homepage idle canvas/WebGL (`portfolioRuntimeOwners.js`).

---

## 3. Ranked workload inventory

Relative costs are **heuristic**, grounded in code paths + Steps 1–5 outcomes + known WebKit sensitivities. Not absolute FPS/ms claims.

| Rank | Component / effect | Files / selectors | Workload type | Sustained / intermittent | Estimated relative cost | Safari risk | Confidence |
|------|--------------------|-------------------|---------------|--------------------------|-------------------------|-------------|------------|
| 1 | `body` `--lens-glow` clock | `src/index.css` `body`, `@property --lens-glow`, `@keyframes lens-glow-clock` | Style inheritance / potential broad invalidation | Sustained | **Very high sustained** (document-wide) | Animated custom property on root ancestor | High |
| 2 | Ticker transform + mask + blur + will-change | `TickerStream.jsx`, `.ticker-mask`, `.will-change-transform`, `backdrop-blur` | GPU composite + masked transform | Sustained (usually on-screen) | **High sustained** | Masked continuously transforming layers | High |
| 3 | Aggregated `backdrop-blur` cards/panels | `portfolioUi.jsx` `SurfaceCard`; assistant; radar panel; credentials; Role Lens sticky | GPU backdrop sampling | Sustained (static but expensive) | **High sustained** (many layers) | Large translucent backdrop-filter stacks | High |
| 4 | Role Lens letter-scan (×9) | `.role-lens-letter`, `role-lens-type-scan` | Transform + opacity + text-shadow | Sustained | **Moderate–high sustained** | Many independent CSS animation clocks near sticky blur | Medium–high |
| 5 | Radar sweep filter + large panel blur | `.radar-sweep` `filter:blur`; `.radar-plane` parent `backdrop-blur`; Steps 4–5 rAF | Filter + rotate + backdrop | Sustained (incl. offscreen) | **Moderate–high sustained** | Animated blur/filter over large disc | Medium–high |
| 6 | Radar Framer infinite pulses | `RiskRadar.jsx` dual `motion.span` `repeat: Infinity` | JS-driven scale/opacity + glow shadows | Sustained (incl. offscreen) | **Moderate sustained** | Extra animation runtime + shadow invalidation | Medium |
| 7 | Sticky Role Lens `backdrop-blur` | `RoleLens.jsx` sticky bar | Compositing over scrolling content | Sustained while stuck | **Moderate sustained** | Sticky + backdrop-filter | Medium |
| 8 | Lens highlight multi-shadows (when active) | `.role-lens-highlight-cyan/violet`, `.role-lens-radar-node` | Animated box-shadow via `--lens-glow` | Sustained when lens ≠ Overview | **Moderate–high when active** | Overlapping soft shadows | Medium |
| 9 | Project stage blink | `.project-stage-current` | Background-color steps | Sustained | **Low–moderate sustained** | Extra infinite CSS clock | Medium |
| 10 | Shared ticker rAF (post–Step 1) | `createTickerFrameScheduler.js` | Main-thread JS | Sustained while visible | **Moderate sustained** (improved vs baseline) | Main-thread pressure | High (Step 1 evidence) |
| 11 | Hero static gradient/grid overlays | `HeroSection.jsx` absolute layers | Paint / memory | Sustained static | **Low–moderate** | Large translucent stacks | Medium |
| 12 | Attestation rail mask | `.attestation-rail` `mask-image` | Mask composite | Static unless scrolling rail | **Low–moderate** | Masked overflow | Medium |
| 13 | Assistant `setInterval` | `App.jsx` `PortfolioAssistant` | Timer + occasional Framer swap | Intermittent 3.6s | **Low intermittent** | Negligible vs frame loops | High |
| 14 | Beyond AR stack | `src/components/ar/*` | Camera/WebGL/rAF | Only when open | **Very high when open** | Not idle-homepage owner | High |
| 15 | Intro fullscreen blur | `App.jsx` PortfolioIntro | Full-viewport backdrop-blur | Brief | **High but brief** | Not long-idle crash | High |

---

## 4. Detailed findings

### 4.1 Ticker streams

- **Files:** `src/portfolio/TickerStream.jsx`, `createTickerFrameScheduler.js`, `createTickerResizeObserver.js`, `createTickerVisibilityObserver.js`, `HeroSection.jsx`, `portfolioData.js` (`stackStreams`), `src/index.css` (`.ticker-mask`).
- **Continuous?** Yes (JS transform + CSS mask/blur), typically in first viewport.
- **Offscreen?** Step 3 pauses rAF when non-intersecting; mask/blur layers still mounted.
- **Animates:** transform (`translate3d`); not filter on the track itself; parent uses backdrop-blur; mask on `.ticker-mask`.
- **Area:** ~full content width × two rows.
- **CPU:** Shared rAF fan-out (Step 1 improved). Still per-frame style writes to 1–2 tracks when visible.
- **GPU:** **High** — `will-change-transform` promotes layers; `mask-image` + continuous transform is a classic WebKit cost centre.
- **Memory/layers:** Promoted ticker layers retained for session.
- **Safari rationale:** Step 1 helped → JS scheduling mattered; Steps 2–3 neutral → when hero stays visible, pause/RO sharing do not remove masked transform + blur cost.
- **Confidence:** High.

**Distinguish:** Step 1 reduced *callback multiplicity* (workload). Steps 4–5 style changes on radar did *not* change ticker compositor path.

### 4.2 Risk Radar sweep

- **Files:** `RiskRadar.jsx`, `radarSweepCadence.js`, `index.css` (`.radar-sweep`, media queries, `.radar-sweep--cadence-capped`).
- **Continuous?** Yes for Risk Map view (default).
- **Offscreen?** Yes — still animates (CSS or capped rAF); **no visibility gating**.
- **Animates:** transform rotate; `filter: blur(0.25px–0.35px)`; conic-gradient fill; mobile capped class also sets opacity/softer gradient.
- **Area:** large circular plane (`max-w-[500px]` aspect-square).
- **CPU:** Desktop CSS compositor; mobile one rAF ~30 FPS (Steps 4–5).
- **GPU:** Filter on rotating gradient + parent panel `backdrop-blur` → moderate–high.
- **Safari rationale:** Steps 4–5 show cadence/softening insufficient → remaining cost likely **filter/blur + layer size + residency**, not FPS alone.
- **Confidence:** Medium–high (mechanism high; primacy as *the* crash cause low after Steps 4–5).

### 4.3 Risk Radar active-node pulses

- **Files:** `RiskRadar.jsx` (`motion.span` ×2), tones in `portfolioLens.js` (`pulsePrimary` / shadows).
- **Continuous?** `repeat: Infinity`, duration 2.1s, scale + opacity.
- **Offscreen?** Continues while RiskRadar mounted.
- **Animates:** transform scale, opacity; shadow classes on rings.
- **Area:** small (~node-sized) but continuous Framer runtime.
- **CPU/GPU:** Moderate; adds a second animation system beside CSS/rAF sweep.
- **Safari rationale:** Simultaneous CSS/JS animation systems; not yet isolated experimentally.
- **Confidence:** Medium.

### 4.4 Radar glow / shadow / filter layers

- Centre badge multi `shadow-[0_0_34px_…]`; concentric rings; SVG spokes; panel `backdrop-blur`; sweep `filter:blur`.
- **Continuous paint invalidation** when pulses/sweep/glow interact.
- **Confidence:** Medium.

### 4.5 `backdrop-filter` / `backdrop-blur` usage

Concrete homepage producers (non-AR):

| Location | Selector / class | Area character |
|----------|------------------|----------------|
| `portfolioUi.jsx` | `SurfaceCard` `backdrop-blur` | Many cards (capabilities, experience, education, projects, radar side panel) |
| `App.jsx` | Assistant `backdrop-blur`; intro/modal blurs | Sidebar + occasional fullscreen |
| `RoleLens.jsx` | sticky `backdrop-blur` | Full-width sticky |
| `TickerStream.jsx` | stream `backdrop-blur` | Two horizontal bands |
| `HeroSection.jsx` | language chips `backdrop-blur` | Small chips |
| `CredentialsSection.jsx` | attestation cards | Horizontal rail cards |
| `RiskRadar.jsx` | map panel `backdrop-blur` | Large square panel |
| `index.css` | AR UI blurs | Only when Beyond open |

- **Runs continuously?** Filters are static but **continuously expensive to composite**, especially under scrolling and when overlapping animated content.
- **Safari rationale:** Large-area backdrop-filter is a known WebKit stressor; multiplied across the long page.
- **Confidence:** High for cost presence; medium for crash primacy (needs A/B removing blur on mobile only).

### 4.6 `mask-image` usage

- `.ticker-mask` — **on continuously transforming content** (highest concern).
- `.attestation-rail` — static mask on scroll rail (lower).
- **Confidence:** High that ticker mask is material; attestation lower.

### 4.7 Large animated gradients

- Radar conic-gradient sweep (animated via rotate).
- Hero radial/linear overlays — **static**.
- Body `--lens-glow` is not a gradient but drives shadow radii/alphas globally when highlight classes exist.
- **Confidence:** Medium–high for radar conic; low for hero static gradients as crash drivers.

### 4.8 Framer Motion idle animations

- **Infinite:** radar pulses only (homepage).
- **Finite / interaction:** Hero, Role Lens summary, ProjectDeck, RiskRadar view swaps, Experience expand, Assistant UI, Intro.
- Diagnostics clone in `SiteDiagMotionEffectsBody.jsx` is not production homepage.
- **Confidence:** High inventory; medium crash weight for infinite pulses.

### 4.9 Hero animations

- Mount-only Framer opacity/y; static decorative overlays; language `backdrop-blur`; **tickers are the sustained Hero cost**.
- **Confidence:** High.

### 4.10 Role Lens animations

- Sticky blur bar; 9× letter-scan; optional reset pulse; summary Framer on lens change.
- Letter-scan uses **transform scale** + text-shadow — promotes work near sticky backdrop.
- **Confidence:** High for continuous cost; medium for crash share.

### 4.11 Beyond

- Card always mountable; View **unmounts when closed** (`ARGovernanceView.jsx` `if (!open || !portalHost) return null`).
- Idle crash reproduces without opening AR (recovery context) → **not primary idle cause**.
- When open: extremely high (camera/WebGL) — separate profile.
- **Confidence:** High.

### 4.12 Project carousel

- Framer transitions on change only; CSS stage blink infinite (small).
- Mascot PNG + drop-shadows: memory/decode, not frame loop.
- **Confidence:** Medium (blink low; asset medium).

### 4.13 Fixed / sticky / translucent overlays

- Role Lens sticky + blur (material).
- Intro/modals fixed + blur (transient).
- AR shell fixed (on-demand).
- **Confidence:** High for sticky Role Lens.

### 4.14 `will-change`

- Ticker tracks: `will-change-transform` always (`TickerStream.jsx`).
- `.radar-sweep` mobile `will-change: transform`; desktop `will-change: auto` (`index.css`).
- **Effect:** Layer promotion / memory; can help or hurt. Combined with masks, often hurts Safari.
- **Confidence:** Medium–high.

### 4.15 Animations still running offscreen

| System | Offscreen behaviour |
|--------|---------------------|
| Tickers | rAF paused (Step 3); layers remain |
| Radar sweep | **Keeps animating** |
| Radar Framer pulses | **Keep animating** |
| `lens-glow-clock` | **Always** |
| Role Lens letters | **Always** (often near/on screen) |
| Project stage blink | **Always** while mounted |
| Beyond AR | Not mounted when closed |

### 4.16 Other notes

- **Duplicated clocks:** CSS body glow + CSS letter scans + CSS stage blink + CSS/rAF radar + Framer pulses + ticker rAF.
- **Device paths:** Steps 4–5 mobile/iPhone radar only; tickers Steps 1–3 are universal but behaviourally invisible on desktop when in view.
- **No idle homepage canvas.**

---

## 5. Cost/opportunity matrix

Heuristic opportunity favouring: **high reduction**, **low visual impact**, **low risk**, **high diagnostic value**.  
Scores 1–5 as specified. **Recommendation** is judgement, not a formula.

| # | Exact change | Target | Reduction | Visual | Risk | Diagnostic | Rollback | Recommendation |
|---|--------------|--------|-----------|--------|------|------------|----------|----------------|
| A | Disable `body` `lens-glow-clock` unless any lens highlight class is active (mobile/iOS or all; Overview idle = off) | `index.css` / small App or RoleLens flag | 4–5 | 1–2 (Overview unchanged; active lens keeps sync glow) | 2 | 5 | Easy | **Immediate** |
| B | Mobile-only remove `.ticker-mask` `mask-image` (keep scrolling/fade via softer CSS or none) | `.ticker-mask` | 4 | 2–3 (edge fade softens/disappears) | 2 | 4 | Easy | **Immediate** |
| C | Mobile-only drop ticker `will-change-transform` and/or stream `backdrop-blur` | `TickerStream.jsx` | 3–4 | 1–2 | 2 | 4 | Easy | **Immediate** (after or vs B; **one variable per step**) |
| D | Pause radar sweep + Framer pulses while `#risk-radar` not intersecting (IO) | `RiskRadar.jsx` | 3–4 | 1 (offscreen only) | 2–3 | 4 | Easy | **Immediate** |
| E | Mobile-only remove `.radar-sweep` `filter: blur(*)` | `index.css` | 3 | 2 | 1 | 4 | Easy | **Immediate** |
| F | Replace Framer infinite pulses with finite pulses or CSS static active glow on mobile | `RiskRadar.jsx` | 3 | 2–3 | 2 | 4 | Easy | **Later** (after D/E) |
| G | Mobile-only disable `.role-lens-letter` animation (static title) | `index.css` / `RoleLens.jsx` | 3 | 2–3 | 1 | 3 | Easy | **Later** |
| H | Mobile-only remove sticky `backdrop-blur` on Role Lens (keep sticky + solid bg) | `RoleLens.jsx` | 3 | 2 | 1 | 3 | Easy | **Later** |
| I | Mobile-only neutralize `SurfaceCard` `backdrop-blur` (solid translucent fill) | `portfolioUi.jsx` | 4 | 3 | 2–3 | 3 | Easy | **Later** (broader visual) |
| J | Slow ticker speed / cadence further | `TickerStream.jsx` | 1–2 | 2–3 | 1 | 2 | Easy | **Avoid** as next step — **looks slower ≠ removes compositor tax**; Step 5 already showed “calmer” ≠ stable |
| K | Remove Risk Radar section | `PortfolioCore` / sections | 5 | 5 | 3 | 3 | Medium | **Avoid** as first solution |
| L | Global iOS “stability profile” disabling many effects at once | new profile | 5 | 4–5 | 4 | 1 | Harder | **Avoid** (poor isolation; prior strategy abandoned) |
| M | Revert Step 2 shared ResizeObserver | ticker RO | 1 | 1 | 1 | 1 | Easy | **Later / optional cleanup** — neutral for crash, slight complexity |
| N | Keep Steps 1, 3–5 for now | — | — | — | — | — | — | **Keep** until proven harmful |

**Classification reminder**

| Kind | Examples |
|------|----------|
| Reduces actual workload | A, B, C, D, E, F, G, H, I |
| Mostly makes animation *look* slower | J; parts of Step 5 |
| May reduce memory/layer pressure | B, C, D, E, H, I (fewer promoted/filtered layers) |
| Improves diagnostics more than perf | Extremely narrow feature flags / counters without removing work |

---

## 6. Recommended experimental sequence

Next **five isolated** Safari recovery steps (do **not** start implementing here). Preserve desktop appearance; minimise mobile visual change; one technical variable each.

### Step 6 (recommended next) — Gate `lens-glow-clock` to active lens highlights

- **Change only:** Stop continuous `body` `lens-glow-clock` when `selectedLens === "Overview"` (or when no highlight nodes); restore clock when a lens is active. Prefer mobile/iOS-first if desktop must stay byte-identical including idle CSS.
- **Must not change:** Tickers, radar, backdrop-filter inventory, Role Lens letter animation, Beyond.
- **Success:** Crash delay/elimination on idle Overview scroll/browse (typical test).
- **Failure:** Crash unchanged → demote document-wide custom-property animation as primary; keep change if cheap or revert.
- **Why first:** Highest diagnostic × reduction with near-zero Overview visual impact; never isolated before.

### Step 7 — Mobile-only remove ticker `mask-image`

- **Change only:** `.ticker-mask { mask-image: none }` under the same activation spirit as Steps 4–5 **or** a dedicated mobile media query; keep rAF motion.
- **Must not change:** Ticker speed, scheduler, radar, lens glow.
- **Success:** Stability improves with tickers still moving → masked transforms were material.
- **Failure:** Neutral → compositor cost lies elsewhere (blur/will-change/backdrop).

### Step 8 — Mobile-only remove ticker `will-change-transform` **or** stream `backdrop-blur` (pick one)

- **Change only:** One of those two.
- **Must not change:** Mask decision from Step 7 (freeze prior result), radar, lens.
- **Success/failure:** Isolates layer-promotion vs backdrop sampling on tickers.

### Step 9 — Pause radar animations while offscreen (single IO)

- **Change only:** IntersectionObserver on radar plane/section; pause capped rAF **and** Framer pulses (or unmount pulse spans) when not intersecting; resume without layout jump.
- **Must not change:** Tickers, lens glow, visible radar appearance when on-screen.
- **Success:** Improves long scroll sessions where radar was offscreen burning budget.
- **Failure:** Crash still on hero-only dwell → radar offscreen cost secondary for that protocol.

### Step 10 — Mobile-only remove `.radar-sweep` `filter: blur`

- **Change only:** `filter: none` on mobile sweep (keep rotate + gradient).
- **Must not change:** Period/opacity profile unless necessary for parity; no pulse changes.
- **Success:** Improves despite Steps 4–5 → **filter**, not cadence, was the radar hook.
- **Failure:** Radar filter not primary; move to pulses or page-wide backdrop-blur.

---

## 7. Instrumentation and validation plan

Tools: **Mac Safari + iPhone via Develop menu**, Web Inspector (Timelines, Layers, Memory, CPU).

### Distinguish failure modes

| Hypothesis | What to observe |
|------------|-----------------|
| CPU saturation | Timelines: Script/rAF dense; JS thread busy; Step 1-like shared rAF count low but still hot |
| GPU / compositor pressure | Layers: many promoted surfaces; long paint/composite; backdrop-filter layers; masked layers updating every frame |
| Memory / layer accumulation | Memory climb over 1–3 minutes idle; layer count not releasing on scroll; crash without CPU pegged at 100% |
| Layout thrashing | Forced layout records tied to ticker `scrollWidth` measure (should be rare post–shared RO unless resize storms) |
| Subscription leaks | Diagnostics counters (`createPortfolioRuntimeCounters.js`) or Inspector: rAF/RO/IO counts grow across remounts; not expected on clean production path |

### Concrete checks for this codebase

1. **Count continuous clocks at idle Overview:** body glow animation present; 9 letter animations; 1 stage blink; 1–2 ticker rAF subscribers when hero visible; radar rAF or CSS sweep; 2 Framer infinite nodes.
2. **Toggle Overview vs active lens:** watch whether `--lens-glow` animation correlates with broader style invalidation.
3. **Scroll radar offscreen:** confirm sweep/pulses still updating (Inspector / overlay) — documents offscreen waste.
4. **Layers panel:** note ticker tracks, sticky Role Lens, radar plane, SurfaceCards.
5. **Compare protocols:** (a) dwell on hero only; (b) slow full-page scroll; (c) dwell on radar — maps to tickers vs radar vs cumulative.

### What *not* to treat as proof

- A single shorter/longer TTF crash after a visual-softening change (Step 5 lesson).
- Desktop Chrome perf as proxy for iPhone Safari.

---

## 8. Findings requiring runtime confirmation

### Code-supported (strong)

- Exact owners of infinite animations, rAF, observers, masks, blurs, will-change (paths above).
- Beyond View not mounted when closed.
- Two ticker streams; shared schedulers after Steps 1–3.
- `lens-glow-clock` attached to `body` unconditionally in CSS.
- Radar continues without intersection gating.
- Step outcomes: 1 helpful; 2–3 neutral; 4–5 insufficient for sweep cadence/softening.

### Hypotheses needing measurement

- Whether `body` `--lens-glow` animation causes **broad** style invalidation on Overview (no highlight consumers) vs cheap unused inheritance.
- Relative crash contribution of **ticker mask** vs **page-wide backdrop-blur count**.
- Whether crashes are closer to **GPU watchdog / jetsam** vs **CPU hang** (Memory vs CPU traces).
- Whether Framer pulse runtime is material vs CSS sweep filter.
- Whether sticky Role Lens blur during scroll is a trigger in long sessions.

---

## 9. Final recommendation

### Single best next experiment

**Step 6: Gate `lens-glow-clock` so it does not run on idle Overview (especially mobile/iOS), without touching tickers or radar.**

### Top three likely cumulative contributors

1. Document-level continuous `lens-glow-clock` + highlight shadow system.  
2. Ticker **masked / will-change / backdrop-blur** transforming layers (remaining after Step 1).  
3. **Stacked backdrop-filter surfaces** + radar **filter/blur + infinite pulses + offscreen residency** (cadence already tested).

### Steps 1–5 disposition

| Step | Keep? | Note |
|------|-------|------|
| 1 Shared ticker rAF | **Keep** | Proven partial win; low visual cost |
| 2 Shared ResizeObserver | **Keep for now**; candidate **neutral complexity** to simplify later if desired | No crash benefit observed |
| 3 Offscreen ticker pause | **Keep** | Correct hygiene; limited benefit when hero visible |
| 4 Mobile radar 30 FPS | **Keep** pending Step 9–10 radar isolations | Cadence alone insufficient |
| 5 Softer/slower mobile sweep | **Keep** as visual mobile profile unless it confounds later radar tests | Likely *appearance* change more than stability |

### Do not do next

- Remove Risk Radar first.  
- Broad mobile redesign / multi-effect “stability profile”.  
- Further “make it slower” tweaks without removing compositor work.  
- Treat Beyond AR as the idle homepage crash owner.

---

## Appendix — Search coverage (validation)

Performed across `src/` before writing this audit:

- `requestAnimationFrame` / `cancelAnimationFrame`
- `setInterval` / `setTimeout`
- Framer Motion imports / `repeat: Infinity`
- `@keyframes` / `animation:`
- `backdrop-filter` / `backdrop-blur` / `filter` / `blur(` / `mask-image` / `will-change`
- `IntersectionObserver` / `ResizeObserver` / scroll & resize listeners
- Section composition via `PortfolioCore.jsx`, `App.jsx`, portfolio sections, Beyond mount gating

**Application source was not modified for this audit.**
