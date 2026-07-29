# Portfolio Navigation UX Refactor — Audit & Plan

**Branch:** `feature/navigation-ux-refactor`  
**Baseline HEAD:** `157240652a23db2fb756244d6666de29590fa4da`  
**Live baseline:** https://lorenzo-natali.github.io/professional-portfolio/  
**Phase:** Audit and planning only — no navigation implementation in this document’s commit.  
**Status legend used below:** **Verified** (observed live or in code) · **Inferred** (reasonable implication) · **Proposed** (planned behaviour) · **Open** (needs Lorenzo’s product approval)

---

## 1. Executive summary

The live portfolio is a continuous one-page experience with a strong visual identity and no site-wide navigation. As content grows, sections near the bottom (Experience, Projects, Education, Risk Radar) require substantial scrolling and receive less opportunistic discovery, while Role Lens sticky behaviour ends as soon as the visitor leaves the short `#role-lens` block.

**Recommendation:** preserve the one-page narrative and current physical order; add a lightweight floating **section index** with three visible macro-targets — **Profile**, **Capabilities**, **Evidence** — and keep a fourth registry slot, **Insights**, hidden until publication content exists.

Role Lens must continue to highlight the same individual elements. The navigator only derives a boolean “contains relevant content” marker per macro-section from the existing `lensRelevance` map. No content filtering, reordering, or parallel lens configuration.

Safari constitution is non-negotiable: zero new infinite animations, rAF loops, timers for visual behaviour, permanent `will-change`, animated custom properties, backdrop-filter surfaces, or scroll-driven React state churn. Active-section detection should use one IntersectionObserver over three macro roots only.

---

## 2. Audit methodology and limitations

### Methodology

1. Verified git context on `feature/navigation-ux-refactor` (clean working tree; same commit as `main` / `origin/main` at audit time).
2. Inspected the deployed site in Cursor’s browser tooling at desktop (1920×1080) and mobile-emulated (390×844) viewports.
3. Measured section geometry, sticky/fixed surfaces, interactive controls, and Role Lens highlight behaviour on the live build.
4. Traced the production runtime path: `index.html` → `src/main.jsx` → `src/bootProduction.jsx` → `src/App.jsx` → `PortfolioCore` → section catalog order.
5. Audited Role Lens ownership, `lensRelevance`, highlight helpers, Safari recovery docs, shared observers, and related tests.

### Limitations (explicit)

| Limitation | Impact |
|---|---|
| Browser tooling is Chromium-based, not real iPhone Safari | Visual/layout mobile findings are emulated; Safari crash behaviour was not re-validated here |
| Beyond the CV camera / WebGL path was not fully exercised | Treated as existing overlay; navigator must not mount or wake it |
| Portfolio Intro may briefly mask first paint | First impression recorded after intro dismissal / content ready |
| Sustained multi-minute Safari idle test not run in this phase | Deferred to implementation Phase 6 |
| Exact pixel-perfect iOS safe-area chrome not measurable in emulation | Mobile plan uses code + CSS safe-area conventions already present in the repo |

---

## 3. Live portfolio observations

### First impression and hero (**Verified**)

- Dark slate atmosphere (`slate-950`), cyan eyebrow “RISK, AUDIT & TECHNOLOGY PORTFOLIO”, hero-level name “Lorenzo Natali 那罗成”.
- Positioning line: Banking Risk & Controls | Technology & Information Security Governance | AI Governance.
- Two skill streams (Risk & Regulatory / Technology, Security & AI), language chips, LinkedIn + GitHub CTAs.
- Desktop: Beyond CV + Portfolio Assistant in the right hero column.
- Mobile-emulated: Beyond CV and Assistant appear after CTAs in document flow; hero alone is ~1971px (~2.3 viewports).

### Vertical narrative and length (**Verified**)

| Viewport | Approx. scroll height | Approx. screens |
|---|---|---|
| Desktop 1920×1080 | 6947px | 6.4 |
| Mobile-emulated 390×844 | 9683px | 11.5 |

Rendered catalog order matches code:

1. Hero  
2. Role Lens  
3. Professional Capabilities  
4. Professional Certifications Roadmap  
5. Professional Experience  
6. Projects & Applied Work  
7. Education  
8. Professional Risk & Evidence Map (Risk Radar + attribution footer)

### Discoverability (**Verified**)

| Immediately discoverable | Requires substantial scrolling |
|---|---|
| Identity, positioning, tickers, languages | Experience timeline |
| LinkedIn / GitHub CTAs | Project Deck |
| Beyond CV, Portfolio Assistant (desktop sidebar; mobile after hero) | Education rail |
| Role Lens controls (near top, but sticky only while `#role-lens` is on screen) | Risk Radar / evidence map / footer |

