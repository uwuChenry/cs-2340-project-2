# Handoff: Job Marketplace (seeker + recruiter)

## Overview
A two-sided job marketplace prototype. Job seekers search and filter roles, view them on a map with a commute radius, shortlist and compare roles, apply with a tailored note, track application status, and control profile privacy. Recruiters post roles, manage an applicant Kanban pipeline, search and save candidate searches, view applicant location clusters, and review a candidate's full profile with in-platform messaging.

Covers 20 user stories: seeker stories 1–10, recruiter stories 11–20.

## About the Design Files
`Job Marketplace.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established component library, routing, and data layer. If no environment exists yet, pick the most appropriate framework and implement the design there.

The file is a single self-contained component: markup with inline styles, plus a JavaScript class holding all state and derived values. All data is hardcoded mock data. Every list, filter, and toggle in the prototype is live and interactive — poke at it before implementing.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions. Recreate pixel-accurately using the codebase's existing primitives where they match; the exact values are listed under Design Tokens.

Exception: the maps are **schematic placeholders** — CSS grid lines, a road bar, a water shape, and absolutely positioned pins at hardcoded percentage coordinates. They are not real geography. In production, replace with a real map library (Mapbox GL JS, MapLibre, Google Maps) rendering geocoded job/applicant coordinates. The pin, radius ring, and cluster bubble *styling* is the part to keep.

---

## Screens / Views

Global chrome, present on all screens:

**Header** — sticky, `top: 0`, `z-index: 40`, background `rgba(250,249,246,0.92)` with `backdrop-filter: blur(10px)`, bottom border `1px solid #E6E3DC`. Inner row: `max-width: 1320px`, centered, `padding: 14px 28px`, `display: flex; flex-wrap: wrap; align-items: center; gap: 12px 28px`.
- Logo: 22×22 square, `border-radius: 6px`, background `#1A1917`, containing an 8×8 `#FAF9F6` square with `border-radius: 2px`. Wordmark "Roster", 17px/600, `letter-spacing: -0.02em`.
- Tab nav: wrapping flex, `gap: 4px`, `flex: 1 1 auto`. Each tab is a button, `padding: 7px 13px`, `border-radius: 8px`, 14px/500. Active: background `#FFFFFF`, color `#1A1917`. Inactive: transparent, color `#6E6B63`, hover background `#EFEDE7`.
- Role switch (demo affordance — in production this is account type, not a toggle): pill group, `padding: 3px`, background `#EFEDE7`, `border-radius: 9px`. Items `padding: 5px 11px`, `border-radius: 7px`, 13px/500; selected gets `#FFFFFF` background.
- Avatar: 32×32 circle, background `#E3E6F7`, border `1px solid #D3D8F0`, initials 12px/600 in `#1B4DFF`.

**Main container** — `max-width: 1320px`, centered, `padding: 26px 28px 80px`.

**Page title pattern** — a mono eyebrow above an h1: eyebrow is IBM Plex Mono 11px, `letter-spacing: 0.1em`, uppercase, `#8A867C`, `margin-bottom: 8px`; h1 is 30px/600, `letter-spacing: -0.025em`.

**Card pattern** — background `#FFFFFF`, border `1px solid #E6E3DC`, `border-radius: 12px`, `padding: 16–22px`. Hover on clickable cards: `border-color: #C9C4B8`.

**Primary button** — background `#1A1917`, color `#FAF9F6`, no border, `padding: 7–10px 12–18px`, `border-radius: 8px`, 13–14.5px/500.
**Secondary button** — background `#FFFFFF`, border `1px solid #DDD9D1`, same geometry, color `#1A1917`.
**Accent button** (in-sheet submit) — background `#1B4DFF`, color `#FFFFFF`.
**Selected/toggled chip** — background `#ECEFFB`, border `1px solid #C6CCEC`, color `#1B4DFF`. Unselected: `#FFFFFF` / `#DDD9D1` / `#4F4C45`.
**Text input / select / textarea** — `padding: 9–11px 11–12px`, border `1px solid #DDD9D1`, `border-radius: 8px`, background `#FCFBF9`, 13.5–14.5px. Placeholder `#A3A096`. Field label above: 12px/500, `#6E6B63`, `margin-bottom: 6px`.

