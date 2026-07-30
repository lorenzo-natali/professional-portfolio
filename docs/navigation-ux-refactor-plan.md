# Portfolio Navigation UX Refactor — Audit & Plan

**Branch:** `feature/navigation-ux-refactor`  
**Baseline HEAD (audit start):** `157240652a23db2fb756244d6666de29590fa4da`  
**Live baseline:** https://lorenzo-natali.github.io/professional-portfolio/  
**Phase:** Audit and planning only — no navigation implementation in this document’s planning commits.  
**Macro labels:** Profile / Capabilities / Evidence / Insights are **working titles** only. Do not treat naming polish as a blocker; refine terminology after the IA is fully designed.  
**Status legend used below:** **Verified** (observed live or in code) · **Inferred** (reasonable implication) · **Proposed** (planned behaviour) · **Open** (needs Lorenzo’s product approval)

---

## 1. Executive summary

The live portfolio is a continuous one-page experience with a strong visual identity and no site-wide navigation. As content grows, sections near the bottom (Experience, Projects, Education, Risk Radar) require substantial scrolling and receive less opportunistic discovery, while Role Lens sticky behaviour ends as soon as the visitor leaves the short `#role-lens` block.

**Recommendation:** preserve the one-page narrative and current physical order; add a lightweight floating **section index** with three visible macro-targets — **Profile**, **Capabilities**, **Evidence** (working titles) — and keep a fourth registry slot, **Insights**, hidden until publication content exists.

Role Lens must continue to highlight the same individual elements. The navigator only derives a boolean “contains relevant content” marker per macro-section from the existing `lensRelevance` map. No content filtering, reordering, or parallel lens configuration.

Safari constitution is non-negotiable: zero new infinite animations, rAF loops, timers for visual behaviour, permanent `will-change`, animated custom properties, backdrop-filter surfaces, or scroll-driven React state churn. Active-section detection should use one IntersectionObserver over three macro roots only.

**Architecture validation note (see §§11, 16–18, Appendix C):** with today’s `lensRelevance` data, every non-Overview lens marks both Capabilities and Evidence. Macro markers therefore act as a participation map and jump aid, not as a strong relative ranking between those two macros. Element-level highlights remain the primary differentiator. Profile macro markers should **not** be driven by ticker `streamItems` alone (always non-empty today), or Profile would light on every lens without useful destination signal.

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

> Working titles only. Structural membership matters more than final English wording.

### Recommended visible structure (3 entries)

| Menu label (working) | Scroll target | Contiguous catalog members | Includes |
|---|---|---|---|
| **Profile** | `#hero` | `hero`, `role-lens` | Identity, positioning, streams, languages, CTAs, Beyond CV, Assistant, Role Lens control |
| **Capabilities** | `#capabilities` | `capabilities`, `credentials` | Professional Capabilities, Certifications Roadmap, Additional Training |
| **Evidence** | `#experience` | `experience`, `projects`, `education`, `risk-radar` | Experience, Projects, Education, Risk & Evidence Map, footer attribution |

### Fourth registry entry (not visible yet)

| Menu label (working) | Status | Future contents |
|---|---|---|
| **Insights** | Hidden until content exists | Articles, AI Governance Notes, white papers, downloadable publications |

### Structural validation (independent of naming)

| Question | Answer |
|---|---|
| Are three contiguous macros feasible without reorder? | **Yes** — ranges map 1:1 onto `PORTFOLIO_SECTION_IDS` (**Verified**) |
| Can Insights join later without restructuring? | **Yes** — append a fourth contiguous block when content exists |
| Certifications vs Education | Certifications with Capabilities; Education with Evidence (current order) |
| Experience + Projects together? | **Yes** — both are proof artefacts inside Evidence |
| Profile include Role Lens, Assistant, Beyond? | **Yes** — orientation tools, not proof artefacts |
| Insights visible before content? | **No** — hide until publishable |
| Split Evidence into Work + Risk Map? | Rejected for MVP — fourth thin item while Insights still pending |

### Contiguity proof (**Verified**)

```
[hero, role-lens]                              → Profile
[capabilities, credentials]                    → Capabilities
[experience, projects, education, risk-radar]  → Evidence
```

No gaps, no interleaving. Macro observational wrappers can surround these ranges without changing render order.

---

## 8. Alternative structures considered

Documented for completeness; naming variants are deferred.

### Alternative A — same three macros, different working labels

Same membership as recommended; only labels differ. **No structural difference.** Defer label choice.

### Alternative B — Profile / Capabilities / Work / Risk Map (4 visible)