### Sticky / persistent controls (**Verified**)

- Only production sticky chrome: Role Lens bar (`sticky top-0 z-30` + `backdrop-blur`) **inside** `#role-lens`.
- After scrolling into Capabilities or Projects, the Role Lens sticky bar is **not** visible.
- Assistant drawer / Intro / Beyond AR are fixed overlays only when open.
- No site-wide TOC, scroll-spy, or floating section index exists today.

### Role Lens live behaviour (**Verified**)

- Lenses: Financial Risk, IT Audit, Technology Risk, Information Security Governance, AI Governance; Reset → Overview.
- Selecting **AI Governance** produced element highlights in capabilities, credentials, projects, and risk-radar nodes; experience had no matches for that lens.
- Glow marker `html[data-lens-glow-active="true"]` present while a non-Overview lens is active.

### Visual rhythm (**Verified**)

- Section headlines with uppercase cyan eyebrows; translucent cards; cyan/violet accents; radar motif at the bottom.
- Motion present today (tickers, Role Lens letter animation, radar sweep, Framer entrances) — navigator must not add another continuous system.

---

## 4. Current page and component inventory

Production order from `PORTFOLIO_SECTION_IDS` in `src/portfolio/sectionCatalog.js`.

| # | Visible name | Owner | Position | Recruiter purpose | Role Lens targeted? | Lenses / groups | Interactive? | Keep position? | Proposed macro | Mobile notes | Performance notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Hero / identity | `HeroSection.jsx` (`#hero`) | 1 | Instant positioning | Tickers only (`streamItems`) | All non-empty lenses via stream labels | CTAs, streams | Yes | Profile | Tall (~2+ screens); Beyond/Assistant after CTAs | Shared ticker rAF/RO/IO |
| 2 | Language chips | inside Hero | 1 | Communication signal | No | — | No | Yes | Profile | Dense grid; CSS breakpoints | Static |
| 3 | LinkedIn / GitHub CTAs | Hero | 1 | Contact / CV request | No | — | Links | Yes | Profile | Full-width stack | None |
| 4 | Beyond CV | `ARGovernanceCard.jsx` via App sidebar | 1 | Differentiator / AR demo entry | No | — | Launch AR | Yes | Profile | Below CTAs on small screens | Must stay unmounted when closed |
| 5 | Portfolio Assistant | `PortfolioAssistant` in App | 1 | Guided Q&A + deep links | Indirect (`signalMap` flash) | Assistant targets, not lens map | Drawer | Yes | Profile | Same | Fixed blur only when open |
| 6 | Role Lens | `RoleLens.jsx` (`#role-lens`) | 2 | Relevance filter control | Control itself | Sets `selectedLens` | Yes | Yes | Profile | Sticky only while section on screen | Letter CSS infinite + sticky blur |
| 7 | Professional Capabilities | `CapabilitiesSection.jsx` | 3 | Core competence cards | Yes (`capabilities`) | All lenses | Hover/cards | Yes | Capabilities | Stacked cards | Highlight classes + glow consumers |
| 8 | Skill / technology streams | `TickerStream.jsx` in Hero | 1 | Keyword scan | Yes (`streamItems`) | Per-lens label lists | Visual only | Yes | Profile | Continuous scroll | Shared rAF; pause offscreen |
| 9 | Professional Certifications Roadmap | `CredentialsSection.jsx` | 4 | Credential path signal | Yes (`credentials`) | Cert IDs | Horizontal rail; cert links | Yes | Capabilities | Snap rail | Highlight + scroll container |
| 10 | Additional Training & Attestations | inside Credentials | 4 | Supporting learning signal | IDs only; **no** `lensSurfaceClass` today | Unmapped for highlight | Links | Yes | Capabilities | Snap rail | Low |
| 11 | Professional Experience | `ExperienceSection.jsx` | 5 | Employment proof | Yes (`experiences`) | Banking Risk, IT Audit, Tech Risk, InfoSec; empty for AI Governance | Expand details | Yes | Evidence | Long timeline | Framer `whileInView` |
| 12 | Projects & Applied Work / Project Deck | `ProjectsSection.jsx` + `ProjectDeck.jsx` | 6 | Applied evidence | Yes (`projects`) | AI Governance only today | Carousel; repo link | Yes | Evidence | Controls must stay tappable | Highlight on **active** card only |
| 13 | Education | `EducationSection.jsx` | 7 | Academic foundation | IDs only; map always `[]` | None highlighted | Snap rail; focus tooltips | Yes (MVP) | Evidence | Horizontal rail | Tooltip scroll listeners only while open |
| 14 | Professional Risk & Evidence Map | `RiskRadar.jsx` (`#risk-radar`) | 8 | Cross-domain evidence map | Yes (`radar`) | All lenses | Map / Profile Coverage tabs; domain buttons; hash links | Yes | Evidence | Mobile capped sweep ~30fps | Radar CSS/JS sweep; Framer pulses |
| 15 | Attribution / host note | bottom of RiskRadar | 8 | Trust / hosting | No | — | None | Yes | Evidence (footer) | Fine print | Static |
| 16 | Portfolio Intro overlay | `PortfolioIntro` in App | overlay | First-visit brand splash | No | — | Dismiss / auto | Yes | Outside macros | Skipped if reduced-motion | Fixed blur while open |
| — | Insights (articles, notes, papers) | *none* | — | Thought leadership | — | — | — | N/A | Insights (future) | — | Must not ship empty UI |