---

### 1. Seeker — Search (default screen)
**Purpose:** find roles by filter, list or map.

**Layout:** header row with title (`{n} roles match your filters`) on the left and a three-way view switcher on the right (List / Split / Map — same pill-group styling as the role switch). Below: `display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start` with three panes that wrap rather than crush:
- Filters aside — `flex: 1 1 240px; max-width: 320px`
- Results list — `flex: 3 1 380px; min-width: 0`
- Map panel — `flex: 2 1 340px; min-width: 0`

List view hides the map; Map view hides the list; Split shows both. The wrapping flex is what makes this responsive without media queries — reproduce the intent (panes stack below ~900px), not necessarily the mechanism.

**Filters panel contents,** in order:
1. Header row: "Filters" 14px/600 + "Reset" link-button (13px, `#6E6B63`, underlined) clearing all filters.
2. Title/keyword text input — matches against title + company, case-insensitive substring.
3. Skills — 6 toggle chips (React, TypeScript, Node, Mapbox, Accessibility, GraphQL), `border-radius: 999px`, `padding: 5px 10px`, 12.5px. **AND semantics**: a job must contain *every* selected skill.
4. Location text input — substring match on the job's location string.
5. Minimum base salary — range input, min 60, max 220, step 10, `accent-color: #1B4DFF`. Value shown right-aligned in the label in mono. Compares against the job's range *low* bound.
6. Work setup — three equal-width segmented buttons: Any / Remote / Onsite. "Onsite" includes hybrid (it excludes only Remote).
7. Commute radius — range input, min 5, max 60, step 5. Does **not** filter the list; it drives the map ring and the "within X of you" count.
8. Visa sponsorship — full-width checkbox row: 16×16 box with `border-radius: 4px`; when on, box fills `#1B4DFF` and the row takes the selected-chip background/border.

**Results list contents:**
- Recommendation banner (shown when any result is a recommendation): background `#F2F3FC`, border `1px solid #DCE0F6`, `border-radius: 12px`, `padding: 14px 16px`. 6px `#1B4DFF` dot + "Recommended from your skills" 13px/600 in `#1F2E8C`; body 13px in `#4A5490`, `line-height: 1.5`.
- Job cards: `display: flex; flex-wrap: wrap; gap: 14px 16px`. Content column `flex: 1 1 220px; min-width: 0`; action column `flex: 0 1 auto; margin-left: auto`, right-aligned, space-between vertically. **The content column must be allowed to shrink and the actions must be allowed to wrap below it** — this was the one layout bug worth calling out.
  - Row 1: 26×26 company mark (`border-radius: 7px`, per-company background, white 11px/600 initials) + company name 13px `#6E6B63` + optional match badge (mono 10.5px, uppercase, `letter-spacing: 0.06em`, `#1B4DFF` on `#ECEFFB`, `border-radius: 5px`, `padding: 3px 7px`).
  - Title: 17px/600, `letter-spacing: -0.015em`.
  - Meta row: wrapping flex, `gap: 6px 14px`, 13px `#6E6B63` — location, setup, salary (mono, `#1A1917`), distance.
  - Skill tags: 12px `#4F4C45` on `#F3F1EB`, `border-radius: 5px`, `padding: 3px 8px`.
  - Actions: posted age (12px `#A3A096`) above two buttons — shortlist toggle (secondary, becomes a selected chip when in the shortlist) and "One-click apply" (primary, becomes "Applied").
  - Applied cards get `border-color: #CFE6DA`.
  - Sort: recommendations first, otherwise source order.