- Pros: separates employment/projects from the radar.
- Cons: Risk Map becomes thin; Education placement awkward; crowded once Insights arrives.
- **Rejected for MVP.**

### Decision

Keep the three-macro contiguous structure + hidden Insights. Treat labels as working titles until IA behaviour is validated on device.

---

## 9. Recommended page order

**Proposed:** keep the current physical order unchanged for the navigation MVP.

```
hero → role-lens → capabilities → credentials → experience → projects → education → risk-radar
```

### Why no essential moves

- The three recommended macros already map to **contiguous** catalog ranges.
- Reordering would risk breaking Assistant `signalMap` expectations, SiteDiag bisect sets (`SITE_DIAG_SECTION_SETS` in `sectionCatalog.js`), and visitor familiarity with the live site.
- Education after Projects is slightly awkward conceptually, but still valid as Evidence and does not break macro contiguity.

### Optional later move (Phase 7 only, approval-gated)

| Move | From → To | Why | Risk if lost | Essential? |
|---|---|---|---|---|
| Education section | After Projects → after Credentials | Groups academic foundation nearer Capabilities | Separates Education from closing Evidence Map; changes scroll muscle memory; requires bisect/set updates | **Optional** |

No other moves are proposed.

---

## 10. Floating navigator UX specification

### Concept

A discreet **compact section index** that reuses the portfolio’s cyan border, uppercase tracking, and subtle radar/reticle vocabulary already visible in Risk Radar / Beyond reticle language. Not a new compass brand object; not a second Role Lens.

### Placement and z-index stack (**Verified** band)

| Layer | z-index | Source |
|---|---|---|
| Role Lens sticky bar | `z-30` | `RoleLens.jsx` |
| AcademicFocusInfo tooltip | `z-30` (absolute) | `portfolioUi.jsx` |
| **Navigator (proposed)** | **`z-40`** | Unoccupied in repo today (**Verified**: no `z-40` in production UI) |
| Assistant overlay + panel | `z-50` | `App.jsx` |
| Portfolio Intro | `z-[100]` | `App.jsx` |
| AR portal host | `2147483000` | `index.css` |

- **Desktop:** fixed lower-trailing corner; solid slate surface; clear of content gutters.
- **Mobile:** trailing-bottom thumb zone with `env(safe-area-inset-*)`. Note: safe-area is used today mainly in Beyond AR (`viewport-fit=cover` already set in `index.html`); the navigator would be the first main-page consumer (**Verified**).

### States A–I (validated)

| State | Behaviour (**Proposed**) | Validation note |
|---|---|---|
| A. Closed | Small rounded trigger; cyan border at low opacity; name “Portfolio sections” | Must remain readable without glow/pulse |
| B. Open | Compact panel of visible macros; **no** full-screen scrim | Avoids another large composited blur layer (Assistant already uses blur when open) |
| C. Current | `aria-current="location"` + static border/text | No Framer infinite / no CSS pulse |
| D. Lens match | Static marker + non-colour text | See §11 for when markers fire |
| E. Current + match | Combined markers | Still static |
| F. Overview | Relevance markers off; navigation still works | Aligns with glow marker cleared on Overview |
| G. Dismissal | Toggle, item activate, Escape, optional outside press | Escape/focus must exceed Assistant quality (Assistant lacks Escape today) |
| H. Mobile | ≥44px targets; panel opens upward; max ~40–50vh; no inner scroll for 3 items | Dedicated layout, not scaled desktop |
| I. Reduced motion | Instant open/close; `scrollIntoView({ behavior: "auto" })` | Second JS consumer of `prefers-reduced-motion` after Intro skip |

### Scroll behaviour (must not blindly copy Assistant)

Assistant signals today (**Verified**, `App.jsx`):

```js
element.scrollIntoView({ behavior: "smooth", block: "center" });
```

Navigator (**Proposed**) differs on purpose:

| Concern | Assistant | Navigator |
|---|---|---|
| Behaviour | Always `"smooth"` | `"smooth"` unless reduced-motion → `"auto"` |
| Block | `"center"` | `"start"` (macro beginning) |
| Flash class | `assistant-signal-target` 1.8s | **None** — avoid extra animation |
| Project carousel retries | setTimeout loop | Not required for macro anchors |

**Hash URLs:** section ids already exist; Risk Radar and Assistant use them. **No** `scroll-margin-top` exists today (**Verified**). Not required for MVP because there is no site-wide sticky header; Role Lens sticky is section-scoped. Revisit only if a future sticky top chrome is added.