**Existing anchors (**Verified**):** `hero`, `role-lens`, `capabilities`, `credentials`, `experience`, `projects`, `education`, `risk-radar` plus `data-portfolio-section` wrappers and `sectionAnchors` / `signalMap` in `portfolioData.js`.

---

## 5. Current narrative and discoverability risks

1. **Depth penalty:** Evidence-heavy material sits in the lower half; on mobile this is ~5–11 screens down.
2. **Role Lens control loss:** Sticky lens UI does not travel with the visitor; after selection, changing or resetting a lens requires scrolling back.
3. **No progress cue:** Visitors cannot see which macro region they are in or jump ahead without Assistant hash links or Risk Radar related-section links.
4. **Top concentration risk:** Hero already holds identity, streams, languages, CTAs, Beyond, and Assistant; adding a large persistent chrome there would worsen density.
5. **Future Insights:** Adding long-form content further down without a jump map would amplify the depth penalty.

These risks justify a floating macro-navigator without converting the site into multi-page routing.

---

## 6. Current Role Lens architecture and mapping

### Ownership (**Verified**)

- `App.jsx` owns `selectedLens` (`useState("Overview")`) and `setSelectedLens`.
- `useLensGlowActiveMarker(selectedLens)` syncs `html[data-lens-glow-active]`.
- `PortfolioCore` prop-drills `selectedLens` / `setSelectedLens` / `onSelectLens` to every section.
- No Role Lens React Context.

### Single source of truth for membership (**Verified**)

- `lensRelevance` in `src/portfolio/portfolioData.js`
- Helpers in `src/portfolio/portfolioLens.js`: `isOverviewLens`, `isLensRelevant`, `lensSurfaceClass`
- Groups: `capabilities`, `credentials`, `experiences`, `projects`, `radar`, `education`, `streamItems`

### Propagation and rendering (**Verified**)

| Surface | Mechanism |
|---|---|
| Capabilities / Credentials / Experience / ProjectDeck | `lensSurfaceClass` → highlight or `opacity-55` |
| Risk Radar nodes | Custom relevance + `role-lens-radar-node` / dim |
| TickerStream | Dim non-matching `streamItems` |
| Education | `data-role-lens-id` only; **no** highlight classes; education arrays empty |
| Additional training | IDs only; not in `lensRelevance` groups |
| Overview | No dim, no highlight, glow marker removed |

### Gaps relevant to navigation

- No helper aggregates “which page regions contain matches”.
- `signalMap` is a separate Assistant deep-link table — must not be duplicated as a second lens SoT.
- Tests (`lensGlowActive.step6.test.jsx`) protect glow gating, not relevance map integrity.

---

## 7. Recommended macro-information architecture

### Recommended visible structure (3 entries)

| Menu label | Scroll target | Contiguous catalog members | Includes |
|---|---|---|---|
| **Profile** | `#hero` | `hero`, `role-lens` | Identity, positioning, streams, languages, CTAs, Beyond CV, Assistant, Role Lens control |
| **Capabilities** | `#capabilities` | `capabilities`, `credentials` | Professional Capabilities, Certifications Roadmap, Additional Training |
| **Evidence** | `#experience` | `experience`, `projects`, `education`, `risk-radar` | Experience, Projects, Education, Risk & Evidence Map, footer attribution |

### Fourth registry entry (not visible yet)

| Menu label | Status | Future contents |
|---|---|---|
| **Insights** | Hidden until content exists | Articles, AI Governance Notes, white papers, downloadable publications |

