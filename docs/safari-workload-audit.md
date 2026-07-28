# Safari iOS Workload Audit

**Mode:** Architecture / performance audit only — no application source or CSS changes.  
**Artifact:** `docs/safari-workload-audit.md` (this file only).  
**Crash baseline:** restored portfolio at `900e1d6` (historical visual implementation).  
**Device context:** real iPhone Safari crash; recovery Steps 1–5 already run (see `docs/safari-recovery-log.md`).  
**Audit revision:** full rendering / animation / compositing / memory pass (2026-07-28).

**Evidence classes used throughout**

| Label | Meaning |
|-------|---------|
| **Verified code fact** | Observable in source: file, symbol, selector, lifecycle |
| **Strong inference** | Code + WebKit-sensitive pattern + Steps 1–5 outcomes |
| **Hypothesis** | Needs Safari Web Inspector / device measurement |

---

## 1. Executive summary

### Highest sustained idle-homepage workloads (Safari iOS)

1. **Document-wide CSS custom-property clock** — `body { animation: lens-glow-clock 2.8s ease-in-out infinite }` with `@property --lens-glow` (`src/index.css`). Runs even on Overview with no highlight consumers.
2. **Ticker streams as large masked, promoted, continuously transformed surfaces** sitting in translucent `backdrop-blur` chrome — `TickerStream.jsx` + `.ticker-mask` + `will-change-transform` (usually first viewport).
3. **Many simultaneous `backdrop-blur` / translucent cards** — `SurfaceCard`, assistant, Role Lens sticky bar, radar map panel, language chips, attestation cards.
4. **Multiple independent animation clocks** still alive while scrolling: Role Lens letter-scan (×9), project stage blink, radar sweep (CSS or Step 4–5 rAF), Framer infinite radar pulses (×2), body glow clock, ticker rAF when visible.
5. **Risk Radar** remains a **contributor** (large blurred/filtered disc, panel blur, offscreen-continued animation) but Steps 4–5 show **sweep cadence/softening alone are not the primary crash lever**.

### Largest GPU-backed / composited surfaces

- Hero full-bleed decorative overlays + two full-width ticker bands.
- Sticky Role Lens bar with `backdrop-blur` over scrolling content.
- Dense `SurfaceCard` backdrop-filter stack down the page.
- Risk Radar ~viewport-width (mobile) square panel + circular sweep with `filter: blur`.
- Assistant sidebar with `backdrop-blur` + `public/profile.png` (~1.3 MB decode).

### Most likely crash class

**Cumulative GPU/compositor + layer/memory pressure**, with a **proven CPU/scheduling component** (Step 1 shared ticker rAF delayed crashes to ~2–3 min). Not explained by a single component; **not** explained by Beyond AR on idle (`ARGovernanceView` returns `null` when closed).

### Top three cost/opportunity moves

1. **Gate `lens-glow-clock` to active lens only** (Overview idle = off) — Category **A**.
2. **Mobile-only remove ticker `mask-image`** (keep motion) — Categories **A** + **C**.
3. **Pause radar sweep + Framer pulses while offscreen** OR **mobile-only remove sweep `filter: blur`** — one variable each — Categories **A** / **C**.

### Single best next experiment

**Step 6:** Stop continuous `body` `lens-glow-clock` while `selectedLens === "Overview"` (mobile/iOS-first if desktop CSS must stay identical). Do not touch tickers or radar in that step.

---

## 2. Audit methodology and limitations

### Method