### Motif decision

**Chosen:** compact section index with cyan system chrome / optional static reticle accent.  
**Rejected:** literal compass; HUD with continuous glow; copying Assistant’s full-screen blurred scrim.

### Coexistence rules

- Does not replace Role Lens; does not open Assistant or Beyond.
- When Assistant drawer or Intro or AR is open, navigator stays visually under them (`z-40`).
- Under SiteDiag bisect with incomplete macros, hide the navigator or disable incomplete destinations (see §17).

---

## 11. Role Lens integration model

### Required conceptual behaviour (**Proposed**)

1. Element-level highlights remain exactly as today (`lensSurfaceClass`, radar nodes, ticker dimming).
2. When a lens is active, the floating menu marks only macros that contain ≥1 relevant **mapped content group**.
3. Selecting a marked macro scrolls to it; in-section highlights remain visible.
4. Menu never hides, filters, or reorders content.
5. Menu is a **relevance / participation map**, not a content filter and not a ranked scoreboard.

### Single source of truth

Reuse `lensRelevance` in `portfolioData.js` via helpers in `portfolioLens.js`. Add only a **derived** group→macro registry link — never a second ID list.

```text
lensRelevanceGroup → catalogSectionId → macroId   (marker eligibility)

capabilities  → capabilities → Capabilities   ✅ marker-eligible
credentials   → credentials  → Capabilities   ✅ marker-eligible
experiences   → experience   → Evidence       ✅ marker-eligible
projects      → projects     → Evidence       ✅ marker-eligible
education     → education    → Evidence       ✅ marker-eligible
radar         → risk-radar   → Evidence       ✅ marker-eligible
streamItems   → hero         → Profile        ⚠️ element highlight only; NOT used for macro markers
```

### Why exclude `streamItems` from macro markers (**Validated**)

**Verified:** every non-Overview lens currently has a non-empty `streamItems` array. If Profile markers were derived from `streamItems`, Profile would light for **every** active lens, adding noise without a useful jump destination (the visitor already used Role Lens near Profile).

Tickers continue to dim/highlight at element level unchanged. Macro markers answer: “Which destinations contain Role Lens–relevant cards/nodes?”

### Derivation rule

```text
macroContainsRelevant(lens, macroId) =
  lens !== "Overview" &&
  some(group in macro.markerGroups where lensRelevance[lens][group].length > 0)
```

Prefer group non-emptiness over DOM class scraping so:

- off-carousel projects still count toward Evidence when listed in `lensRelevance.projects`;
- education can join later by filling `lensRelevance.education` without DOM hacks;
- markers stay consistent even if highlight CSS changes.

### Per-lens expected macro markers (from current `lensRelevance`)

| Lens (internal name) | UI label | Profile marker | Capabilities | Evidence | Notes |
|---|---|---|---|---|---|
| Overview | — | no | no | no | Glow off |
| Banking Risk | Financial Risk | no | yes (capabilities+credentials) | yes (experiences+radar) | No projects |
| IT Audit | IT Audit | no | yes | yes (experiences+radar) | No projects |
| Technology Risk | Technology Risk | no | yes | yes (experiences+radar) | No projects |
| Information Security Governance | same | no | yes | yes (experiences+radar) | No projects |
| AI Governance | AI Governance | no | yes (capabilities+credentials) | yes (projects+radar; **no** experiences) | Live audit confirmed highlights in capabilities, credentials, projects, radar |

**Honest UX implication:** with today’s mappings, Capabilities and Evidence **both** mark for every non-Overview lens. That is still correct per “contains ≥1 match.” Differentiation remains at **element** level inside each macro. Do not invent counts or fake exclusivity to force visual ranking. Future content or lens tuning may create stronger macro differentiation naturally.

### Counts

**Do not show numeric match counts** in the MVP.

- Counts would still show “both macros have matches” for current lenses.
- Project carousel only styles the active card, so DOM-visible count ≠ mapped count.
- Boolean presence matches the product requirement with less noise.

### Stale mapping prevention

1. Registry lists `markerGroups` per macro (not copied entity IDs).
2. Unit test: every `lensRelevance` group key is either assigned to a macro’s `markerGroups` or explicitly listed as `elementOnlyGroups` (e.g. `streamItems`).
3. Unit test: expected marker matrix above for all five lenses + Overview.
4. Do not read `signalMap` for lens relevance (Assistant-only deep links).

### Edge cases