### Assessment against the original hypothesis

| Question | Answer |
|---|---|
| Are these the right four macros? | Yes as a **registry**; only three should be **visible** until Insights has content |
| Is “Evidence” intuitive? | Yes — already used in “Professional Risk & Evidence Map.” |
| Education & certifications? | Certifications → Capabilities; Education → Evidence (academic proof), matching current contiguous order |
| Experience + Projects together? | Yes, inside Evidence |
| Profile include Role Lens, Assistant, Beyond? | Yes — they are orientation tools, not proof artefacts |
| Insights visible before content? | **No** — hide until publishable |
| Clearer four-label structure? | Splitting Evidence into Work + Risk Map adds a fourth thin item without enough gain |

### English label rationale

- **Profile** — universally understood entry point for recruiters and international visitors.
- **Capabilities** — matches the live section title language; less generic than “Skills”.
- **Evidence** — precise for audit/risk audiences and already native to this portfolio.
- **Insights** — reserved for thought leadership; do not show empty.

---

## 8. Alternative structures considered

### Alternative A — Profile / Skills / Track Record

- Pros: familiar HR vocabulary.
- Cons: “Skills” undersells certifications/governance framing; “Track Record” is vaguer than Evidence for this brand.

### Alternative B — Profile / Capabilities / Work / Risk Map (4 visible)

- Pros: separates employment/projects from the radar.
- Cons: Risk Map becomes a thin fourth item; Education placement becomes awkward; exceeds the preference for a small menu when Insights is still pending.

### Comparison and decision

| Criterion | Recommended (3 + hidden Insights) | Alt A | Alt B |
|---|---|---|---|
| Matches live vocabulary | Strong | Medium | Medium |
| Contiguous scroll targets without reorder | Yes | Yes | Weak for Education |
| Scalable to Insights | Yes | Yes | Crowded (5 conceptual slots) |
| Recruiter clarity | High | Medium | Medium-high |

**Definitive recommendation:** Profile · Capabilities · Evidence (visible), Insights (registry-only until content).

---

## 9. Recommended page order

**Proposed:** keep the current physical order unchanged for the navigation MVP.

```
hero → role-lens → capabilities → credentials → experience → projects → education → risk-radar
```

### Why no essential moves

- The three recommended macros already map to **contiguous** catalog ranges.
- Reordering would risk breaking Assistant `signalMap` expectations, SiteDiag bisect sets, and visitor familiarity with the live site.
- Education after Projects is slightly awkward conceptually (academic vs applied), but still valid as Evidence and does not break macro contiguity.

### Optional later move (Phase 7 only, approval-gated)

| Move | From → To | Why | Risk if lost | Essential? |
|---|---|---|---|---|
| Education section | After Projects → after Credentials | Groups academic foundation nearer Capabilities | Separates Education from closing Evidence Map; changes scroll muscle memory | **Optional** |

No other moves are proposed.

---

## 10. Floating navigator UX specification

### Concept

A discreet **compact section index** that reuses the portfolio’s cyan border, uppercase tracking, and subtle radar/reticle vocabulary. Not a new compass brand object; not a second Role Lens.

### Placement

- **Desktop:** fixed lower-trailing corner, clear of content gutters; z-index **above** Role Lens (`z-30`) and **below** Assistant (`z-50`) / Intro (`z-100`) / AR portal.
- **Mobile:** dedicated compact control in the thumb-reachable trailing corner with `env(safe-area-inset-*)` padding — not a scaled-down desktop panel.

### States

| State | Behaviour (**Proposed**) |
|---|---|
| A. Closed | Small circular/rounded trigger with subdued cyan border; accessible name “Portfolio sections” |
| B. Open | Compact panel listing 3 visible macros; no full-screen scrim required (avoid large composited overlay) |
| C. Current section | `aria-current="true"` + static border/text emphasis (no pulse) |
| D. Lens match (not current) | Static relevance marker (dot/icon) + non-colour text affordance |
| E. Current + lens match | Both current and relevance markers combined |
| F. No active Role Lens / Overview | Relevance markers hidden; menu still navigates |
| G. Dismissal | Select item, Escape, or toggle closes; focus returns to trigger |
| H. Mobile compact | Larger tap targets, panel opens upward, max height capped (~40–50vh), labels remain readable |
| I. Reduced motion | Instant open/close; no transform animation; immediate state changes |

### Interaction rules