**Map panel:**
- Fixed `height: 520px`, background `#EFEEE8`, inside a card with `overflow: hidden`.
- Grid: two layered linear-gradients, `#E4E2DA` 1px lines, `background-size: 46px 46px`.
- Road bars: horizontal 9px bar at `top: 38%`, vertical 9px bar at `left: 56%`, both `#E2E0D7`.
- Water: `#DEE6EC` block, 130px tall, `left: -6%; right: 40%; bottom: -8%`, `rotate(-7deg)`.
- User location: 12×12 `#1B4DFF` dot with 3px white border at `left: 44%; top: 52%`, translated -50%/-50%.
- Commute ring: same center, `width: (70 + radius * 3.4)px`, `aspect-ratio: 1`, `border-radius: 50%`, background `rgba(27,77,255,0.07)`, border `1px dashed rgba(27,77,255,0.45)`. **Size from one axis so it stays circular** — percentage width+height on a non-square panel produces an ellipse.
- Pins: absolutely positioned buttons at per-job `left`/`top` percentages, `translate(-50%, -100%)`, `border-radius: 999px`, `padding: 5px 9px`, mono 12px/600, `box-shadow: 0 2px 6px rgba(26,25,23,0.12)`. Label is the low end of the salary range. Inside the radius: `#FFFFFF` background, `#1A1917` text, `#C6CCEC` border. Outside: `rgba(255,255,255,0.6)`, `#A3A096` text, `#E6E3DC` border. Click opens the job sheet.
- Legend: bottom-left overlay, `rgba(255,255,255,0.94)`, border `1px solid #E6E3DC`, `border-radius: 9px`, `padding: 9px 12px` — "Within {radius} of you" 12px `#6E6B63` over "{n} of {total} roles" 15px/600.

### 2. Seeker — Job detail / apply sheet
**Purpose:** read the full posting, apply, optionally attach a tailored note.

**Layout:** right-side sheet over a `rgba(26,25,23,0.32)` scrim, `z-index: 60`. Panel `width: min(620px, 100%)`, full height, `#FFFFFF`, left border `1px solid #E6E3DC`, vertical scroll. Clicking the scrim closes; clicks inside must stop propagation.

- Header (`padding: 24px 28px`, bottom border `1px solid #F0EEE8`): company mark + name, title 22px/600 `letter-spacing: -0.02em`, meta row (13.5px, salary in mono). Close button top-right: 30×30, `border-radius: 8px`, border `1px solid #E6E3DC`, "×" 15px.
- Action row: primary apply button (10px 18px, `border-radius: 9px`, 14.5px) + shortlist toggle.
- Note composer (appears after apply, or instead of applying if note-first mode is on): background `#FCFBF9`, border `1px solid #E6E3DC`, `border-radius: 11px`, `padding: 16px`. Title 13.5px/600, hint 12.5px `#6E6B63`, 4-row textarea capped at **400 characters**, then three dashed prompt chips (border `1px dashed #C6CCEC`, `#1B4DFF` text, `border-radius: 999px`) that append canned sentences to the note, then "Send without note" (secondary) and "Submit application" (accent).
- Applied confirmation: background `#EEF6F1`, border `1px solid #CFE6DA`, `border-radius: 11px`, 13.5px `#1F5A41`.
- Facts grid: 2 columns, `gap: 10px`. Each cell background `#FCFBF9`, border `1px solid #F0EEE8`, `border-radius: 9px`, `padding: 11px 13px`; label 11.5px `#8A867C`, value 13.5px/500. Fields: Level, Team size, Visa sponsorship, Hiring since.
- "About the role": 14px body, `line-height: 1.6`, `#4F4C45`.
- "Skills they listed": chips — skills matching the seeker's own skills use the accent chip style, others the neutral `#F3F1EB` style. This diff is the point of the section.
- "Where it is": 170px schematic map with a single pin and an address label (`#1A1917` background, `#FAF9F6` text, 11.5px, `border-radius: 6px`).

### 3. Seeker — Shortlist / compare
**Purpose:** collect roles and compare them before applying.

Title "Compare before you apply", subhead 15px `#6E6B63`, `max-width: 560px`.