| Case | Behaviour |
|---|---|
| Lens matches nothing in a macro | No relevance marker |
| Active macro has no matches | Current marker only |
| Overview / no lens | No relevance markers |
| AI Governance + Experience | Experience stays visible/dimmed as today; Evidence still marks via projects+radar |
| Future Insights | Add member sections + marker groups to the same registry |

---

## 12. Desktop behaviour

- Trigger remains visible while scrolling; does not replace Role Lens.
- Panel width modest (~220–280px); **opaque** `bg-slate-950` / `bg-slate-900` + cyan border — **no** new `backdrop-filter`.
- Focus ring: reuse existing portfolio pattern (`focus-visible:ring-2 focus-visible:ring-cyan-400/35` or white/40 from `portfolioUi`).
- Keyboard: Tab → trigger; Enter/Space toggles; when open, Tab/Arrows move among items; Enter activates; Escape closes and returns focus to trigger.
- After navigation: optimistic `activeMacroId`; ignore IO churn until scroll settles (`scrollend` where available, else one-shot ≤500ms timeout cleared on unmount).
- Native hash navigation to `#experience` etc. continues to work; observer converges to the owning macro.
- Do not put the navigator inside Framer `AnimatePresence` that remounts on route-less scroll (**Verified:** no `layoutId` coupling needed).

---

## 13. Mobile behaviour

| Topic | Plan | Grounding |
|---|---|---|
| Position | Trailing bottom with safe-area | Thumb reach; AR already proves `env(safe-area-inset-*)` pattern |
| vs mid-side | Prefer bottom-end | Avoid conflict with vertical scroll thumb on right edge mid-screen |
| Browser chrome | Safe-area padding on trigger + panel | `viewport-fit=cover` already present |
| Panel direction | Open upward / inward | Keep labels above home indicator |
| Max size | ~40–50vh; **no** inner scroll for 3 labels | Prevent nested scroll traps |
| Tap targets | ≥ 44×44 px | iOS HIG |
| Labels | Full working titles | Readability over icons-only |
| Scroll while open | Allow page scroll; dismiss on outside press **without** full-screen blur scrim | Perf + constitution |
| After selection | Close panel; move focus to destination `h2` if focusable, else leave on trigger after close | Stronger than Assistant |
| Landscape | Keep trailing-end; reduce panel height; avoid covering Beyond/Assistant when those are in the first screens | Hero is tall on phone |
| Assistant / Beyond | `z-40` < Assistant `z-50`; never above AR portal | **Verified** stack |
| Content obstruction | Closed control small; open panel must not cover entire card column | Visual QA Phase 5 |
| iPhone Safari perf | Solid surface; opacity/transform only; no blur; no infinite animation | Safari constitution |

---

## 14. Accessibility requirements

**Do not mirror the Assistant drawer as the a11y model.** **Verified** gaps in Assistant today: no Escape, no `aria-expanded`, no `aria-controls`, no dialog role, no focus restore. Better local precedents:

- Escape: `AcademicFocusInfo` in `portfolioUi.jsx`
- `aria-expanded`: Experience expand/collapse
- Modal inert/dialog: AR portal when open (navigator is **not** modal — do not copy `aria-modal` unless a scrim is later approved)

| Requirement | Spec |
|---|---|
| Control type | `button` trigger; panel items as buttons (or in-page links to `#anchors`) |
| Accessible name | “Portfolio sections” (or equivalent) |
| `aria-expanded` | On trigger |
| `aria-controls` | Panel id |
| Keyboard | §12 |
| Escape | Close + focus trigger |
| Focus return | Escape/toggle close → trigger; item activate → destination heading when practical |
| Current section | `aria-current="location"` |
| Lens relevance without colour | Visible marker **plus** accessible text (“Contains Role Lens matches”) via visually hidden span or `aria-describedby` |
| Reduced motion | Instant UI; `behavior: "auto"` scroll |
| Tap targets | ≥ 44px |
| Contrast | WCAG AA on solid slate; no glow-only meaning |
| Modal behaviour | Non-modal by default (page remains operable) |

---

## 15. Performance and Safari constraints

Navigator design must comply with `docs/safari-recovery-log.md` and `docs/safari-workload-audit.md`, and must remain isolatable from Steps 1–6.

### Forbidden for this feature

- New infinite animations; new rAF loops; new visual timers
- Permanent `will-change`; animated CSS custom properties; moving gradients
- Continuous glow / pulse / shimmer / sweep / breathing
- New `backdrop-filter` / large blurred scrim
- Full-height / full-screen composited overlay
- Per-item IntersectionObserver; reuse of ticker IO singleton for unrelated roots
- Scroll handlers that continuously `setState`
- Animated box-shadow / filter / layout-triggering animation
- Mounting Beyond / WebGL as a side effect of navigation

