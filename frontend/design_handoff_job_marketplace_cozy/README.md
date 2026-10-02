# Handoff: Job Marketplace — Cozy life-sim re-skin

## Overview
A visual re-skin of the existing job marketplace (job seeker + recruiter, 20 user stories). **Layout, screens, data model, filtering logic, and flows are the same as the version you already implemented.** This pass changes the look and feel to a cozy, game-inspired style: chunky rounded shapes, a grass/sand/sky palette, a rounded display font, pressable buttons, a guide character ("Pip"), and playful names for each area.

The theme is original. It is inspired by cozy life-sim games in general and uses no third-party characters, logos, fonts or game-specific terms. Keep it that way when implementing.

## About the design files
`Job Marketplace Cozy.dc.html` is a **design reference built in HTML**: a clickable prototype showing intended look and behavior, not production code to paste in. Recreate it in your existing codebase using its components, routing and data layer. Open the file in a browser and click through every screen before you start. All data is mock data hardcoded in the file's JavaScript class.

## Fidelity
**High-fidelity.** Colors, type, radii, shadows, spacing and copy are final. Exception: the maps are schematic illustrations (CSS island shapes with absolutely positioned pins). In production, keep the styling of the pins, radius ring and cluster bubbles, but put them on a real map library with real coordinates. A real map can be styled toward this palette (water `#7CC8EC`, land `#A6DB82`, beach `#F6E3B4`).

## Suggested approach
Treat this as a theming job, not a rebuild:
1. Add the new tokens below (colors, fonts, radii, the "drop edge" shadow) to your theme.
2. Restyle your shared primitives (button, chip, card, input, toggle, sheet, toast) per **Component styles**.
3. Apply per-area background colors and renamed labels per **Screens**.
4. Add the new pieces: Pip speech bubble, wooden board/planter containers, letter stamps, pinned paper cards, island map styling.
5. Wire up the few behavior additions listed under **Behavior changes**.

---

## Design tokens

### Fonts (Google Fonts)
- **Fredoka**, weight 600: headings, buttons, tabs, chips, badges, numbers, stamp labels.
- **Nunito**, weights 600 / 700 / 800: all body text. Body defaults to 600–700 weight; labels use 800. Avoid 400; it reads too thin on cream backgrounds.

### Colors
**Surfaces**
- Paper (cards, header, sheets): `#FFF8E1`
- Paper alt (pinned cards rotate through): `#FFF8E1`, `#E6F5FF`, `#FDEBE3`, `#EEF8E4`
- White (inputs, nested cards, chat bubbles): `#FFFFFF`
- Tan (secondary buttons, neutral chips, date pills): `#EFE3C2`
- Note textarea: `#FFFDF6` with ruled lines `#F0E5C8`

**Page backgrounds**, each a solid color plus a dot pattern (`radial-gradient(<dot> 2px, transparent 2.5px)`, `background-size: 22px 22px`):
| Area | Background | Dot |
|---|---|---|
| Grass (Board, Garden) | `#BDE6A0` | `#A9DA87` |
| Sand (Pockets, Post a role) | `#F6E3B4` | `#EDD49A` |
| Sky (Mailbox, Scouting) | `#9ED8F2` | `#B4E2F6` |
| Wood floor (My house) | `#F3D9B8` | `#EACAA0` |

**Ink (text)**
- Headings: `#3A2A1C`
- Body: `#4A3726`
- Secondary: `#5B4636`
- Labels / meta: `#6B5540`
- Tertiary: `#8A6E52`
- Placeholder: `#A38D72`
- Sky-area headings: `#173A52`; sky-area body: `#1F4A66`

