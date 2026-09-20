# Frontend — how it works

Next.js **16** (App Router) · React **19** · TypeScript · Tailwind CSS **v4**. It's a client-heavy app: almost every page is a
`"use client"` component that fetches from the Django API. See the root [`INFO.md`](../INFO.md) for how to run everything and
the status of the 24 user stories, and [`../backend/INFO.md`](../backend/INFO.md) for the API.

> ⚠️ **This is not the Next.js you may remember.** Next 16 has breaking changes. `AGENTS.md` (also loaded by `CLAUDE.md`) says
> to read the relevant guide in `node_modules/next/dist/docs/` before writing framework code. Do that before touching routing,
> config, caching or data fetching.

```bash
npm install
npm run dev                    # http://localhost:3000  (needs the backend on :8000)
npm run lint && npx tsc --noEmit
```

## 1. Layout

```
app/                         routes (one folder = one URL). layout.tsx wraps everything in providers + the shell
  page.tsx                   /                    landing page (server component; fetches live stats)
  login/  signup/            /login  /signup
  search/                    /search              job search, filters, list/split/map views          (public)
  shortlist/ applications/   /shortlist /applications                                                (seeker)
  profile/                   /profile             seeker profile, view-first blocks with Edit         (seeker)
  account/                   /account             username, email, password                           (any signed-in user)
  recruiter/pipeline|candidates|post|profile/                                                        (recruiter)
  globals.css                Tailwind import + design tokens (@theme) + base styles
components/
  AppShell.tsx               Header + <main> + the two slide-over sheets + the toast
  Header.tsx  UserMenu.tsx   navbar; avatar dropdown (role label, View profile, Account settings, Sign out)
  Guard.tsx                  page gate: needs a session, optionally a role
  JobSheet.tsx               slide-over: job detail + apply + note
  CandidateSheet.tsx         slide-over: candidate review, advance stage, message thread
  ProfileCard.tsx            a profile block's card with the "Edit" button in its corner
  ProfileBlocks.tsx          Header (photo/name/…), About, Skills blocks
  ProfileSection.tsx         generic list block (experience/education/projects/links) with add/edit/remove
  RoleSelect.tsx             recruiter's "which opening" dropdown
  SchematicMap.tsx           PLACEHOLDER map (see §7)
  Toast.tsx  ui/*            small primitives: Avatar, Button, Card, Chip, Field(+FieldError), Notice, ProgressRail, Sheet, Toggle
lib/
  api.ts                     the fetch wrapper (cookies, CSRF, errors, uploads)
  apiTypes.ts                TypeScript shapes of the API's JSON (Api*)
  types.ts                   the shapes the UI works with (Job, Filters, CandidateDetail, …)
  adapters.ts                Api* → UI types (dates, salaries, map positions, …)
  derive.ts  constants.ts    presentation helpers; static lists (skill chips, privacy labels, note prompts)
  useAsync.ts  useDebounced.ts  useRecruiterJobs.ts     hooks (§4)
state/
  AuthState.tsx              who is signed in
  AppState.tsx               shared UI + seeker data (filters, shortlist, applied, sheets, toast, …)
design_handoff_job_marketplace/   the original design bundle (README, HTML prototype, screenshots). Reference only
```

## 2. Routes and who can see them

| Route | Guard | Notes |
|---|---|---|
| `/` | none | Server-rendered. Fetches counts from `/api/jobs/` with a 2.5 s timeout; if the backend is down the stats are just omitted |
| `/search` | none | Public. Personalised (match %, distance) once signed in |
| `/login` `/signup` | none | After login → the `?next=` path if it's a real destination, else `/search` (seeker) or `/recruiter/pipeline`. After **sign-up** → `/profile` or `/recruiter/profile` so people fill in their details |
| `/shortlist` `/applications` `/profile` | `role="job_seeker"` | |
| `/account` | any signed-in role | |
| `/recruiter/*` | `role="recruiter"` | |

`Guard` waits for the session check, sends visitors with no session to `/login?next=…`, and shows a polite "this page is for
recruiter accounts" card to the wrong role. **The real enforcement is the backend** (403s) — the guard is just UX.

**Navbar:** signed out (or while the session loads) → just **Search**, plus Sign in / Sign up. Seeker → Search, Shortlist (n),
Applications. Recruiter → Pipeline, Candidates, Post a role. Profile and account links live in the avatar menu, not the nav.

## 3. Talking to the backend — `lib/api.ts`