### Permitted

- Short event-driven opacity/transform transitions (disabled under reduced motion)
- Static colour/border/opacity for current + relevance
- Existing in-page highlight tokens unchanged
- Exactly one IntersectionObserver over macro roots; disconnect when empty/unmounted
- Immediate state under reduced motion

### Performance budget table

| Category | Target | Plan |
|---|---|---|
| New animation systems | **0** continuous | Optional one-shot CSS transition only |
| New observers | **1** IO total | Macro roots only; dispose on unmount |
| New timers | **0** continuous | Optional one-shot ≤500ms scroll-settle, cleared on unmount |
| New rAF loops | **0** | None |
| New persistent layers | **0** promoted | No `will-change`; normal `position: fixed` |
| New blurred surfaces | **0** | Solid slate panel |
| React state updates during scroll | Boundary-only | `activeMacroId` changes only when macro candidate changes |
| Style/layout/paint | Low | Class toggles on ≤4 items; no document-wide custom properties |
| Runtime counters (diag) | Idle closed ≈ baseline | Validate with `__portfolioRuntimeCounters` in Phase 6 |

### Isolation rule

Do not ship navigator changes bundled with ticker-mask removal, ticker `will-change`/blur drops, or further radar filter experiments. Keep Safari variables separable.

---

## 16. Active-section detection recommendation

### Options compared

| Approach | Risk | Verdict |
|---|---|---|
| Reuse ticker IO singleton (`createTickerVisibilityObserver.js`) | Couples unrelated systems; ticker threshold `[0, 0.01]` wrong for macros | **Reject** |
| **One new IO on 3 macro roots** | Low; mirrors singleton dispose discipline | **Recommend** |
| CSS scroll-driven animations | Support/a11y sync weak for current-state | Reject MVP |
| Throttled scroll + `getBoundingClientRect` | Easy to regress into high-frequency React updates | Reject |

### Recommended algorithm (**Proposed**)

1. Macro roots are observational wrappers (or first-section anchors) for Profile / Capabilities / Evidence.
2. One `IntersectionObserver` with top-biased `rootMargin` (e.g. shrink bottom so the upper mid-viewport wins) and multiple thresholds.
3. Compute the best intersecting candidate; update React state **only** when `activeMacroId` changes.
4. Hysteresis: require a different macro to be clearly ahead before switching (prevents flicker at boundaries between credentials→experience etc.).
5. `scrollY <= smallEpsilon` → force Profile.
6. Bottom of document → keep Evidence (last visible macro).
7. Programmatic navigation sets `isProgrammaticScroll`, optimistically sets destination macro, ignores IO until settle.
8. Partial SiteDiag mounts: if a macro root is missing, observer simply omits it; navigator UI should hide or disable incomplete macros.

### Why not observe every `data-portfolio-section`

There are eight leaf sections. Observing all eight would increase callback churn and tempt per-section React updates. Three macro roots are enough for menu state and match the product’s three-item IA.

---

## 17. Proposed implementation architecture

### Principles

- Single macro registry; derived lens relevance; presentational navigator; minimal prop drilling; no rewrite of business content; no parallel lens config.

### Macro root strategy without reorder (**Verified feasible**)

`PortfolioCore` today:

```jsx
<>
  {orderedIds.map((id) => (
    <div key={id} data-portfolio-section={id}>
      <SectionComponent {...sectionProps} />
    </div>
  ))}
</>
```

**Proposed:** group contiguous ids under macro wrappers **without** moving `data-portfolio-section` off leaf nodes (runtime counters count those nodes 1:1):

```text
[data-macro-section=profile]
  [data-portfolio-section=hero] ...
  [data-portfolio-section=role-lens] ...
[data-macro-section=capabilities]
  [data-portfolio-section=capabilities] ...
  [data-portfolio-section=credentials] ...
[data-macro-section=evidence]
  ...
```

Scroll targets remain existing `#hero` / `#capabilities` / `#experience` (stable for Assistant/Risk Radar hashes). Observer watches `[data-macro-section]`.

### Likely modules (**Proposed**)