- Smooth scroll to macro start (`scrollIntoView` / equivalent) when motion is allowed; instant under reduced motion.
- Manual scrolling remains primary; menu never traps scroll.
- Selecting a macro closes the panel on mobile; desktop may keep open or close — prefer close for consistency.
- Does not obstruct LinkedIn/GitHub in hero, Assistant FAB-equivalent card, or Beyond control; if collision occurs on short landscape phones, bias control slightly upward within safe area.

### Motif decision

**Chosen:** compact section index with cyan system chrome.  
**Rejected:** literal compass (not in design system); heavy “navigator HUD” (risk of new glow/blur identity).

---

## 11. Role Lens integration model

### Required conceptual behaviour (**Proposed**)

1. Element-level highlights remain exactly as today.
2. When a lens is active, the floating menu marks only macros that contain ≥1 relevant mapped element.
3. Selecting a marked macro scrolls to it; in-section highlights remain visible.
4. Menu never hides, filters, or reorders content.
5. Menu is a **relevance map**, not a content filter.

### Single source of truth

Reuse `lensRelevance` + `isLensRelevant` / group membership. Add a **derived** mapping only:

```text
lensRelevanceGroup → catalogSectionId → macroId

capabilities  → capabilities → Capabilities
credentials   → credentials  → Capabilities
streamItems   → hero         → Profile
experiences   → experience   → Evidence
projects      → projects     → Evidence
education     → education    → Evidence
radar         → risk-radar   → Evidence
```

Macro match state:

```text
macroContainsRelevant(lens, macroId) =
  lens !== "Overview" &&
  some(group in macro.groups where lensRelevance[lens][group].length > 0)
```

Prefer group non-emptiness (already the SoT) over querying the DOM. This avoids stale DOM class scraping and keeps education/projects honest even when a card is off-carousel.

### Stale mapping prevention

- One registry module owns macro ↔ section ↔ lens-group links.
- Unit tests assert every `lensRelevance` group key maps to a registry group and every visible macro has defined members.
- Do **not** copy ID lists into the navigator.

### Counts

**Do not show numeric match counts** in the MVP. Boolean presence is enough; counts add noise and invite inconsistency with carousel-only project highlighting.

### Edge cases

| Case | Behaviour |
|---|---|
| Lens matches nothing in a macro | No relevance marker |
| Active macro has no matches | Current marker only |
| Overview / no lens | No relevance markers anywhere |
| Future Insights content | Add Insights member sections + lens groups to the same registry when content ships |

---

## 12. Desktop behaviour

- Trigger remains visible while scrolling; does not replace Role Lens.
- Panel width modest (~220–280px); opaque/solid slate surface preferred over new `backdrop-filter`.
- Keyboard: Tab to trigger, Enter/Space open, Arrow keys between items, Enter activates, Escape closes.
- After navigation, active-section observer may briefly ignore intersections until scroll settles (coordination flag).
- Hash URLs (`#experience`, etc.) should still work; observer should adopt the correct macro afterwards.

---

## 13. Mobile behaviour

| Topic | Plan |
|---|---|
| Position | Trailing bottom corner with safe-area insets |
| Thumb reach | Prefer bottom-end over mid-side |
| Browser chrome | Keep clear of iOS home indicator / Android nav via safe-area |
| Panel direction | Open upward / inward |
| Max size | Cap height; internal scroll only if absolutely necessary (prefer 3 short labels — no inner scroll) |
| Tap targets | ≥ 44×44 px |
| Labels | Full words: Profile / Capabilities / Evidence |
| Scroll while open | Allow page scroll; optional light dismiss on outside tap without full-screen scrim |
| After selection | Close panel, move focus to destination heading or keep on trigger (prefer destination heading if focusable) |
| Screen readers | Trigger name + expanded state; items as buttons/links with current and relevance announced in text |
| Landscape | Keep trailing-end; shrink panel; ensure no overlap with Beyond/Assistant when those are in view |
| Assistant / Beyond | Lower z-index than Assistant drawer; never cover AR portal |
| Content obstruction | Small closed control; open panel must not cover the entire evidence cards column |
| iPhone Safari perf | Solid surface, opacity/transform only, no blur, no infinite animation |

---

## 14. Accessibility requirements

| Requirement | Spec |
|---|---|
| Control type | `button` trigger; panel as grouped list of navigation buttons/links |
| Accessible name | e.g. “Portfolio sections” |
| `aria-expanded` | Reflects open/closed |
| Relationship | `aria-controls` → panel id |
| Keyboard | As in §12 |
| Escape | Closes and returns focus to trigger |
| Focus return | On close, focus trigger unless user activated an item (then follow focus policy in §13) |
| Current section | `aria-current="location"` (or `true`) on the active item |
| Lens relevance without colour | Visible icon/dot **plus** accessible text, e.g. “Contains Role Lens matches” via `aria-describedby` or appended visually hidden text |
| Reduced motion | Instant transitions; honor `prefers-reduced-motion` |
| Tap targets | ≥ 44px |
| Contrast | Meet WCAG AA against slate-950 surfaces; do not rely on cyan glow alone |