**Actions and accents**
- Primary green (Apply, Send, confirm): `#3F8F24`, drop edge `#2E6B18`, white text
- Selected yellow (active tab, active chip, active filter): `#F9D65C`, drop edge `#D9A92C`, text `#5B3B00`
- Success tint (sent, "matches you" chips, skill chips): `#D9F0C6`, edge `#B5DB97`, text `#1F4F0F` / `#2E6B18`
- Rust (Pip's name tag): `#C8552A`
- Red (NEW badge, map location pin): `#C23B38`
- Link blue: `#2F6DB5`, hover `#1F4A80`

**Wood** (job board, pipeline planters)
- Fill `#8E5F36`, inner border `#744B28` (inset 4–5px), drop edge and count pill `#5E3C1F`

**Drop edges for neutral surfaces:** `#D9C59A` on sand/grass areas, `#8CC4DE` on sky areas.

**Application stages** (stamps, progress bars, pipeline counts)
| Stage | Fill | Text |
|---|---|---|
| Applied | `#2F6DB5` | `#FFFFFF` |
| Review | `#F9D65C` | `#5B3B00` |
| Interview | `#7A52B8` | `#FFFFFF` |
| Offer | `#3F8F24` | `#FFFFFF` |
| Closed | `#74685A` | `#FFFFFF` |

**Map illustration**
- Water `#7CC8EC` with dots `#9AD6F1`; beach `#F6E3B4`; land `#A6DB82` with dots `#95CF6F`.
- Island shape: `border-radius: 46% 54% 42% 58% / 52% 44% 56% 48%`.
- Commute ring: `rgba(249,214,92,0.22)` fill, `3px dashed #C9A22C` border.

**Avatars / Pip:** fill `#FFD7A8`, initials `#8A4B1C`, 3–4px white border.

### The "drop edge"
The signature detail. Every pressable or raised element gets a hard, unblurred bottom shadow instead of a soft one:
```
box-shadow: 0 4px 0 <edge color>;   /* 3px on small elements, 5px on big cards */
```
On press (`:active`): `transform: translateY(3px); box-shadow: none;`, so the button sinks into its edge. Cards on wood use `0 4px 0 rgba(40,20,5,0.25)`.

### Radii
- Pills (buttons, tabs, chips, badges, inputs in chat): `999px`
- Inputs and text areas: `14px`
- Small cards (facts, pinned cards): `16px`
- Cards and panels: `22–24px`
- Wood containers: `22–26px`
- Detail sheets: `30px 0 0 30px` (rounded on the left edge only)
- Avatars: `50%`

### Type scale
- Page title: Fredoka 34px / 600
- Sheet title: Fredoka 26–28px
- Section title: Fredoka 18–19px
- Card title: Fredoka 16–19px
- Button: Fredoka 13.5–16px
- Body: Nunito 14–15.5px / 600–700, line-height 1.5–1.6
- Labels: Nunito 13px / 800
- Meta: Nunito 12.5–13.5px / 700

---

## Component styles

**Button, primary:** green fill, white Fredoka text, pill, `padding: 8–11px 15–22px`, 4px green drop edge, sinks on press.
**Button, secondary:** tan `#EFE3C2` fill, `#4A3726` text, `#D9C59A` edge.
**Tab (header nav):** pill. Inactive: paper fill, `#D9C59A` edge. Active: yellow fill and edge.
**Chip / filter toggle:** pill, 3px edge. Off: paper or tan. On: yellow.
**Badge ("94% match"):** green pill, white Fredoka 12px, `white-space: nowrap`.
**Input:** white fill, `2px solid #E6D6AE` border, 14px radius, Nunito 600. Focus: `3px solid #F9D65C` outline.
**Card:** paper fill, 22–24px radius, 5px drop edge. No border.
**Toggle switch:** 46×28 track (on `#3F8F24`, off `#D9C59A`) with a slight inset shadow; 22px white knob with a 2px drop edge.
**Divider:** `2px dashed #E6D6AE` (or `#EADBB6`).
**Section tag** (the label above each page title): small paper pill, Fredoka 13px, 3px edge, e.g. "The Board".
**Pip speech bubble:** a 52–56px round avatar (placeholder: "P" on peach) next to a paper bubble with a rust name tag ("Pip · town clerk") overlapping its top-left edge. Used for recommendations on Board and Scouting.
**Toast:** Pip's avatar plus a white speech bubble, fixed bottom-center, auto-dismisses after 2.6s. Copy is written in Pip's voice ("Tucked it in your pockets!").
**Detail sheet:** slides in from the right over a `rgba(40,25,10,0.38)` scrim, paper background, round tan close button with a drop edge.

---

## Screens
The header is sticky, paper at 95% opacity: a leaf logo (green circle with a cream leaf shape), the "Roster" wordmark in Fredoka, pill tabs, the role switch, and an avatar. The page background changes per area (see table above).

### Job seeker
**Board** (job search, grass)
- Pip bubble with recommendations, for example: "Morning, Maya! 4 postings fit your skills, and 2 of them are close enough to walk to."
- Filter panel ("What you're after"): same filters as before. Commute radius is renamed "Walking distance".
- Job list sits inside the **wooden board** container ("Town job board", with a count pill). Cards are a grid (`minmax(250px, 1fr)`). Each card is paper in a rotating tint, tilted slightly (−1.2° / 0.9° / −0.6° / 1.3°), with a colored thumbtack circle at top center. On hover it straightens and lifts 3px. Applied cards get a 3px green outline.
- Card buttons: "Apply" (green; becomes "Sent!" in the success tint) and "Pocket it" (tan; becomes "In pocket" in yellow).
- View switcher is labeled Board / Both / Map.
- Map: island illustration, round pins with a 3px white border (green inside the walking radius, tan outside), and your avatar at the center of the yellow dashed ring.

**Pockets** (shortlist/compare, sand). Same comparison table on a paper card with dashed row dividers. Copy: "Take out", "Empty pockets", "Send all N applications". Empty state: "Your pockets are empty!"

**Mailbox** (application tracker, sky)
- Stage summary pills, each with a colored count.
- Each application is a letter card: a 76×76 **stamp** on the left (stage color, dashed cream inner border plus a solid outer outline, stage name inside), company, a NEW badge where relevant, then a chunky 5-segment progress bar (10px tall, filled in the current stage's color) with stage labels.

**My house** (profile + privacy, warm wood)
- Large round avatar, editable headline input, and links.
- Skills shown as green chips.
- Experience and education with tan date pills.
- Privacy panel is titled "Who can peek in".

**Job detail sheet**
- Big green Apply button.
- Note composer titled "Write them a little note", with a lined-paper textarea and "+" prompt chips.
- Success banner: "Sent! It's in your Mailbox".
- "Skills they're after": green chips are skills on your profile.
- Island mini-map with a red pin.

### Recruiter
**Garden** (pipeline, grass). Five **wooden planters**, one per stage. Each has a paper pill header with a stage-colored count, and paper candidate cards with a drop edge.

**Scouting** (candidate search, sky). Query card, saved searches with "Alerts on/off" pills (green when on), an island map with cluster bubbles (paper circle, rust border, count inside), a Pip recommendation bubble, and candidate cards.

**Post a role** (sand). Same form, restyled. The publish button reads "Pin it to the board". Office location uses the island map.

**Candidate review sheet**
- Buttons: "Message in Roster" (green), "Email candidate" (tan), "Move to next stage" (yellow).
- The candidate's note sits in a white card with a blue name tag.
- Green skill-match chips.
- A working chat thread (see Behavior changes).

---

## Behavior changes vs. the implemented version
1. **Renamed nav:** Search → Board, Shortlist → Pockets (shows count), Applications → Mailbox, Profile → My house, Pipeline → Garden, Candidates → Scouting.
2. **Per-area background color** follows the current screen.
3. **Toasts** come from Pip and use friendlier copy. Duration is 2.6s.
4. **Messaging works:** typing and sending (button or Enter) appends a green bubble on the right. The prototype fakes a reply 1.4s later; in production, use real messages. Incoming bubbles are white on the left. Radius is `20px 20px 6px 20px` for outgoing and `20px 20px 20px 6px` for incoming.
5. **"Move to next stage"** advances the candidate one stage and moves their card in the Garden. It stops at Offer.
6. **"Send without note"** now also marks the job as applied.
7. **Empty board state:** "Nothing pinned up that matches. Try loosening a filter."
8. New prop **`showGuide`** (boolean) hides Pip's recommendation bubbles. It is worth exposing as a user setting for people who find the character distracting.

## Assets
- **Pip** is a placeholder (a peach circle with a "P"). Replace it with your own original character art: a friendly animal or villager-style illustration as a 1:1 PNG/SVG with a transparent background, at 56px and 48px usage sizes.
- Company marks are initials on solid colors. Swap them for real logos in round frames.
- No other image assets. Everything else is CSS.

## Accessibility notes
- White text sits only on the darkened green, rust, red, purple and blue shown above. Don't swap in the lighter shades (`#6DBE45`, `#B28DE0`, `#F08A5D`), which fail contrast.
- Tilted cards are purely decorative. Respect `prefers-reduced-motion` by removing the tilt and the hover lift.
- The press-in animation should not be the only feedback; keep the existing focus states (yellow outline).

## Files
- `Job Marketplace Cozy.dc.html`: the full interactive prototype (markup with inline styles plus a JS class with state and mock data).
- `screenshots/`: one capture per screen:
  - `01-board.png`
  - `02-job-detail-note.png`
  - `03-pockets-compare.png`
  - `04-mailbox.png`
  - `05-my-house-profile.png`
  - `06-garden-pipeline.png`
  - `07-scouting.png`
  - `08-candidate-review-chat.png`
  - `09-post-a-role.png`

Where a screenshot and the HTML disagree, the HTML is the source of truth.