| Piece | Role |
|---|---|
| `macroSectionRegistry.js` | Macro ids, working labels, members, `markerGroups`, `elementOnlyGroups`, `visible` |
| `deriveMacroLensRelevance.js` | Pure: `selectedLens` → `{ [macroId]: boolean }` |
| `useActiveMacroSection.js` | One IO; programmatic scroll guard; returns `activeMacroId` |
| `PortfolioSectionNavigator.jsx` | Presentational trigger + panel only |
| `PortfolioCore.jsx` (light) | Optional macro wrappers; still spreads lens props |
| `App.jsx` (light) | Mount navigator; pass `selectedLens`; do not move lens ownership |

### Illustrative registry shape

```js
// illustrative only — working titles
{
  id: "evidence",
  label: "Evidence",
  anchorSectionId: "experience",
  memberSectionIds: ["experience", "projects", "education", "risk-radar"],
  markerGroups: ["experiences", "projects", "education", "radar"],
  visible: true
}
```

```js
{
  id: "insights",
  label: "Insights",
  anchorSectionId: null,
  memberSectionIds: [],
  markerGroups: [],
  visible: false
}
```

### State ownership

| State | Owner |
|---|---|
| `selectedLens` | `App` (unchanged) |
| `macroLensFlags` | Derived each render from `selectedLens` + registry |
| `activeMacroId` | `useActiveMacroSection` near mount point |
| `navigatorOpen` | Local to `PortfolioSectionNavigator` |

### Feature / bisect gating

- Production: mount navigator when full portfolio (or when all three macros have ≥1 mounted member).
- SiteDiag halves/quarters: prefer **hide** navigator when any visible macro is incomplete, to avoid jumping to missing sections. Do not alter bisect catalogs unless Phase 7 reorders.

### Insights join path

1. Add catalog section id(s) + content modules.
2. Set Insights `visible: true` and members/markerGroups.
3. Extend macro wrapper rendering.
4. No second lens configuration file.

---

## 18. Likely file-impact map

### Likely create

- `src/portfolio/macroSectionRegistry.js`
- `src/portfolio/deriveMacroLensRelevance.js`
- `src/portfolio/useActiveMacroSection.js`
- `src/portfolio/PortfolioSectionNavigator.jsx`
- `src/portfolio/*.test.js(x)` matching Vitest + RTL step-test style
- (this document already exists)

### Likely modify

- `src/portfolio/PortfolioCore.jsx` — macro wrappers; preserve leaf `data-portfolio-section`
- `src/App.jsx` — mount navigator; pass `selectedLens` only
- `src/index.css` — static navigator rules only (optional; Tailwind-first preferred)

### Explicitly untouched in nav MVP

- Beyond AR stack, camera, tracking, WebGL
- `createTickerFrameScheduler.js` / resize / visibility observers (do not overload)
- `radarSweepCadence.js` / Risk Radar visual systems
- Step 6 `lensGlowActive` semantics
- `lensRelevance` entity ID lists (except future content authoring — not part of navigator code)
- GitHub Pages / `main` deploy path during feature work

### Test stack to match (**Verified**)

- Vitest + jsdom + Testing Library (`vite.shared.js` / `src/test/setup.js`)
- Portfolio step tests use `describe("Step N…")`, mocks, DOM assertions; `userEvent` available but uncommon under `src/portfolio/`
- Mock `IntersectionObserver` pattern already used in ticker visibility tests — reuse for active-macro tests

---

## 19. Testing and device-validation strategy

### Automated tests

| Area | Assert |
|---|---|
| Registry | Three visible macros; Insights `visible: false`; contiguity of members vs `PORTFOLIO_SECTION_IDS` |
| Group coverage | Every `lensRelevance` group is marker-assigned or explicitly `elementOnly` |
| Marker matrix | Table in §11 for Overview + five lenses |
| Active section | IO fixtures; hysteresis; top → Profile; footer → Evidence |
| Navigation target | Item activates correct `anchorSectionId` / scroll options |
| Reduced motion | `behavior: "auto"` path |
| Panel | Open/close; Escape; `aria-expanded`; focus return |
| No filtering | All leaf sections remain mounted regardless of lens/navigator |
| Element highlights | Existing `lensSurfaceClass` / glow tests still pass |
| Insights flag | Flipping `visible` adds fourth item without breaking three-item cases |
| Perf guards | Navigator modules contain no `requestAnimationFrame` / visual `setInterval`; dispose clears IO |

### Manual device matrix

| Environment | Checks |
|---|---|
| Desktop Chrome | Jump, markers, keyboard, hash URLs |
| Desktop Safari | Same; no unexpected blur/compositing |
| iPhone Safari | Safe-area, thumb reach, landscape, Assistant/Beyond coexistence, Role Lens + navigator together |
| Android Chrome (if available) | Placement / tap targets |
| Keyboard-only | Full path |
| Reduced-motion | Instant panel + instant scroll |