- Full-tree searches for: `requestAnimationFrame`, `cancelAnimationFrame`, `setInterval`, `setTimeout`, `@keyframes`, `animation:`, Framer Motion, `backdrop-filter` / `backdrop-blur`, `filter`, `blur`, `mask-image`, `will-change`, `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, scroll/resize/pointermove, canvas/WebGL, `devicePixelRatio`, visibility lifecycle.
- Read live owners: ticker scheduler/RO/IO, `RiskRadar` + `radarSweepCadence`, `RoleLens`, `HeroSection`, `portfolioUi`, `App` assistant/intro/Beyond gating, `index.css` animation blocks.
- Cross-check prior inventories: `src/diagnostics/sectionRuntimeAudit.js`, `portfolioRuntimeOwners.js`.
- Cross-check device outcomes: Steps 1–5 in `docs/safari-recovery-log.md`.

### Absences verified (homepage idle)

| Pattern | Homepage idle result |
|---------|----------------------|
| `useAnimation` / `useMotionValue` | **Not used** in portfolio UI |
| `MutationObserver` | **Not** in portfolio/`App.jsx` (AR audit tooling only) |
| `clip-path` / `mix-blend-mode` | **Not** material in portfolio CSS/JS paths searched |
| Homepage canvas / WebGL | **None** idle; WebGL only under Beyond open |
| `pointermove` on homepage | **None** (AR hit-layer only when open) |
| Page visibility pausing of animations | **None** in portfolio animation owners |

### Limitations

- No iPhone Instruments capture in this pass — relative costs are **not** absolute ms/MB.
- Layer promotion is **inferred** from `will-change`, `transform`, `filter`, `backdrop-filter`, sticky/fixed — confirm in Layers panel.
- Whether unused inherited `--lens-glow` animation is “cheap” or “expensive” on Overview is a **hypothesis** until measured.

---

## 3. Current rendering and animation architecture

### Page composition (production)

`App.jsx` → `PortfolioCore` with eager sections: Hero → Role Lens → Capabilities → Credentials → Experience → Projects → Education → Risk Radar; sidebar: Beyond card + Portfolio Assistant; `BeyondView` only when `arOpen`.

### Continuous / recurring systems (live architecture)

| Concern | Owner | File / symbol | Mechanism | Frequency | Instances | Visibility behaviour | Affected area |
|---------|--------|---------------|-----------|-----------|-----------|----------------------|---------------|
| Ticker scheduling | Shared rAF | `createTickerFrameScheduler.js` `subscribeTickerFrame` / `tick` | One `requestAnimationFrame` fan-out | Display refresh while subscribers &gt; 0 | 1 loop; up to **2** subscribers (`stackStreams`) | Step 3: unsubscribe when root non-intersecting | Hero ticker rows |
| Ticker transform write | Per stream | `TickerStream.jsx` `onFrame` | `track.style.transform = translate3d(...)` | Per subscribed frame | 2 tracks | Paused offscreen / mouseenter | Full-width bands |
| Ticker measurement | Shared RO | `createTickerResizeObserver.js` → `measure` | `track.scrollWidth` layout read + optional transform write | On resize | 1 RO; 2 elements | Always while mounted | Track width |
| Ticker visibility | Shared IO | `createTickerVisibilityObserver.js` | `IntersectionObserver` | On intersect change | 1 IO; 2 roots | Controls rAF subscribe | Root bounds |
| Ticker mask | CSS | `.ticker-mask` | `mask-image` linear fade | Continuous with transform child | 2 | Mounted always | Masked overflow row |
| Ticker blur chrome | Tailwind | `TickerStream` root `backdrop-blur` | backdrop-filter | Static but continuous composite | 2 | Always | Stream chrome |
| Body glow clock | CSS | `body` + `@keyframes lens-glow-clock` + `@property --lens-glow` | CSS animation of inherited custom property | 2.8s infinite | 1 document | **Never gated** | Entire inheritance tree |
| Lens highlight shadows | CSS | `.role-lens-highlight-*`, `.role-lens-radar-node` | `box-shadow` via `var(--lens-glow)` | Continuous when classes present | 0..N cards/nodes | Only non-Overview relevant items | Cards / radar nodes |
| Role Lens letters | CSS | `.role-lens-letter` / `role-lens-type-scan` | opacity, color, text-shadow, **scale** | 4.4s infinite staggered | **9** spans | Always | Sticky header title |
| Role Lens reset | CSS | `.role-lens-reset-active` | opacity + text-shadow | 3.2s infinite | 0–1 | When lens active | Small control |
| Role Lens sticky blur | DOM/CSS | `RoleLens.jsx` sticky `backdrop-blur` | sticky + backdrop-filter | While stuck over content | 1 | Early/mid scroll | Full content width |
| Radar sweep (desktop) | CSS | `.radar-sweep` `animation: radar-sweep` | rotate transform | 18–28s infinite | 1 | **Continues offscreen** | ≤500px disc |
| Radar sweep (mobile/iPhone) | JS | `radarSweepCadence.js` `startCappedRadarSweep` | rAF ~30 FPS rotate; class disables CSS | ~33 ms paint interval; 24s period | 1 rAF chain | **Continues offscreen**; stops if mapView ≠ risk-map | Same disc |
| Radar pulses | Framer | `RiskRadar.jsx` dual `motion.span` | scale + opacity Infinity | 2.1s loop | **2** | Continues while risk-map + domain selected | Node-local |
| Radar panel blur | Tailwind | Risk map wrapper `backdrop-blur` | backdrop-filter | Static composite | 1 large | Always while section mounted | Large square |
| Project stage blink | CSS | `.project-stage-current` | background-color steps | 1s infinite | 1 | Continues offscreen | Tiny bars |
| Assistant preview | Timer | `App.jsx` `PortfolioAssistant` | `setInterval` 3600ms → React state | 3.6s | 1 | Always while feature on | Sidebar text swap |
| Hero entrance | Framer | `HeroSection.jsx` | finite opacity/y | Once on mount | 4 motions | Idle after finish | Hero copy |
| Experience entrance | Framer | `whileInView` once | finite | Per article once | 3 | Once | Experience cards |
| Deck / radar tab / assistant UI | Framer | various | enter/exit | Interaction | Variable | Interaction | Local |
| Intro overlay | Framer + CSS | `PortfolioIntro` | fixed + `backdrop-blur-md` | ~3.8s first visit | 1 | Transient | Full viewport |
| Beyond AR | MindAR/Three | `src/components/ar/*` | camera, WebGL, rAF | While open | Heavy | **Not mounted when closed** | Full screen |

### Ownership summary (who writes what)

| Mechanism | Writes transform | Writes opacity | Layout reads | DOM style writes | Visibility control | Cleanup owner |
|-----------|------------------|----------------|--------------|------------------|--------------------|---------------|
| Ticker rAF | Track `translate3d` | Item classes (React) | `scrollWidth` in measure (RO, not per frame) | Yes, per frame | IO → subscribe/unsubscribe | Effect cleanup + shared maps |
| Radar capped rAF | Sweep `rotate` | Class opacity 0.55 | No | Yes, ~30 FPS | `mapView` effect only | Effect return `stop()` |
| CSS radar-sweep | rotate via keyframes | — | No | Compositor | None | Detach / reduced-motion |
| Framer pulses | scale | opacity | Internal | Via Framer | Unmount / view swap | Framer on unmount |
| Body glow | — | Indirect via shadow calc | Potential style recalc | CSSOM animation | **None** | Never stops |
| Letter scan | scale | opacity | No | CSS | None | Detach |
| Stage blink | — | via bg | No | CSS | None | Detach |

### Components with more than one animation owner

| Component | Owners |
|-----------|--------|
| **Risk Radar (risk-map)** | CSS or JS sweep **+** Framer dual pulses **+** optional `--lens-glow` node shadows when lens-linked |
| **TickerStream** | Shared rAF **+** CSS mask on ancestor **+** backdrop-blur on root **+** will-change on track |
| **Role Lens** | Sticky backdrop **+** 9 CSS letter clocks **+** optional reset pulse **+** body glow feeding highlights elsewhere |
| **Project deck** | Framer slide on change **+** CSS stage blink idle |

---

## 4. Transform, paint and compositing ownership map

### Material elements

#### Ticker track (`.will-change-transform` under `.ticker-mask`)

- **Path:** JS main-thread animation → composite; mask forces masked compositing.
- **Animated property:** `transform`.
- **Area:** ~content width × row; track is **doubled items** (`[...items, ...items]`) → wide offscreen buffer.
- **Transparent descendants:** yes (text/dots).
- **Ancestor backdrop-filter:** yes on `.ticker-stream`.
- **Mask:** yes `.ticker-mask`.
- **Shadows:** small dot `shadow-sm`.
- **Layer promotion:** likely (`will-change-transform` + transform).
- **Viewport-relative size:** large horizontal; moderate vertical.
- **Offscreen alive:** layer/DOM yes; rAF no (Step 3).

#### Radar sweep (`.radar-sweep` / `--cadence-capped`)

- **Path:** CSS compositor **or** mixed JS transform writes; **`filter: blur`** on moving element.
- **Area:** large circle (mobile often near full content width).
- **Ancestor backdrop-filter:** yes (panel).
- **Mask:** overflow rounded; no mask-image on sweep.
- **Offscreen alive:** **yes** (no IO).

#### Body `--lens-glow`

- **Path:** CSS animation of custom property; consumers recompute shadows when highlight classes exist.
- **Area:** theoretically document-wide inheritance.
- **Offscreen alive:** yes.

#### SurfaceCard / sticky Role Lens / radar panel / assistant

- **Path:** GPU-backed backdrop-filter surfaces (static filters, continuous cost under scroll/overlap).
- **Offscreen alive:** DOM/layers typically retained while mounted.

#### Framer radar pulses

- **Path:** JS-driven transform/opacity + paint of soft borders/shadows.
- **Area:** small; continuous clock cost + local composite.

---

## 5. Continuous animation systems inventory

Counted for **idle Overview, risk-map default, assistant on, Beyond closed, after intro dismissed**:

| # | System | Clock type | Count |
|---|--------|------------|-------|
| 1 | Shared ticker rAF | JS | 1 loop / 0–2 subscribers |
| 2 | Body `lens-glow-clock` | CSS | 1 |
| 3 | Role Lens letter-scan | CSS | 9 |
| 4 | Radar sweep | CSS **or** JS rAF | 1 |
| 5 | Radar Framer pulses | JS (Framer) | 2 |
| 6 | Project stage blink | CSS | 1 |
| 7 | Assistant preview interval | Timer | 1 (non-frame) |

**Simultaneous animation clocks (frame-class):** typically **~14–15** CSS/JS animation drivers if both tickers visible (1 rAF + 1 body + 9 letters + 1 sweep + 2 pulses + 1 blink), plus static backdrop-filter surfaces.

---

## 6. Relative workload budget

| Rank | Component / effect | CPU | GPU | Paint | Composite | Memory / layers | Sustained? | Offscreen active? | Confidence |
|------|--------------------|-----|-----|-------|-----------|-----------------|------------|-------------------|------------|
| 1 | `body` lens-glow-clock | medium | medium | medium | high | medium | yes | yes | high (presence); medium (cost magnitude) |
| 2 | Ticker transform+mask+will-change+blur | medium–high | high | medium | **very high** | high | yes (usually on-screen) | rAF no; layers yes | high |
| 3 | Aggregated backdrop-blur cards/panels | low | **high** | low–medium | **high** | **high** | yes | yes (mounted) | high |
| 4 | Role Lens letters ×9 + sticky blur | low–medium | medium–high | medium | high | medium | yes | letters yes | medium–high |
| 5 | Radar sweep filter + panel blur | low–medium | high | medium | high | high | yes | **yes** | medium–high |
| 6 | Radar Framer infinite pulses | medium | medium | medium | medium | low–medium | yes | **yes** | medium |
| 7 | Shared ticker rAF (post–Step 1) | medium | low (itself) | low | low | low | while visible | no | high |
| 8 | Project stage blink | negligible | low | low | low | negligible | yes | yes | medium |
| 9 | Assistant setInterval + Framer swap | low | low | low | low | low | intermittent | n/a | high |
| 10 | Hero static gradients/grid | negligible | low | low–medium | low | medium | static | yes | medium |
| 11 | `profile.png` / mascot PNG | low (decode) | low | low | low | **medium–high** | decode once | yes | high (size fact) |
| 12 | Attestation `mask-image` rail | negligible | low–medium | low | medium | low | static | yes | medium |
| 13 | Beyond AR stack | **very high** | **very high** | high | **very high** | **very high** | only when open | n/a idle | high |
| 14 | Intro fullscreen blur | medium | high | medium | high | medium | brief | n/a | high |

**Justification anchors:** Step 1 CPU improvement; Steps 2–3 weak → visible masked ticker composite remains; Steps 4–5 weak → radar FPS/opacity not primary; Beyond unmounted idle; `profile.png` ~1.35 MB / mascot ~184 KB verified on disk.

---

## 7. Ranked workload candidates

1. Body `--lens-glow` continuous clock (untested isolation; document-wide).  
2. Ticker masked + promoted continuous transforms in blurred chrome.  
3. Page-wide backdrop-filter stack.  
4. Role Lens multi-clock letter-scan + sticky backdrop.  
5. Radar large filtered/rotated sweep + panel blur + offscreen continuation.  
6. Radar Framer infinite pulses (second owner on same section).  
7. Residual ticker main-thread rAF (improved, still real).  
8. Large decoded bitmaps (assistant profile).  
9. Project stage blink (small).  
10. Beyond (idle: not a candidate; open: dominant).

---

## 8. Detailed findings

### Candidate: Ticker animation

- **Files:** `src/portfolio/TickerStream.jsx`, `createTickerFrameScheduler.js`, `HeroSection.jsx`, `portfolioData.js` (`stackStreams`).
- **Symbols / selectors:** `subscribeTickerFrame`, `onFrame`, `.will-change-transform`, `.ticker-stream`.
- **Rendered behaviour:** Two horizontal marquees, speed 28 px/s, duplicated item lists.
- **Animation owner:** Shared JS rAF scheduler.
- **Mechanism:** Per-frame `translate3d` DOM writes.
- **Continuous:** Yes while intersecting.
- **Instances:** 2 streams.
- **Offscreen:** rAF stopped (Step 3); DOM/CSS layers remain.
- **Viewport coverage:** ~full width × 2 rows in hero.
- **Layout / paint / composite / GPU:** Layout not per-frame; paint of text; **composite very high** with mask+will-change.
- **Memory retention:** Promoted tracks for session.
- **Safari rationale:** Masked transforming layers; Step 1 helped CPU multiplicity.
- **Evidence:** Verified code + Step 1 outcome.
- **Uncertainty:** Exact layer size vs DPR.
- **Confidence:** High.
- **Classification:** **SAFE WITH TESTS** (cadence/speed already sensitive; prefer mask/will-change/blur isolations).

### Candidate: Ticker measurement

- **Files:** `createTickerResizeObserver.js`, `TickerStream.jsx` `measure`.
- **Mechanism:** Shared `ResizeObserver` → `scrollWidth` → halfWidth + transform sync.
- **Continuous:** No — event-driven.
- **Offscreen:** Still subscribed.
- **Layout cost:** Medium on resize spikes; low idle.
- **Safari rationale:** Step 2 neutral → not crash primary.
- **Confidence:** High.
- **Classification:** **SAFE TO OPTIMISE** only as cleanup; **NOT** next crash experiment.

### Candidate: Ticker masks / fade edges

- **Files:** `src/index.css` `.ticker-mask`.
- **Selector:** `mask-image: linear-gradient(...)`.
- **Behaviour:** Fades edges of transforming track.
- **Owner:** CSS mask on parent of animated transform.
- **Continuous:** Yes with motion.
- **Composite / GPU:** **Very high** suspicion (mask × transform).
- **Safari rationale:** Canonical WebKit-sensitive combo; not yet A/B tested.
- **Confidence:** High for pattern; medium for crash share.
- **Classification:** **SAFE WITH TESTS** (visual edge change).

### Candidate: Risk Radar sweep

- **Files:** `RiskRadar.jsx`, `radarSweepCadence.js`, `index.css` `.radar-sweep`, `.radar-sweep--cadence-capped`.
- **Desktop:** CSS `@keyframes radar-sweep` rotate + `filter: blur(0.35px)` (base) / media variants.
- **Mobile/iPhone:** JS rAF ~30 FPS, 24s period, `opacity: 0.55`, softer gradient, `animation: none`.
- **Offscreen:** **Active**.
- **Viewport coverage:** Large disc.
- **Composite / GPU:** High (filter on rotating conic-gradient).
- **Evidence:** Steps 4–5 failed to clear crash → cadence/softening ≠ primary.
- **Uncertainty:** filter vs panel backdrop vs pulses contribution split.
- **Confidence:** Medium–high.
- **Classification:** **SAFE WITH TESTS**; do **not** treat further “slower/fainter” as Category A.

### Candidate: Risk Radar active-node pulses

- **Files:** `RiskRadar.jsx` lines with `motion.span`, `repeat: Infinity`; `portfolioLens.js` pulse shadow classes.
- **Owner:** Framer Motion (separate from sweep).
- **Continuous:** Yes on risk-map.
- **Offscreen:** Yes.
- **CPU/GPU:** Medium.
- **Confidence:** Medium.
- **Classification:** **SAFE WITH TESTS**.

### Candidate: Risk Radar shadows / glows

- Centre badge `shadow-[0_0_34px_…]`; pulse borders; lens node glow via `--lens-glow`.
- **Paint/composite:** Medium local; higher when lens highlights radar nodes.
- **Classification:** **SAFE WITH TESTS** (pair with glow-clock gating).

### Candidate: Risk Radar transparent / filtered container

- Panel: `bg-slate-900/45 backdrop-blur shadow-xl`.
- Sweep: `filter: blur`.
- Plane: `overflow-hidden rounded-full`.
- **GPU/layer:** High large translucent + filtered child.
- **Classification:** **SAFE WITH TESTS**.

### Candidate: Hero idle effects

- Finite Framer entrance only; static grid/radial overlays; language chips `backdrop-blur` (×4); tickers are the sustained Hero cost.
- **Classification:** Tickers **SAFE WITH TESTS**; static overlays **later**.

### Candidate: Role Lens effects

- Sticky `backdrop-blur`; 9× `role-lens-type-scan`; reset pulse; summary Framer on change.
- **Offscreen letters:** still animate when scrolled away if section mounted (usually near top).
- **Classification:** **SAFE WITH TESTS**.

### Candidate: Project carousel

- Framer on navigate only; `.project-stage-current` blink idle; CodeIAK mascot static img + dual `drop-shadow` filters (`index.css`).
- **Classification:** Blink **SAFE TO OPTIMISE** (low visual); mascot filter **later**.

### Candidate: Beyond animations

- Card: static CSS. View: null when closed — **verified**.
- Open: WebGL/`devicePixelRatio`, camera — separate crash domain.
- **Classification idle:** **NOT RECOMMENDED** as next homepage experiment.
- **Classification open:** high risk domain, out of idle scope.

### Candidate: Large backdrop-filter cards

- `SurfaceCard` default `backdrop-blur` used across capabilities (6), experience (3), education, projects, radar side panel; plus assistant, credentials attestation cards.
- **Sustained GPU:** High aggregate.
- **Visual impact if removed:** Noticeable (Category C / visual).
- **Classification:** **SAFE WITH TESTS** after higher-ROI singles; mobile-only solid fill.

### Candidate: mask-image usage

- Tickers (critical); `.attestation-rail` (secondary).
- **Classification:** ticker mask immediate; attestation later.

### Candidate: Animated gradients

- Radar conic-gradient rotated — material.
- Hero gradients — static.
- **Classification:** radar filter/rotate isolations preferred over removing gradient concept.

### Candidate: Fixed / sticky translucent UI

- Role Lens sticky blur — material.
- Intro/modal fixed blur — transient.
- **Classification:** sticky blur **SAFE WITH TESTS**.

### Candidate: Global will-change

- Tickers: always `will-change-transform`.
- Radar sweep mobile CSS: `will-change: transform` (≤639px rule still in stylesheet; capped class disables animation but will-change rule may still apply from media query depending on cascade — **verify in computed styles**; capped element still transforms via JS).
- **Classification:** **SAFE WITH TESTS**.

### Candidate: Offscreen animation systems

| System | Offscreen animation? |
|--------|----------------------|
| Ticker rAF | No (Step 3) |
| Ticker layers/mask/blur | Retained |
| Body glow | Yes |
| Letters / stage blink | Yes |
| Radar sweep / pulses | **Yes** |
| Beyond | Unmounted |

### Candidate: Large image / asset

- `public/profile.png` ~1.35 MB used at 64×64 / 44×44 — decode/memory disproportion (**verified size**).
- `codeiak-banner-wide.png` ~184 KB + drop-shadow filters.
- **Classification:** profile downscale **SAFE TO OPTIMISE** (Category C); not first if crash is compositor-idle.

### Candidate: Lifecycle / cleanup anomaly

- Ticker/radar cleanups present and appear symmetric (see §9).
- Homepage animations **ignore `visibilitychange`** — tabs hidden may still run (hypothesis for background drain; crash reports are foreground).
- **Classification:** visibility pause **SAFE WITH TESTS**; secondary.

---

## 9. Lifecycle and cleanup audit

### Shared ticker rAF (`createTickerFrameScheduler.js`)

| Phase | Behaviour |
|-------|-----------|
| Creation | First `subscribeTickerFrame` starts rAF |
| Pause | Subscriber count 0 → `cancelAnimationFrame` |
| Resume | New subscribe restarts |
| Dispose | Per-unsubscribe; map delete |
| Duplicate-start | Single `rafId` guard |
| StrictMode | Effect cleanup should unsubscribe; **SAFE WITH TESTS** |
| **Class** | **SAFE** |

### TickerStream effect

| Phase | Behaviour |
|-------|-----------|
| Start | measure → optimistic visible → startFrames → RO + IO |
| Pause | IO false → `stopFrames`; mouseenter pauses delta |
| Resume | IO true → `startFrames` with `lastTimeRef=0` |
| Unmount | stopFrames + unsub IO + unsub RO |
| **Class** | **SAFE WITH TESTS** |

### Shared RO / IO

| Phase | Behaviour |
|-------|-----------|
| Empty map | `disconnect` + null singleton |
| **Class** | **SAFE** |

### Radar capped sweep

| Phase | Behaviour |
|-------|-----------|
| Start | `mapView==='risk-map'` && mobile/iPhone predicate |
| Pause | None for offscreen; stops if leave risk-map / unmount |
| Cleanup | cancel rAF, remove class, clear transform |
| Duplicate | Effect deps `[mapView]`; `startFrames`-style single chain inside start |
| MQ change | **No live re-evaluate** of `shouldReduceRadarSweepCadence` on rotate without remount — **SUSPICIOUS** minor (landscape flip may keep wrong path until remount) |
| **Class** | **SAFE WITH TESTS** (add MQ listener later, not Step 6) |

### Body glow / letter / stage CSS

| Phase | Behaviour |
|-------|-----------|
| Start | Stylesheet load |
| Pause | `prefers-reduced-motion` only |
| Page hidden | **No** |
| **Class** | **SUSPICIOUS** for idle cost (always on) |

### Framer pulses

| Phase | Behaviour |
|-------|-----------|
| Start | Active domain on risk-map |
| Hidden/offscreen | **Continues** |
| Unmount / view change | Framer cancels |
| **Class** | **SUSPICIOUS** (offscreen) / **SAFE WITH TESTS** to gate |

### Assistant interval

| Phase | Behaviour |
|-------|-----------|
| Cleanup | `clearInterval` on unmount — **SAFE** |

### AcademicFocusInfo

| Phase | Behaviour |
|-------|-----------|
| Listeners | Only while open; removed on close — **SAFE** |

### Beyond View

| Phase | Behaviour |
|-------|-----------|
| Closed | `null` — **SAFE** for idle |
| Open cleanup | portal teardown paths exist — out of idle scope |

### Duplicate rAF risk summary

- Tickers: shared singleton — **SAFE**.
- Radar: one chain per mount — **SAFE WITH TESTS**.
- No evidence of accumulating homepage rAF after clean unmount — **hypothesis** confirm with counters.

---

## 10. Actual workload vs visual-only changes vs memory/layer changes

### A — Actual workload reduction

- Gate/stop body glow when Overview.
- Pause radar JS/CSS + Framer when offscreen.
- Remove ticker mask or will-change or stream backdrop-blur (each alone).
- Disable letter-scan / stage blink.
- Stop Framer infinite → finite/static.
- Fewer backdrop-filter instances.
- Pause animations on `document.hidden`.

### B — Visual change with little / uncertain workload reduction

- Step 5 slower/fainter sweep **while same rAF cadence and filtered surface remain**.
- Further duration tweaks, easing changes, opacity-only on still-composited full-size layers.
- “Calmer” motion that still invalidates the same layer every frame.

### C — Memory / layer pressure reduction

- Remove unnecessary `will-change`.
- Remove/replace large `backdrop-filter`.
- Avoid retaining offscreen animated filtered layers (pause + optionally `content-visibility` / unmount — careful).
- Downscale `profile.png`.
- Reduce nested translucent stacks.

**Do not mix:** a Step 5-style soften is **B** (and partial C only if it truly shrinks filter work — unproven).

---

## 11. Cost/opportunity matrix

| Rank | Exact proposed change | Target | Category | Reduction | Visual | Risk | Diagnostic | Rollback | Recommendation |
|------|----------------------|--------|----------|-----------|--------|------|------------|----------|----------------|
| 1 | Gate `lens-glow-clock` off on Overview (mobile/iOS-first) | `index.css` + lens state wiring | A | 4–5 | 1–2 | 2 | 5 | 5 | **immediate** |
| 2 | Mobile-only remove `.ticker-mask` mask-image | `index.css` | A+C | 4 | 2–3 | 2 | 4 | 5 | **next** |
| 3 | Mobile-only remove ticker `will-change-transform` | `TickerStream.jsx` | C (+A?) | 3 | 1–2 | 2 | 4 | 5 | **next** |
| 4 | Pause radar sweep+pulses when section not intersecting | `RiskRadar.jsx` | A+C | 3–4 | 1 | 2–3 | 4 | 4 | **next** |
| 5 | Mobile-only `filter:none` on `.radar-sweep` | `index.css` | A+C | 3 | 2 | 1 | 4 | 5 | **next** |
| 6 | Mobile-only disable `.role-lens-letter` animation | `index.css` | A | 3 | 2–3 | 1 | 3 | 5 | **later** |
| 7 | Mobile-only solid Role Lens sticky (no backdrop-blur) | `RoleLens.jsx` | C | 3 | 2 | 1 | 3 | 5 | **later** |
| 8 | Mobile-only strip `SurfaceCard` backdrop-blur | `portfolioUi.jsx` | C | 4 | 3 | 2–3 | 3 | 4 | **later** |
| 9 | Finite radar pulses / static active glow | `RiskRadar.jsx` | A | 3 | 2–3 | 2 | 4 | 4 | **later** |
| 10 | Downscale/compress `profile.png` | asset | C | 2 | 1 | 1 | 2 | 5 | **later** |
| 11 | Further slow/fainter sweep | radar CSS/JS | **B** | 1–2 | 3 | 1 | 1 | 5 | **avoid** |
| 12 | Remove Risk Radar section | portfolio | A | 5 | 5 | 3 | 3 | 3 | **avoid** (first) |
| 13 | Broad iOS stability profile | many systems | mixed | 5 | 4–5 | 5 | 1 | 2 | **avoid** |
| 14 | Revert Step 2 shared RO | tickers | — | 1 | 1 | 1 | 1 | 5 | **later** (neutral complexity) |

---

## 12. Recommended next five experiments

Ordered by cost/opportunity. **One technical variable each. Do not implement in this audit.**

### Experiment 1 — Gate body lens-glow clock (best next / Step 6)

- **Variable:** Whether `lens-glow-clock` runs on Overview.
- **Files:** `src/index.css`; minimal React hook to set `data-lens-glow="1"` on `html`/`body` only when lens ≠ Overview (or equivalent).
- **Mechanism:** Removes continuous custom-property animation / potential broad invalidation during typical crash tests.
- **Visual:** Overview unchanged; active lens keeps synced glow.
- **Unchanged:** Tickers, radar, blurs, Beyond.
- **Validation:** Inspector — confirm body animation absent on Overview; present with lens. Device crash timing.
- **Min device test:** **≥ 5 minutes** idle Overview + light scroll (longer than Step 4’s ~1 min).
- **Success:** Clear delay/absence of crash vs post–Step 5 baseline.
- **Failure:** Unchanged crash → glow clock not primary; keep or revert.
- **Rollback:** Revert single commit.
- **Class:** **SAFE WITH TESTS**.

### Experiment 2 — Mobile-only remove ticker mask-image

- **Variable:** Presence of `.ticker-mask { mask-image }`.
- **Files:** `src/index.css` only under mobile/iPhone condition matching existing activation discipline.
- **Mechanism:** Eliminates mask×transform compositing.
- **Visual:** Harder/missing edge fade.
- **Unchanged:** Speed, rAF, radar, glow.
- **Validation:** Layers — ticker mask gone; motion continues.
- **Min test:** ≥ 5 minutes hero dwell + scroll.
- **Success/failure:** Stability vs edge-fade regress only.
- **Rollback:** Revert commit.
- **Class:** **SAFE WITH TESTS**.

### Experiment 3 — Mobile-only remove ticker will-change-transform **or** stream backdrop-blur

- **Variable:** Exactly one of the two.
- **Files:** `TickerStream.jsx` **or** CSS override.
- **Mechanism:** Layer promotion vs backdrop sampling.
- **Visual:** Subtle.
- **Unchanged:** Mask decision frozen from Exp 2; radar; glow.
- **Min test:** ≥ 5 minutes.
- **Class:** **SAFE WITH TESTS**.

### Experiment 4 — Offscreen pause for radar sweep + pulses

- **Variable:** Radar continuous work while non-intersecting.
- **Files:** `RiskRadar.jsx` (+ small IO helper if needed). **Do not** change on-screen look.
- **Mechanism:** Category A+C — stop rAF/CSS/Framer offscreen.
- **Unchanged:** Tickers, glow, visible radar appearance.
- **Validation:** Scroll away — no sweep rAF / no Framer infinite; scroll back — resume without jump.
- **Min test:** ≥ 5 minutes including time with radar offscreen **and** hero dwell.
- **Class:** **SAFE WITH TESTS**.

### Experiment 5 — Mobile-only remove radar sweep `filter: blur`

- **Variable:** `filter` on `.radar-sweep` only.
- **Files:** `index.css` (mobile/capped path).
- **Mechanism:** Stop filtering a large rotating gradient.
- **Visual:** Slightly sharper sweep edge.
- **Unchanged:** 24s / 30 FPS / opacity profile unless unavoidable.
- **Min test:** ≥ 5 minutes.
- **Class:** **SAFE**.

---

## 13. Safari Web Inspector validation plan

### Setup

1. Mac Safari → Develop → [iPhone] → page.  
2. Enable Timelines, Layers, Memory (as available), Console.  
3. Test production build on device (GitHub Pages or local LAN).  
4. Dismiss intro; stay on Overview; Beyond closed.

### Manual protocols

| Protocol | Steps | Looks for |
|----------|-------|-----------|
| Hero dwell | Idle on load 5–10 min | Crash without radar in view |
| Full scroll | Slow scroll entire page repeatedly | Sticky blur + offscreen radar |
| Radar dwell | Scroll to radar, idle 5–10 min | Radar-local pressure |
| Lens on/off | Toggle Overview ↔ lens | Glow clock / shadow cost |
| Visibility | Home button / app switch return | Whether clocks pause (expect: no) |
| Remount stress | Expand experience, switch projects, open/close assistant | Duplicate clocks / leaks |
| Rotate | Portrait/landscape on iPhone | Radar cadence path; layout |

### Failure-class evidence

| Class | Supporting evidence |
|-------|---------------------|
| CPU saturation | Dense Script rows; long tasks; rAF callbacks; Step-1-like improvement pattern |
| GPU/compositor | Many/large layers; compositing with quiet JS; backdrop-filter/mask layers updating |
| Paint pressure | Large paint rects tied to masked tickers / filtered sweep / shadow invalidation |
| Memory/layer accumulation | Climbing memory over minutes; layer count sticky; crash after time with modest CPU |
| Layout thrashing | `scrollWidth`/layout records every frame (unexpected post–RO design) |
| Subscription leak | rAF/RO/IO counts rise across remount cycles; activity after teardown |

### Optional code aids (do not add in this audit)

Existing `createPortfolioRuntimeCounters.js` can patch rAF/RO/IO counts in diagnostic boots — use for leak checks, not production change here.

---

## 14. Findings requiring runtime confirmation

### Verified code facts

- Owners/paths for all continuous systems listed above.  
- Beyond View unmounted when closed.  
- Two `stackStreams`; shared ticker rAF/RO/IO.  
- Unconditional `body` lens-glow animation.  
- Radar offscreen continues.  
- Step outcomes 1–5.  
- Asset byte sizes for profile/mascot.  
- No homepage `useMotionValue` / idle WebGL / portfolio `MutationObserver`.

### Strong inferences

- Crash is **cumulative compositor/GPU + residual CPU**, not single radar FPS.  
- Ticker **mask×transform** still high value after Step 1.  
- Step 5 is largely **Category B**.  
- Glow clock is highest-value **untested** isolation.

### Hypotheses

- Magnitude of Overview `--lens-glow` invalidation cost.  
- Jetsam vs GPU hang vs CPU watchdog.  
- Sticky Role Lens blur as scroll trigger.  
- Framer pulses vs sweep filter relative weight.  
- Whether `will-change` on capped radar still promotes a large layer.

---

## 15. Review of Steps 1–5

| Step | Workload mechanism | Observed result | Retain now? | Eventually revert? | Neutral complexity? | May obscure measurements? |
|------|--------------------|-----------------|-------------|--------------------|---------------------|---------------------------|
| 1 Shared ticker rAF | Fewer JS animation loops; same visual motion | Improvement (~2–3 min) | **Yes** | No | Low | Slightly — remember baseline had N loops |
| 2 Shared ResizeObserver | Deduped measure observers | No improvement | Yes for hygiene | Optional later | **Yes neutral** | Minor |
| 3 Offscreen ticker pause | Stop rAF when non-intersecting | No improvement (hero usually visible) | Yes | No | Low | When testing hero-only, pause rarely engages |
| 4 Radar ~30 FPS rAF | Lower update rate; still filtered surface | No clear improvement | Yes pending radar isolations | Maybe if replaced by better radar pause | Adds mobile path | **Yes** — don’t attribute later wins to “FPS” alone |
| 5 Slower/fainter sweep | Category **B** (+ mild visual C?) | Possible small delay; crash remains | Keep as mobile visual profile | Revert if confounds filter A/B | Low | **Yes** — visual change ≠ workload proof |

**Do not revert during audit** (constraint respected).

---

## 16. Final recommendation

| Question | Answer |
|----------|--------|
| **Single best next isolated experiment** | Gate **`lens-glow-clock`** so it does not run on idle Overview (Step 6), without touching tickers or radar |
| **Three strongest cumulative contributors** | (1) Document-level glow clock + shadow system (2) Ticker mask/will-change/backdrop transforming surfaces (3) Backdrop-filter stack + radar filtered/offscreen animation complex |
| **Most likely failure class** | **Cumulative GPU/compositor + layer/memory pressure**, with demonstrated **CPU/scheduling** contribution (Step 1) |
| **Highest-confidence code-supported finding** | Idle homepage runs **many concurrent animation clocks** and **large translucent/blurred surfaces**, while Beyond AR is **not mounted** when closed |
| **Highest-value low-visual-impact optimisation** | Overview gating of `lens-glow-clock` |
| **Steps 1–5 to remain** | Keep **1, 3, 4, 5** for now; keep **2** as hygiene |
| **Neutral steps later revertible** | **Step 2** shared RO (if simplifying); reconsider **Step 5** if it confounds radar filter experiments |
| **Is Risk Radar primary?** | **Contributor, not sole primary.** Cadence/softening tested and insufficient; still worth offscreen pause and filter removal as **isolated** follow-ups — **do not remove the section first** |

### Explicit answers to primary questions

1. **Highest sustained workload:** glow clock; masked ticker transforms; backdrop-filter aggregation; multi CSS clocks; radar filtered sweep/pulses.  
2. **Largest GPU surfaces:** hero/tickers, sticky Role Lens, SurfaceCard stack, radar panel/sweep, assistant card.  
3. **Repeated paint/raster/composite:** masked ticker motion; filtered rotating sweep; animated shadows via `--lens-glow`; sticky blur over scroll.  
4. **Active offscreen:** glow, letters, stage blink, radar sweep & pulses; ticker **rAF** paused.  
5. **Multiple clocks:** body + 9 letters + stage + sweep + 2 Framer + ticker rAF (+ timer).  
6. **Growing memory/layers:** promoted will-change/mask/blur layers retained; large PNG decode; offscreen animated filtered radar — **hypothesis** for time-to-crash.  
7. **Combined transparency+blur+mask+shadow+transform+animated descendants:** **tickers** and **radar panel/sweep/pulses** are the clearest combos.  
8. **Crash consistency:** **cumulative pressure** (compositor/GPU/memory) with CPU component — not a clean single-class fit.  
9. **Best ratio changes:** glow gating; ticker mask removal; radar offscreen pause or sweep filter removal — Category **A/C**, not more Category **B** slowing.

---

## Appendix A — Search coverage checklist

| Search | Result used in audit |
|--------|----------------------|
| rAF / cancel | Tickers, radar cadence, AR, diagnostics |
| setInterval / setTimeout | Assistant, intro, assistant scroll retries, AR |
| @keyframes / animation | glow, letters, reset, stage, radar, assistant flash, AR fades |
| Framer / motion / AnimatePresence | Hero, RoleLens, RiskRadar, ProjectDeck, Experience, App |
| useAnimation / useMotionValue | **Absent** in portfolio |
| backdrop-filter / blur / filter / mask-image / will-change | Documented producers |
| IO / RO | Tickers shared; Framer internal; AcademicFocusInfo none IO |
| MutationObserver | AR audit only |
| scroll/resize/pointermove | AcademicFocusInfo; AR; no homepage pointermove |
| canvas/WebGL/DPR | AR / diag only on idle homepage |
| visibility/pagehide | Diagnostics & AR traces; **not** pausing portfolio CSS/JS art |

## Appendix B — Instance counts (data)

| Item | Count (code) |
|------|----------------|
| `stackStreams` | 2 |
| Role Lens letters | 9 (`"ROLE LENS".split`) |
| `radarDomains` | 7 |
| Capabilities | 6 |
| Experiences | 3 |
| Projects | 2 |
| Credentials (main) | 4 |
| Language chips | 4 |
| Framer infinite pulses | 2 spans |

**End of audit. No application source modified. Step 6 not started.**