---

## 15. Performance and Safari constraints

Navigator design must comply with the constitution derived from `docs/safari-recovery-log.md` and `docs/safari-workload-audit.md`.

### Forbidden for this feature

- New infinite animations; new rAF loops; new visual timers
- Permanent `will-change`; animated CSS custom properties; moving gradients
- Continuous glow / pulse / shimmer / sweep / breathing
- New `backdrop-filter` unless reusing an existing safe surface without adding another large layer (prefer **no** new blur)
- Full-height / full-screen composited overlay
- Per-item IntersectionObserver; duplicated observer infrastructure
- Scroll handlers that continuously `setState`
- Animated box-shadow / filter / layout-triggering animation

### Permitted

- Short event-driven opacity/transform transitions
- Static colour/border/opacity for current + relevance
- Reuse of existing highlight tokens for in-page content (unchanged)
- One shared IntersectionObserver over macro roots only
- Immediate state under reduced motion

### Performance budget table

| Category | Target | Plan |
|---|---|---|
| New animation systems | **0** | Closed/open may use one-shot CSS transition only |
| New observers | **0 continuous extras beyond one** | Exactly **one** IO for macro roots; disconnect on unmount |
| New timers | **0** | No setInterval/setTimeout for visuals; optional one-shot scroll-lock timeout only if unavoidable — prefer IO + rAF-free flag cleared on `scrollend` / single timeout ≤500ms documented if needed |
| New rAF loops | **0** | None |
| New persistent layers | **0** | Avoid `will-change`; keep trigger as normal fixed element |
| New blurred surfaces | **0** | Solid slate panel |
| React state updates during scroll | Minimal | Active macro id updates only when crossing macro boundaries (not per frame) |
| Style/layout/paint | Low | Class toggles on 3 items; no document-wide custom properties |

If a short scroll-settling timeout proves necessary after click-to-scroll, it must be one-shot, cleared on unmount, and covered by the Safari validation phase — not a continuous clock.

---

## 16. Active-section detection recommendation

### Options compared

| Approach | Risk | Verdict |
|---|---|---|
| Reuse ticker IntersectionObserver singleton | Couples unrelated systems; different thresholds | Reject |
| **One new IO on 3–4 macro roots** | Low; mirrors existing singleton discipline | **Recommend** |
| CSS scroll-driven animations for current state | Support/stability uneven; harder a11y sync | Reject for MVP |
| Throttled scroll + `getBoundingClientRect` | Easy to regress into frequent React updates | Reject |

### Recommended rules

- Observe only macro root elements (Profile/Capabilities/Evidence[/Insights when visible]).
- Threshold: use multiple thresholds or a top-biased `rootMargin` (e.g. shrink bottom so the section occupying the upper mid-viewport wins).
- Hysteresis: change `activeMacroId` only when a different macro is the clearest intersection candidate; avoid flicker at boundaries.
- Top of page: force **Profile**.
- Near footer: keep **Evidence** (last macro) rather than clearing.
- After nav click: set active macro optimistically to the destination; ignore IO churn until scroll completes / short settling window.
- Manual and programmatic scrolling share the same active state; programmatic path uses a temporary `isProgrammaticScroll` guard.

---

## 17. Proposed implementation architecture

### Principles

- Single macro registry; derived lens relevance; presentational navigator; minimal prop drilling; no rewrite of business content; no parallel lens config.

### Likely components / modules (**Proposed**)

| Piece | Role |
|---|---|
| `macroSectionRegistry` (data) | Macro ids, labels, member catalog section ids, lens groups, `visible` flag for Insights |
| `deriveMacroLensRelevance(selectedLens)` | Pure function over `lensRelevance` + registry |
| `useActiveMacroSection(macroRoots)` | One IO; returns `activeMacroId` |
| `PortfolioSectionNavigator` | Presentational trigger + panel |
| Light wrappers / data attributes | Ensure each macro has a stable root element to observe and scroll to |

### Illustrative data shape (not implementation code)

```js
// illustrative only
{
  id: "evidence",
  label: "Evidence",
  anchorSectionId: "experience",
  memberSectionIds: ["experience", "projects", "education", "risk-radar"],
  lensGroups: ["experiences", "projects", "education", "radar"],
  visible: true
}
```