### iPhone Safari sustained-use test (Phase 6)

Align with prior crash-validation method (~multi-minute idle/scroll pressure):

1. Production build on real iPhone Safari.
2. Select a Role Lens; open/close navigator repeatedly.
3. Scroll end-to-end multiple times for several minutes.
4. Confirm no tab crash/reload.
5. Optionally enable diagnostics and confirm idle closed navigator does not raise rAF/IO/timer counts vs baseline (`__portfolioRuntimeCounters`).
6. Pass gate before merge consideration.

---

## 20. Phased implementation plan

### Phase 0 — Baseline and documentation

- **Scope:** This plan document on `feature/navigation-ux-refactor`.
- **Files:** `docs/navigation-ux-refactor-plan.md`
- **Visible change:** None in the app.
- **Tests:** Doc review.
- **Perf risk:** None.
- **Rollback:** Revert doc commit(s).
- **Approval gate:** Accept contiguous three-macro IA + Insights hidden; labels remain working titles.

### Phase 1 — Section registry and stable anchors

- **Scope:** Registry + derive helper + tests; optional macro data attributes; no floating UI.
- **Files:** `macroSectionRegistry.js`, `deriveMacroLensRelevance.js`, tests; maybe light `PortfolioCore` wrappers.
- **Visible change:** None (or invisible attributes only).
- **Tests:** Contiguity, group coverage, marker matrix.
- **Perf risk:** None.
- **Rollback:** Remove new modules/wrappers.
- **Approval gate:** Marker matrix accepted as participation map (not ranking).

### Phase 2 — Static navigator shell

- **Scope:** Closed/open UI; jump to anchors; no IO; no lens markers.
- **Files:** `PortfolioSectionNavigator.jsx`, App mount, static CSS.
- **Visible change:** Floating control appears.
- **Tests:** Toggle, Escape, focus, scroll target, reduced-motion scroll behaviour.
- **Perf risk:** Low (one fixed element, solid surface).
- **Rollback:** Unmount / feature flag.
- **Approval gate:** Visual fit; z-40 coexistence with Assistant.

### Phase 3 — Active-section indication

- **Scope:** One IO; current marker; programmatic scroll guard.
- **Files:** `useActiveMacroSection.js` + wiring.
- **Visible change:** Current macro indicated.
- **Tests:** Boundary hysteresis; top/footer; programmatic lock.
- **Perf risk:** Low if boundary-only updates — measure with counters if unsure.
- **Rollback:** Disable hook; shell remains.
- **Approval gate:** No flicker on desktop + mobile emulation.

### Phase 4 — Role Lens macro-section integration

- **Scope:** Boolean markers from derive helper; Overview clears.
- **Files:** navigator props + tests.
- **Visible change:** Markers when lens active.
- **Tests:** §11 matrix; no content filtering; element highlights unchanged.
- **Perf risk:** None (pure derive).
- **Rollback:** Hide markers.
- **Approval gate:** Markers understood as participation map during lens demos.

### Phase 5 — Mobile and accessibility refinement

- **Scope:** Safe-area, targets, focus, announcements, landscape, outside-dismiss without scrim.
- **Files:** navigator + CSS.
- **Visible change:** Mobile polish.
- **Tests:** a11y assertions; manual matrix.
- **Perf risk:** Low.
- **Rollback:** Revert polish commits.
- **Approval gate:** Lorenzo mobile walkthrough.

### Phase 6 — Sustained Safari validation

- **Scope:** Real-device protocol above.
- **Files:** none expected.
- **Visible change:** None.
- **Tests:** Manual sustained-use + optional counters.
- **Perf risk:** Validation only.
- **Rollback:** Disable navigator if regression.
- **Approval gate:** No crash; idle cost ≈ baseline.

### Phase 7 — Optional content reordering

- **Scope:** Only if explicitly approved (e.g. Education after Credentials).
- **Files:** `sectionCatalog.js`, bisect sets, any dependent tests.
- **Visible change:** Reordered narrative.
- **Default:** **Skip.**

---

## 21. Open decisions requiring Lorenzo’s approval

Genuine product decisions only (not codebase questions; **not** terminology polish):