**Empty state:** card with `border: 1px dashed #DDD9D1`, `padding: 46px`, centered — "Nothing saved yet." + "Browse roles" primary button.

**Populated:** a comparison table as CSS subgrid inside a card with `overflow-x: auto`. Outer grid `grid-template-columns: 150px repeat(N, minmax(200px, 1fr))`. Header row: empty first cell, then one cell per shortlisted job (company mark + name, title 15px/600, "Remove" link-button 12.5px `#8A867C`). Each body row spans `1 / -1` with `grid-template-columns: subgrid` and renders a label cell (12.5px `#6E6B63`) plus one cell per job (13.5px; emphasized cells 600/`#1A1917`, rest 400/`#4F4C45`). Cell borders `1px solid #F0EEE8`, left borders between columns.

Rows, in order: Base salary (emph), Location, Work setup, Distance, Visa sponsorship (Yes / Not offered), Skill match (emph), Posted.

Footer, right-aligned: "Clear shortlist" (secondary) and "Apply to all {n}" (primary) — the latter marks every shortlisted job applied and navigates to Applications.

### 4. Seeker — Applications tracker
**Purpose:** see where every application stands.

Stages: **Applied → Review → Interview → Offer → Closed**.

- Stage summary: `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))`, `gap: 10px`. Each card `padding: 13px 14px`, count 24px/600 `letter-spacing: -0.02em`, label 12.5px `#6E6B63`.
- Application rows in one card, each `padding: 16px 18px`, bottom border `1px solid #F0EEE8`, `display: flex; flex-wrap: wrap; gap: 14px 20px; align-items: center`:
  - Left `flex: 1 1 200px`: title 15px/600, "{company} · {location}" 13px `#6E6B63`.
  - Middle `flex: 2 1 280px`: a five-step progress rail. Each step is an 11px dot with a 2px ring plus a 10.5px label below, joined by a 2px connector bar (`flex: 1`, `margin: 0 2px 16px`). Completed/current: dot and ring `#1B4DFF`, connector `#1B4DFF`, label `#4F4C45`. Future: white dot, `#DDD9D1` ring, `#E6E3DC` connector, `#A3A096` label. A row at the Closed stage uses `#8A867C` for its final dot instead of accent.
  - Right, `margin-left: auto`: updated timestamp 12.5px `#8A867C` over next action 13px/500 — `#1F5A41` at Offer, `#8A867C` at Closed, else `#1A1917`.
- Newly submitted applications are prepended at stage 0 with "Just now" / "Submitted".

### 5. Seeker — Profile + privacy
**Purpose:** headline, skills, experience, education, links; control recruiter visibility.

**Layout:** wrapping flex — main column `flex: 3 1 400px`, privacy aside `flex: 1 1 280px; max-width: 340px`.

- Identity card: 64×64 avatar (`border-radius: 14px`, `#E3E6F7`, 20px/600 `#1B4DFF`), name 24px/600, **editable headline as a text input** (full width, 14.5px), then a meta row of location, remote preference, and two portfolio links.
- Skills card: neutral tag chips (13px, `#F3F1EB` background, `1px solid #E9E6DE`, `border-radius: 6px`, `padding: 5px 10px`) plus a dashed "+ Add skill" chip in `#1B4DFF`.
- Experience card: rows of `grid-template-columns: 110px minmax(0,1fr)`, `gap: 16px`. Left: mono 12px `#8A867C` date range. Right: role 14.5px/600, org 13px `#6E6B63`, detail 13.5px `#4F4C45` `line-height: 1.55`.
- Education card: same two-column row shape.
- Privacy card: title + 13px explainer, then four toggle rows. Each row is a full-width button, `padding: 9px 0`, bottom border `1px solid #F0EEE8`: label 13.5px over hint 12px `#8A867C`, with a 36×21 track (`border-radius: 999px`, `padding: 2px`) holding a 17px white knob with `box-shadow: 0 1px 2px rgba(0,0,0,0.2)`. On: track `#1B4DFF`, knob right. Off: track `#DDD9D1`, knob left. Toggles: Show my full name (on), Show contact details (off), Show current employer (on), Signal open to work (on).
- Privacy summary strip: background `#F6F5F1`, `border-radius: 8px`, `padding: 11px 12px`, 12.5px `#4F4C45` — counts hidden fields and pluralizes; when none are hidden reads "Your full profile is visible to verified recruiters."