### State ownership

- `selectedLens` remains in `App`.
- `activeMacroId` owned by a small hook near App/PortfolioCore (or navigator container).
- `navigatorOpen` local to the navigator component.
- `macroLensFlags` derived during render from `selectedLens` — no stored duplicate map.

### Insights future join path

1. Add content section(s) to catalog.
2. Append Insights registry entry `visible: true` when content ready.
3. Attach lens groups if Role Lens should mark Insights.
4. No navigator rewrite required.

---

## 18. Likely file-impact map

### Likely create

- `docs/navigation-ux-refactor-plan.md` (this document)
- `src/portfolio/macroSectionRegistry.js` (or adjacent name)
- `src/portfolio/deriveMacroLensRelevance.js`
- `src/portfolio/useActiveMacroSection.js`
- `src/portfolio/PortfolioSectionNavigator.jsx`
- companion tests under `src/portfolio/`

### Likely modify

- `src/App.jsx` and/or `src/portfolio/PortfolioCore.jsx` — mount navigator, pass `selectedLens`
- Possibly `src/index.css` — static navigator styles only
- Possibly section wrappers to expose macro root attributes/ids if needed

### Explicitly untouched in nav MVP (unless a later approved phase says otherwise)

- Beyond AR stack (`ARGovernanceView`, tracking, WebGL)
- Ticker shared scheduler / RO / IO implementations (except not mis-reusing them)
- Radar cadence helpers
- Step 6 lens-glow gating semantics
- Content copy arrays’ professional narrative (except optional Phase 7 reorder)
- GitHub Pages workflow / `main` deployment path during feature work

---

## 19. Testing and device-validation strategy

### Automated tests

| Area | Assert |
|---|---|
| Registry | Visible macros, member sections, Insights hidden by default |
| Active section | IO-driven id changes with hysteresis fixtures |
| Navigation target | Clicking item scrolls/requests correct anchor |
| Lens relevance | Derived flags match `lensRelevance` group emptiness; Overview clears all |
| No filtering | All sections remain mounted/visible regardless of lens |
| Element highlights | Existing `lensSurfaceClass` behaviour unchanged |
| Panel open/close | Toggle, item select, Escape |
| Focus | Return to trigger on Escape; aria attributes |
| Reduced motion | No transition dependency for correctness |
| Insights join | Registry flag flip includes fourth item without breaking three-item cases |
| Safari constraints | Guard tests / lint-level comments: no rAF/timer in navigator module; runtime counters unchanged when idle closed |

### Manual device matrix

| Environment | Checks |
|---|---|
| Desktop Chrome | Open/close, jump, lens markers, keyboard |
| Desktop Safari | Same + no blur regressions |
| iPhone Safari | Safe-area, thumb reach, landscape, Assistant/Beyond coexistence |
| Android Chrome (if available) | Placement and tap targets |
| Keyboard-only | Full path without pointer |
| Reduced-motion mode | Instant panel; instant scroll |

### iPhone Safari sustained-use test (Phase 6)

Comparable to prior crash-validation method:

1. Load production build on real iPhone Safari.
2. Select a Role Lens; open/close navigator repeatedly.
3. Scroll end-to-end multiple times over several minutes.
4. Confirm no tab crash / reload; optionally compare with `__portfolioRuntimeCounters` if enabled.
5. Pass gate before any merge consideration.

---

## 20. Phased implementation plan

### Phase 0 — Baseline and documentation

- **Scope:** This plan document; branch hygiene.
- **Files:** `docs/navigation-ux-refactor-plan.md`
- **Visible change:** None in the app.
- **Tests:** None beyond doc review.
- **Perf risk:** None.
- **Rollback:** Delete doc / revert commit.
- **Approval gate:** Lorenzo accepts IA labels + Insights-hidden policy.

### Phase 1 — Section registry and stable anchors

- **Scope:** Registry module; confirm macro roots/anchors; no UI yet.
- **Files:** new registry + tests; possibly tiny wrapper attributes.
- **Visible change:** None (or invisible anchors only).
- **Tests:** Registry integrity + lens-group mapping.
- **Perf risk:** None.
- **Rollback:** Remove registry files.
- **Approval gate:** Contiguous membership confirmed.

### Phase 2 — Static navigator shell

- **Scope:** Closed/open UI; jump links; no IO; no lens markers.
- **Files:** `PortfolioSectionNavigator.jsx`, CSS, App/Core mount.
- **Visible change:** Floating control appears.
- **Tests:** Open/close, Escape, targets.
- **Perf risk:** Low (fixed element only).
- **Rollback:** Unmount component / feature flag off.
- **Approval gate:** Visual fit with brand.