1. **Insights visibility:** Hidden until content exists (**recommended**) vs visible disabled “Coming soon”.
2. **Content order:** No reorder for MVP (**recommended**) vs approve Phase 7 Education move.
3. **Mobile placement:** Trailing-bottom safe-area control (**recommended**) vs a different corner preference.
4. **Macro marker policy:** Accept markers as a participation map that may light both Capabilities and Evidence for every current lens (**recommended**) vs request a future content/lens-tuning pass to create stronger macro differentiation (still without counts).
5. **Role Lens site-stickiness:** Out of scope for this navigator MVP; decide later as a separate initiative if desired.
6. **SiteDiag behaviour:** Hide navigator when bisect mounts incomplete macros (**recommended**) vs show disabled items.

Working titles (Profile / Capabilities / Evidence / Insights) are **not** open blockers.

---

## 22. Final recommendation

Proceed with a **three-macro floating section index** on the unchanged one-page portfolio:

- **Profile** → `hero` + `role-lens`
- **Capabilities** → `capabilities` + `credentials`
- **Evidence** → `experience` + `projects` + `education` + `risk-radar`
- **Insights** → registry-ready, hidden until real content exists

Architecture constraints that are now validated against this repository:

1. Contiguous macros require **no** content reorder.
2. Role Lens SoT remains `lensRelevance`; navigator derives boolean macro flags; `streamItems` stay element-only for markers.
3. z-index `40` is free between Role Lens (`30`) and Assistant (`50`).
4. One macro-root IntersectionObserver; solid surfaces; no new blur/rAF/infinite animation.
5. Accessibility should follow Escape / `aria-expanded` / focus-return patterns stronger than the current Assistant drawer.
6. Labels remain working titles until after behavioural validation.

Do not begin implementation until the open decisions in §21 (except naming) are confirmed. Keep work on `feature/navigation-ux-refactor` until an explicit merge decision.

---

## Appendix A — Working context

| Check | Value |
|---|---|
| Repository root | `<repository-root>` |
| Active branch | `feature/navigation-ux-refactor` |
| Audit baseline HEAD | `157240652a23db2fb756244d6666de29590fa4da` |
| Plan doc commit (initial) | `40b23c4` |
| Remote | `https://github.com/lorenzo-natali/professional-portfolio.git` |
| Branch pushed | Yes — `origin/feature/navigation-ux-refactor` (plan doc); `main` untouched |

## Appendix B — Key source references

- `src/portfolio/sectionCatalog.js` — render order + SiteDiag sets
- `src/portfolio/portfolioData.js` — `sectionAnchors`, `roleLenses`, `lensRelevance`, `signalMap`
- `src/portfolio/portfolioLens.js` — highlight helpers
- `src/portfolio/PortfolioCore.jsx` — section composition / leaf wrappers
- `src/App.jsx` — lens state, Assistant `scrollIntoView`, Beyond, Intro, reduced-motion Intro skip
- `src/portfolio/RoleLens.jsx` — sticky `z-30` lens UI
- `src/portfolio/portfolioUi.jsx` — Escape precedent, focus rings
- `src/portfolio/createTickerVisibilityObserver.js` — shared IO pattern to **mirror discipline**, not reuse for macros
- `src/diagnostics/createPortfolioRuntimeCounters.js` — Safari/diag counters
- `docs/safari-recovery-log.md` / `docs/safari-workload-audit.md` — Safari constitution

## Appendix C — Architecture validation checklist

| Claim | Status |
|---|---|
| Live page is one continuous scroll with 8 catalog sections | **Verified** |
| No site-wide nav / scroll-spy today | **Verified** |
| Role Lens sticky ends outside `#role-lens` | **Verified** (live + code) |
| Three macros map to contiguous catalog ranges without reorder | **Verified** |
| `lensRelevance` is the membership SoT | **Verified** |
| Deriving macro flags without copying entity IDs is feasible | **Verified** / **Proposed** |
| `streamItems` would mark Profile on every lens if used for macros | **Verified** → exclude from markers |
| Capabilities + Evidence both mark for all current non-Overview lenses | **Verified** → accept as participation map |
| Education / additional-training largely unhighlighted today | **Verified** — still belong structurally; markers ignore empty groups |
| z-40 free between Role Lens and Assistant | **Verified** |
| Assistant is a weak Escape/focus precedent | **Verified** |
| Safe-area exists but is AR-centric | **Verified** |
| No `scroll-margin-top` on anchors | **Verified** — OK for MVP |
| Ticker IO must not be overloaded for macros | **Verified** |
| Macro wrappers can preserve leaf `data-portfolio-section` counts | **Verified** / **Proposed** |
| Insights content absent | **Verified** → keep hidden |
| Real iPhone Safari sustained test still required before merge | **Open** (Phase 6) |