### 6. Recruiter — Applicant pipeline
**Purpose:** move applicants through hiring stages.

Eyebrow is the role name; title "Applicant pipeline"; a 13px `#6E6B63` hint on the right ("Click a card to open the full review").

Board: `grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))`, `gap: 12px`, `align-items: start`. Columns are the same five stages as the seeker tracker. Column shell: background `#F4F2EC`, border `1px solid #E6E3DC`, `border-radius: 12px`, `padding: 10px`; header row is the stage name 13px/600 plus a mono 12px `#8A867C` count.

Candidate card: `#FFFFFF`, border `1px solid #E6E3DC`, `border-radius: 9px`, `padding: 11px 12px`, hover `border-color: #C9C4B8`. 22px circular avatar (`#E3E6F7`, 10px/600 `#1B4DFF`) + name 13.5px/600; role 12px `#6E6B63`; footer row with the mono match badge and an 11.5px `#A3A096` age.

**Not implemented in the prototype:** drag-and-drop between columns. Implement it in the real build (stage change on drop, with an optimistic update).

### 7. Recruiter — Candidate search
**Purpose:** source candidates, save searches with alerts, see where applicants are.

**Layout:** wrapping flex — aside `flex: 1 1 270px; max-width: 340px`, results `flex: 3 1 380px`.