- **Direct calls, no proxy.** The API origin is `NEXT_PUBLIC_API_URL` if set, otherwise `<the page's protocol>//<the page's hostname>:8000`.
  Deriving it from the hostname matters: session cookies are per-host, so a page on `127.0.0.1` must call `127.0.0.1:8000`.
- **Cookies + CSRF.** Every request uses `credentials: "include"`. Unsafe methods send `X-CSRFToken` read from the `csrftoken`
  cookie (fetching `/api/auth/csrf/` first if it's missing).
- **Errors.** Failures throw `ApiError` with `.status`, a readable `.message`, and `.fieldErrors` (`{field: [messages]}`) that forms
  render next to the right input. Network failure → "Can't reach the server. Is the backend running on port 8000?".
- **Uploads.** `http.upload(path, FormData)` sends multipart and lets the browser set the boundary.
- Helpers: `http.get/post/patch/delete/upload`, `messageOf(error)`.
- The landing page runs on the **server**, so it uses `API_URL` (default `http://127.0.0.1:8000`) instead of the browser client.

### Two type layers on purpose

- `lib/apiTypes.ts` = exactly what the API sends (`ApiJob`: `salaryMin` in dollars, `postedAt` ISO, `setup: "on_site"`, …).
- `lib/types.ts` = what components render (`Job`: `salaryLow` in **thousands**, `posted: "2d ago"`, `setup: "Onsite"`, `mapLeft/mapTop`, …).
- `lib/adapters.ts` converts between them (`toJob`, `toApplication`, `applicationToDetail`, `toClusters`, `timeAgo`, …).
  The backend deliberately returns raw facts; **formatting is a frontend job**. When the API gains a field, add it to `apiTypes.ts`
  and the adapter, then use it.

## 4. State and data-loading patterns

### `AuthState` (`useAuth()`)
`user` (`{id, username, name, email, role, photoUrl} | null`), `ready` (false until the first session check finishes — don't
redirect before it's true), `error` (backend unreachable), and `login / register / logout / refresh`. `refresh()` re-reads the
session; call it after changing something the navbar shows (name, photo).

### `AppState` (`useAppState()`)
- **UI state:** view mode, search filters, which job/candidate sheet is open, the note draft, the toast, the recruiter's current opening.
- **Seeker data, loaded once per sign-in:** shortlist (as full `Job`s), which jobs you've applied to, your skills. Mutations
  (`toggleCart`, `clearCart`, `applyJob`, `applyAll`, `submitNote`) call the API and update this optimistically where safe.
  It's stored **keyed by user id**, so signing out or switching accounts hides the previous person's data without clearing it in an effect.
- `requireSeeker(action)` — anything a seeker does while signed out sends them to `/login?next=…` with a toast instead of failing.
- `seekerReady` distinguishes "still loading" from "genuinely empty" (e.g. an empty shortlist).
- `dataVersion` / `bumpData()` lets a sheet tell pages "this changed, reload" (e.g. after advancing a stage the pipeline refetches).

### Hooks
- **`useAsync(load, deps, enabled?)`** — runs an async loader when `deps` change → `{data, error, loading, reload, setData}`.
  It keeps the previous data while reloading (no flicker on filter changes) and derives `loading` from a request key instead of
  setting state inside the effect (that pattern trips React 19's lint rules). `setData(fn)` applies a successful edit locally.
- **`useDebounced(value, ms)`** — filter inputs use it so typing doesn't fire a request per keystroke.
- **`useRecruiterJobs()`** — the recruiter's openings + the "current" one (defaults to the published opening with the most applicants);
  shared by Pipeline, Candidates and the cluster map through `AppState`.

## 5. Key pieces and how they behave

- **Search (`/search`)** — filter changes are debounced and sent as query params (salary slider is in thousands → `min_salary` in
  dollars). Results are paginated ("Show more roles"); recommended roles sort first. Signed out: everything works except
  personalisation, with a "sign in to see matches" note. **Note:** the radius slider filters the list for seekers who have pinned a
  location; jobs with unknown distance stay.
- **Job sheet** — fetches `/api/jobs/<id>/` (for `matchedSkills`). "One-click apply" applies immediately, then opens the optional
  note box; submitting the note re-posts to the same endpoint, which updates the existing application.
- **Shortlist** — the "cart" from the stories. Persisted server-side; compare table; "Apply to all" → `/applications`.
- **Profile (`/profile`)** — every block is **read-only until you press its Edit button** (top-right corner). Form blocks (header,
  About) have Save / Cancel; list blocks (Skills, Experience, Education, Projects, Links) enter a management mode with per-entry
  edit/remove, "+ Add …" and a **Done** button. `ProfileSection` turns a list of field definitions into the form and talks to the
  matching endpoint, so adding a new repeating section is ~15 lines. The header block also holds the **photo** upload/remove,
  name, headline, location (+ "Use my current location"), salary/notice, and "open to remote". Validation errors from the API show under the field.
- **Avatar menu** — `UserMenu`: name, role ("Job seeker"/"Recruiter"), View profile, Account settings, Sign out. Escape / outside
  click closes it; arrow keys move between items; admins get no "View profile".
- **Recruiter Pipeline** — five columns from `/pipeline/`; clicking a card opens `CandidateSheet`, where **Advance to …** moves
  the card one stage (no drag-and-drop). **Message in platform** opens/gets the thread and sends messages.
- **Recruiter Candidates** — query → `/api/recruiter/candidates/`, ranked against the selected opening. Save a search, toggle
  alerts, click a saved search to re-run it. "Applicants by location" draws cluster bubbles.
- **Post a role** — one form for create and edit ("Your openings" list). The free-text "Base range" (`$150k — $185k`) and
  single address box are **parsed** into `salaryMin/Max` and `city/state`. There is no geocoding, so new roles have no coordinates.

## 6. Styling

- **Design tokens** are CSS variables in `app/globals.css` under `@theme` (`--color-ink`, `--color-accent`, `--color-danger`, …),
  which Tailwind exposes as classes (`text-muted`, `bg-accent-tint`, `border-line`, …). Use tokens, not raw hex.
- **Fonts:** Instrument Sans + IBM Plex Mono via `next/font/google`.
- ⚠️ **Base styles must live in `@layer base`.** The global `a` / `button` color rules used to be unlayered, and unlayered CSS beats
  Tailwind utilities — so `text-ground` on primary buttons and `text-muted` on nav links were silently ignored. They're layered now;
  don't add unlayered element styles.
- Avatars use a plain `<img>` (an eslint exception is documented in `Avatar.tsx`): the API already resizes photos to 512 px, and
  `next/image` would need a `remotePatterns` entry for a host that changes between `localhost` and `127.0.0.1`.
- Layout is responsive with flex-wrap rather than breakpoints in most places; the design handoff screenshots are the visual reference.

## 7. What's mocked / placeholder

Nothing is mocked any more — with **one exception, the map**: `SchematicMap.tsx` is a static grid with a fake road/water backdrop.
Pins and cluster bubbles are positioned by squeezing real coordinates into a fixed Austin-area box (`projectToMap` in `adapters.ts`),
and the commute "ring" is decorative (not to scale). Replacing it with a real map library (Leaflet/OpenStreetMap) is the most
valuable next frontend task and unlocks user stories 7, 8, 18 and 19. Remote roles and jobs without coordinates get no pin.

Smaller static bits: the skill filter chips (`lib/constants.ts`, no "all skills" endpoint yet), the note-prompt chips, and the
privacy toggle labels.

## 8. How to add …

- **A page:** create `app/<route>/page.tsx`; wrap the content in `<Guard role="…">` if it needs a session; fetch with `useAsync`.
- **An API call:** add the response type to `apiTypes.ts`, an adapter in `adapters.ts` if the UI wants a different shape, then
  `http.get<ApiThing>("/api/…")`.
- **A repeating profile section:** add a `<ProfileSection<ApiThing> … fields={[…]} renderItem={…} />` in `app/profile/page.tsx`
  (the backend needs the matching REST endpoints — see `profile_section_views` in `backend/profiles/views.py`).
- **A form with server validation:** keep `errors: Record<string, string[]>` in state, fill it from `err.fieldErrors`, and render
  `<FieldError messages={errors.field} />` under the input. Field keys must match the API's field names.

## 9. Testing status & known gaps

- No unit tests in the repo. `tsc` and `eslint` are clean. The flows were verified by driving a real browser against a scratch
  backend during development (scripts not committed — they hard-code local paths).
- Not built: seeker message inbox, drag-and-drop pipeline, a real map, the report-a-posting button, salary range / hybrid-only
  filters, showing projects/links/education in the candidate sheet, pagination on candidate search. See the story table in the root `INFO.md`.
- The recruiter profile page is still a single form (not per-block Edit like the seeker's), and recruiters have no photo.
- Access control is enforced by the backend; the frontend guards are only for UX.