### Phase 3 — Active-section indication

- **Scope:** One IO; current marker; programmatic scroll guard.
- **Files:** `useActiveMacroSection.js` + navigator wiring.
- **Visible change:** Current macro indicated.
- **Tests:** Boundary hysteresis; top/footer behaviour.
- **Perf risk:** Low if boundary-only updates.
- **Rollback:** Disable hook; static shell remains.
- **Approval gate:** No flicker on desktop/mobile.

### Phase 4 — Role Lens macro-section integration

- **Scope:** Derive boolean relevance markers from `lensRelevance`.
- **Files:** derive helper + navigator + tests.
- **Visible change:** Markers when lens active.
- **Tests:** Per-lens expected macros; Overview clears; no content filtering.
- **Perf risk:** None (pure derive).
- **Rollback:** Hide markers.
- **Approval gate:** Markers match mental model during lens demos.

### Phase 5 — Mobile and accessibility refinement

- **Scope:** Safe-area, tap targets, focus, announcements, landscape.
- **Files:** navigator + CSS.
- **Visible change:** Mobile polish.
- **Tests:** a11y assertions; manual matrix.
- **Perf risk:** Low.
- **Rollback:** Revert CSS/a11y tweaks.
- **Approval gate:** Lorenzo mobile walkthrough.

### Phase 6 — Sustained Safari validation

- **Scope:** Real-device sustained scroll + lens + navigator idle.
- **Files:** none expected.
- **Visible change:** None.
- **Tests:** Manual sustained-use protocol.
- **Perf risk:** Validation only.
- **Rollback:** Disable navigator if regression found.
- **Approval gate:** No crash; counters acceptable.

### Phase 7 — Optional content reordering

- **Scope:** Only if approved — e.g. Education after Credentials.
- **Files:** `sectionCatalog.js`, any dependent anchors/tests.
- **Visible change:** Reordered narrative.
- **Tests:** Catalog/bisect updates.
- **Perf risk:** None.
- **Rollback:** Restore catalog order.
- **Approval gate:** Explicit Lorenzo approval — default is **skip**.

---

## 21. Open decisions requiring Lorenzo’s approval

1. **Macro labels:** Confirm **Profile / Capabilities / Evidence**, or choose Alt A/B naming.
2. **Insights visibility:** Confirm **hidden until content exists** (recommended) versus a visible disabled “Coming soon” item.
3. **Content order:** Confirm **no reorder** for MVP (recommended) versus approving Phase 7 Education move.
4. **Mobile placement:** Confirm recommended trailing-bottom safe-area control, or specify a different corner.
5. **Role Lens stickiness (out of nav MVP):** Decide later whether Role Lens itself should become site-sticky in a separate initiative; this plan does **not** include that change.

---

## 22. Final recommendation

Ship a **three-item floating section index** on top of the unchanged one-page portfolio:

- **Profile** → hero (+ Role Lens region)
- **Capabilities** → capabilities + credentials
- **Evidence** → experience + projects + education + risk-radar
- **Insights** → prepared in registry, hidden until real content exists

Integrate Role Lens only as **derived boolean macro relevance** from existing `lensRelevance`. Keep Safari pressure flat: one observer, no new continuous animation systems, no new blur layers, no scroll-driven React churn.

Do not implement navigation until Phase 0 decisions above are confirmed. Keep all work on `feature/navigation-ux-refactor` until an explicit merge/push decision.

---

## Appendix A — Working context at plan authoring

| Check | Value |
|---|---|
| Repository root | `/Users/lorenzonatali/Desktop/professional-portfolio` |
| Active branch | `feature/navigation-ux-refactor` |
| HEAD | `157240652a23db2fb756244d6666de29590fa4da` |
| Remote | `https://github.com/lorenzo-natali/professional-portfolio.git` |
| Push performed for this plan | No |

## Appendix B — Key source references

- `src/portfolio/sectionCatalog.js` — render order
- `src/portfolio/portfolioData.js` — `sectionAnchors`, `roleLenses`, `lensRelevance`, `signalMap`
- `src/portfolio/portfolioLens.js` — highlight helpers
- `src/portfolio/PortfolioCore.jsx` — section composition
- `src/App.jsx` — lens state, Assistant, Beyond, Intro
- `src/portfolio/RoleLens.jsx` — sticky lens UI
- `docs/safari-recovery-log.md` / `docs/safari-workload-audit.md` — Safari constitution