- Query card: three inputs (skills, location/radius, project keyword) + a full-width primary button that becomes "Search saved" after click and fires a confirmation toast.
- Saved searches card: rows with `border-bottom: 1px solid #F0EEE8` — name 13.5px (ellipsized) over "{n} new matches" 11.5px `#8A867C`, plus an "Alerts on/off" pill (11.5px, `border-radius: 999px`) using the selected-chip colors when on.
- Applicants-by-location card: 210px schematic map, grid `background-size: 38px 38px`. Cluster bubbles are absolutely positioned circles at percentage coordinates, `background: rgba(27,77,255,0.16)`, border `1px solid rgba(27,77,255,0.45)`, centered mono 12px `#1F2E8C` count, sized 34–78px by volume. Replace with real clustering (Supercluster or the map SDK's built-in) keeping this styling.
- Recommendation banner: same `#F2F3FC` / `#DCE0F6` treatment as the seeker's.
- Candidate cards: wrapping flex, content `flex: 1 1 220px`, actions `flex: 0 1 auto; margin-left: auto` and allowed to wrap. 28px avatar + name 16px/600 + mono match badge; "{role} · {location}" 13.5px `#6E6B63`; neutral skill tags; "Message" (secondary) and "Review" (primary).

### 8. Recruiter — Candidate review sheet
**Purpose:** evaluate one candidate and contact them without leaving the platform.

Right-side sheet, `width: min(660px, 100%)`, same scrim and close-button pattern as the job sheet.

- Header: 48×48 avatar (`border-radius: 12px`), name 21px/600, "{role} · {location}" 13.5px.
- Action row: "Message in platform" (primary), "Email candidate" (secondary), "Advance stage" (secondary).
- Their note: `#FCFBF9` card with a mono uppercase "THEIR NOTE" label (11.5px, `letter-spacing: 0.08em`, `#8A867C`) over the note at 14px `line-height: 1.6` `#3D3A34`.
- Facts grid, 2 columns: Stage, Applied, Salary expectation, Notice period.
- Skill match: the job's required skills as chips, accent-styled where the candidate has them, neutral where they don't.
- Experience: same two-column date/role rows as the seeker profile.
- Message thread (shown when opened via Message): incoming bubble `#F3F1EB` with `border-radius: 10px 10px 10px 3px`, `align-self: flex-start`, `max-width: 78%`; outgoing bubble `#ECEFFB`, text `#1F2E8C`, `border-radius: 10px 10px 3px 10px`, `align-self: flex-end`. Composer row: input + accent "Send" button.

### 9. Recruiter — Post a role
**Purpose:** create/edit an opening and pin its office location.

**Layout:** wrapping flex — form `flex: 3 1 400px`, location card `flex: 1 1 300px; max-width: 400px`.

Form fields: Role title (text), a two-column row of Base range (text) and Work setup (select: Hybrid — 3 days onsite / Remote / Onsite), Required skills (a chip-input container — `padding: 9px`, border `1px solid #DDD9D1`, `border-radius: 8px`, holding accent chips and a borderless `flex: 1` input), Description (5-row textarea, `line-height: 1.55`, `resize: vertical`). Footer above a `1px solid #F0EEE8` divider, right-aligned: "Save draft" (secondary), "Publish opening" (primary).

Office location card: 230px schematic map with a single draggable pin (address label + 10px accent dot) and an address text input below. In production the pin should be draggable and geocode back into the address field.

---

## Interactions & Behavior

Navigation and state are entirely client-side; no routing in the prototype. Map each screen to a real route.

| Trigger | Behavior |
|---|---|
| Role switch | Sets role and resets to that role's default screen (seeker → Search, recruiter → Pipeline); closes any open sheet |
| Tab click | Changes screen; closes any open sheet |
| Any filter change | Recomputes results immediately — no submit button, no debounce in the prototype (debounce the text inputs against a real API) |
| Reset | Clears query, location, salary floor (back to 60), setup (Any), visa, skills, radius (back to 10) |
| View switcher | List / Split / Map. Also settable as a default via the `mapMode` prop |
| Job card click | Opens the job sheet (note composer closed) |
| Map pin click | Opens the job sheet for that job |
| "One-click apply" | Marks applied, opens the sheet with the note composer open, fires a toast. If the `oneClickApply` prop is false, it instead opens the composer *without* applying — the note becomes required before submission |
| Note prompt chip | Appends a canned sentence to the note, clamped to 400 chars |
| "Send without note" | Closes the composer, toast "Application sent without a note" |
| "Submit application" | Marks applied, closes composer, toast "Application sent with your note" |
| Shortlist toggle | Adds/removes the job; toast either way; header tab count updates |
| "Apply to all {n}" | Marks every shortlisted job applied, navigates to Applications, toast with the count |
| "Clear shortlist" | Empties the shortlist, toast |
| Privacy toggle | Flips the field and recomputes the summary sentence |
| "Save this search" | Label becomes "Search saved", toast about alerts |
| Alerts pill | Toggles notification state for that saved search |
| Pipeline card / "Review" | Opens the candidate sheet |
| "Message" / "Message in platform" | Opens the candidate sheet with the message thread visible |
| Scrim click or × | Closes the sheet and resets its note/message sub-state |
| Card-internal buttons | Must `stopPropagation` — the whole card is also clickable |

**Toast:** fixed, bottom-center, `bottom: 26px`, `z-index: 80`, background `#1A1917`, color `#FAF9F6`, `padding: 11px 18px`, `border-radius: 10px`, 13.5px, `box-shadow: 0 8px 24px rgba(26,25,23,0.22)`. Auto-dismisses after **2200ms**; a new toast cancels the pending timer.

**Hover states:** clickable cards shift `border-color` to `#C9C4B8`; inactive nav tabs take `#EFEDE7`. No transitions are specified — add short ones (120–160ms ease-out) if the codebase does that by default.

**Responsive behavior:** every multi-pane shell is a wrapping flex row and every fixed-count grid is `auto-fit`, so the layout reflows without media queries. Panes stack to a single column below roughly 900px. Two constraints worth preserving verbatim: card content columns need `min-width: 0` **and** their sibling action columns must be allowed to wrap (`flex: 0 1 auto` + `flex-wrap`), or nowrap button text starves the content column to zero width; and the commute ring must be sized from a single axis (`aspect-ratio: 1`) so it stays circular. Mobile layouts were not designed — treat the stacked state as a starting point, not a finished phone design.

**Not implemented — decide in the real build:** loading and error states, empty states other than the shortlist, form validation, pipeline drag-and-drop, real auth, pagination or infinite scroll on results.

---

## State Management

Seeker filters: `q`, `loc`, `minSalary` (number, 60–220, ×1000), `setup` (`any` | `remote` | `onsite`), `radius` (5–60), `visa` (bool), `skills` (string[]).
Navigation: `role` (`seeker` | `recruiter`), `screen`, `view` (`list` | `split` | `map`).
Seeker data: `cart` (job id[], seeded with two), `applied` (map of job id → bool), `headline` (string), `privacy` (four bools).
Sheets: `openJob` (job id | null), `noteOpen` (bool), `note` (string, ≤400), `openCand` (candidate id | null), `msgOpen` (bool).
Recruiter: `savedOn` (map of saved-search id → bool), `searchSaved` (bool).
Transient: `toast` (string).

Derived, recomputed per render — do not store: the filtered job list; per-job skill-overlap percentage (`matching skills / job skills`, shown as a badge and treated as a recommendation at **≥75%**); the nearby count (`dist <= radius || dist === 0`, where 0 means remote); stage counts; the privacy summary sentence; the accent/neutral split on skill chips; pipeline columns grouped by candidate stage.

**Data needs in a real build:** jobs (title, company, logo/mark, location, geo coordinates, salary range, setup, visa flag, posted date, skills[], description, address); the seeker's profile (headline, skills[], experience[], education, links, privacy flags); applications (job, stage, updated, next action); candidates (name, role, location + coordinates, skills[], note, stage, applied date, salary expectation, notice period, experience[]); saved searches (query, new-match count, alert flag); message threads.

Three values are exposed as component-level props (tweakable in the prototype): `mapMode` (Split list + map / Map first / List only — sets the default view), `oneClickApply` (bool — true applies immediately then offers a note, false requires the note first), `defaultRole` (Job seeker / Recruiter — demo convenience only).

---

## Design Tokens

**Colors**
| Token | Hex | Use |
|---|---|---|
| Ground | `#FAF9F6` | Page background, text on dark |
| Surface | `#FFFFFF` | Cards, sheets, inputs-on-white |
| Surface sunken | `#FCFBF9` | Input fills, inset panels |
| Surface muted | `#F6F5F1` | Summary strips |
| Surface tint | `#F4F2EC` | Kanban column shells |
| Ink | `#1A1917` | Primary text, primary button |
| Ink 2 | `#3D3A34` | Note body |
| Ink 3 | `#4F4C45` | Body text, tag text |
| Muted | `#6E6B63` | Secondary text, labels |
| Muted 2 | `#8A867C` | Eyebrows, tertiary meta |
| Muted 3 | `#A3A096` | Timestamps, placeholders, disabled |
| Line | `#E6E3DC` | Card borders |
| Line soft | `#F0EEE8` | Internal dividers |
| Line strong | `#DDD9D1` | Input borders |
| Line hover | `#C9C4B8` | Card hover border |
| Line tag | `#E9E6DE` | Tag borders |
| Hover fill | `#EFEDE7` | Nav hover, pill group track |
| Accent | `#1B4DFF` | The one accent — selection, active, links, match, map |
| Accent deep | `#1F2E8C` | Text on accent tints |
| Accent text | `#4A5490` | Banner body copy |
| Accent tint | `#ECEFFB` | Selected chips, badges |
| Accent tint 2 | `#F2F3FC` | Recommendation banners |
| Accent tint 3 | `#E3E6F7` | Avatars |
| Accent border | `#C6CCEC` | Selected chip / dashed borders |
| Accent border 2 | `#DCE0F6` | Banner borders |
| Accent border 3 | `#D3D8F0` | Avatar borders |
| Accent alpha | `rgba(27,77,255,0.07 / 0.16 / 0.45)` | Radius ring fill, cluster fill, their borders |
| Success | `#1F5A41` on `#EEF6F1`, border `#CFE6DA` | Applied confirmation, offer status |
| Tag fill | `#F3F1EB` | Neutral skill tags |
| Scrim | `rgba(26,25,23,0.32)` | Sheet overlays |
| Map ground | `#EFEEE8`; grid `#E4E2DA`; roads `#E2E0D7`; water `#DEE6EC` | Schematic map only |

Company marks: `#1B4DFF`, `#1F5A41`, `#8A3E1E`, `#4A4A8C`, `#1A1917`, `#0F6C7A`, `#6B3FA0`.

**Typography** — Instrument Sans (400/500/600, Google Fonts) for everything; IBM Plex Mono (400/500) for eyebrows, match badges, salaries, date ranges, and counts. `-webkit-font-smoothing: antialiased` on body.

| Role | Size / weight / tracking |
|---|---|
| Page h1 | 30px / 600 / -0.025em |
| Sheet h2 | 21–22px / 600 / -0.02em |
| Profile name | 24px / 600 / -0.02em |
| Stat number | 24px / 600 / -0.02em |
| Card title | 15–17px / 600 / -0.015em |
| Section h2/h3 | 14–15px / 600 |
| Body | 13.5–14px / 400 / line-height 1.55–1.6 |
| Meta | 12.5–13px / 400 |
| Small meta | 11.5–12px / 400 |
| Field label | 12px / 500 |
| Eyebrow (mono) | 11px / uppercase / 0.1em |
| Badge (mono) | 10.5–12px / 500–600 / 0.06em |

**Spacing** — 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 28px. Page padding `26px 28px 80px`; card padding 16–22px; card gaps 10–18px; inline chip gaps 5–6px.

**Radius** — 4/5/6px chips and tags · 7px small marks · 8px buttons, inputs, small cards · 9px sheet buttons, kanban cards, overlays · 10px toast, message bubbles · 11px inset panels · 12px cards, sheets, banners · 14px large avatar · 999px pills and pins · 50% circular avatars and dots.

**Shadows** — `0 1px 2px rgba(0,0,0,0.2)` toggle knob · `0 2px 6px rgba(26,25,23,0.12)` map pins · `0 8px 24px rgba(26,25,23,0.22)` toast. Cards use borders, not shadows.

**Z-index** — 40 header · 60 sheets · 80 toast.

---

## Assets
No image assets. Company logos are initial marks on flat color — swap for real logos. All iconography is CSS shapes (squares, circles, bars); there is no icon set to import. Fonts come from Google Fonts: Instrument Sans and IBM Plex Mono. Nothing here is brand-specific — if your codebase has a design system, map these tokens onto it rather than hardcoding the hex values.

## Screenshots
In `screenshots/`, captured at a ~920px-wide viewport (i.e. already in the wrapped/narrow layout state — panes sit wider and side by side above ~1100px):

- `01-search.png` — seeker search, split list + map
- `02-job-detail-apply.png` — job detail sheet with the tailored-note composer
- `03-shortlist-compare.png` — shortlist comparison table
- `04-applications-tracker.png` — five-stage application tracker
- `05-profile-privacy.png` — profile with privacy toggles
- `06-recruiter-pipeline.png` — applicant Kanban
- `07-candidate-search.png` — candidate search, saved searches, applicant clusters
- `08-candidate-review.png` — candidate review sheet
- `09-post-a-role.png` — post a role with office-location pin

The HTML prototype is the source of truth where a screenshot and this README disagree.

## Files
- `Job Marketplace.dc.html` — the complete interactive prototype. Markup with inline styles plus a JavaScript class holding all state, mock data, and derived values (filtering, skill-match scoring, stage grouping, privacy summary). Open it in a browser to click through every flow described above.
