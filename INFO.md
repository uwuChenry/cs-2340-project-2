# Roster (CareerConnect) — project info

A two-sided job marketplace. **Job seekers** build a profile, search roles, shortlist and apply, and track applications.
**Recruiters** post roles, search candidates, run an applicant pipeline and message people. **Admins** use Django admin.

This file is the entry point. The detail lives next to the code:

| Read this | For |
|---|---|
| **INFO.md** (this file) | How to run it, how the pieces fit, the status of all 24 user stories, what to watch for when merging |
| [`backend/INFO.md`](backend/INFO.md) | Data model, how users / skills / companies are stored, the API, privacy rules, tests |
| [`frontend/INFO.md`](frontend/INFO.md) | Routes, data flow, state, components, styling, how to add things |

> Written against branch `feature/henry`. If something here disagrees with the code, the code wins — please fix the doc.

---

## 1. The shape of the system

```
 Browser ──► Next.js frontend (localhost:3000)          Django backend (localhost:8000)
             React 19, Tailwind 4, TypeScript   ───────► Django REST Framework, SQLite
             pages call the API directly with            session cookie + CSRF header
             fetch(credentials: "include")     ◄───────  JSON under /api/…
                                                          photos served from /media/…
```

- **Two separate apps, one repo.** `frontend/` is Next.js. `backend/` is Django. They only talk over HTTP/JSON.
- **The frontend calls the backend directly** (no Next.js proxy). The API origin is the page's own hostname on port 8000, so
  `localhost:3000 → localhost:8000` and `127.0.0.1:3000 → 127.0.0.1:8000`. Cookies are per-host, so this matters.
  CORS/CSRF for exactly those two origins is configured in `backend/backend/settings.py`.
- **Auth is Django's session cookie**, not tokens. The frontend never sees a password hash or a token.
- **No mock data any more.** Every screen reads and writes the real API. (The original prototype's `mockData.ts` is deleted.)
- **The Django project is a merge of two things:** the new CareerConnect apps (`profiles`, `jobs`, `applications`,
  `messaging`, `moderation`) and the **legacy movie-store demo** apps (`home`, `movies`, `accounts`, `cart`) that were the
  starting template. The legacy apps are still installed and routed (`/movies/`, `/accounts/`, `/cart/`) so their
  migrations keep applying; the job marketplace does not use them. See §5.

## 2. Running it

**Backend** (needs Python **3.12+** — `requirements.txt` pins Django 6.1)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo            # demo data; safe to re-run. `--flush` wipes the demo rows first
python manage.py runserver            # http://127.0.0.1:8000
python manage.py test                 # 80 tests, ~40s
```

**Frontend** (Node 20+)

```bash
cd frontend
npm install
npm run dev                           # http://localhost:3000
npm run lint && npx tsc --noEmit      # both are clean today
```

**Demo accounts** (created by `seed_demo`, password `demo12345`): `maya` (job seeker), `rhodes` (recruiter). The seed also
creates five more seekers (`draman`, `pshah`, `mbell`, `lortiz`, `tvieira`) who have applied to Rhodes's flagship role.
Or just use **Sign up** — anyone can register as a seeker or a recruiter. Django admin is at `/admin/` (make a superuser
with `python manage.py createsuperuser`).

Optional env vars: `NEXT_PUBLIC_API_URL` (browser → API origin), `API_URL` (server-rendered landing page → API origin).

## 3. Status of the 24 user stories

✅ works end to end · 🟡 partly there (gap noted) · ❌ not started

**Summary: 10 ✅ · 11 🟡 · 3 ❌**

### Job seeker

| # | Story | | Where it lives | Gaps / notes |
|---|---|---|---|---|
| 1 | Create a profile (headline, skills, education, experience, links) | ✅ | Sign up → `/profile`; `GET/PATCH /api/profile/`, `/api/profile/{experience,education,links,projects}/`, `/api/profile/photo/` | Also has About, projects, salary/notice, profile photo. Every block is view-first with an **Edit** button. |
| 2 | Search with filters (title, skills, location, salary, remote/on-site, visa) | 🟡 | `/search`; `GET /api/jobs/` | Salary is a **minimum** only (no range). "Onsite" also includes hybrid; you can't pick hybrid alone. "Title" search also matches company name. |
| 3 | One-click apply with a tailored note | ✅ | Search card / job sheet; `POST /api/applications/apply/` | Note ≤ 400 chars. Apply first, then note, is one idempotent endpoint. |
| 4 | Track status Applied → Review → Interview → Offer → Closed | ✅ | `/applications`; `GET /api/applications/` | Read-only for the seeker; no notification when a recruiter moves you. |
| 5 | Privacy options on profile | ✅ | `/profile` side panel; enforced in the recruiter serializers | 4 toggles: show full name (else initials), show contact, show current employer, open to work. Photo is never sent to recruiters. Server-side, not just hidden in the UI. |
| 6 | Job recommendations from skills | ✅ | Match % badge + "Recommended" banner on `/search` | ≥ 75% skill overlap = recommended, sorted first. No separate "for you" feed or email. |
| 7 | Jobs on an interactive map | 🟡 | `SchematicMap.tsx` | **Placeholder**: a static grid, pins positioned from real coordinates. Not a real map library. |
| 8 | Filter by distance from my current location | 🟡 | Profile → "Use my current location"; `radius` on `GET /api/jobs/` | Location is captured once via browser geolocation and stored; it isn't live on the search page. |
| 9 | Preferred commute radius | ✅ | Radius slider (5–60 mi) on `/search` | Filters the list. The ring on the map is decorative, not to scale. Jobs with no known distance stay in the list. |
| 10 | "Shopping cart" to collect and compare | ✅ | `/shortlist` (called **Shortlist**); `/api/shortlist/…` | Persisted server-side, compare table, apply to all, clear. (Unrelated to the legacy `cart` app.) |

### Recruiter

| # | Story | | Where it lives | Gaps / notes |
|---|---|---|---|---|
| 11 | Post and edit roles | ✅ | `/recruiter/post`; `/api/recruiter/jobs/…` | Draft or publish; edit from "Your openings". The form has no level / team size / visa fields (API supports them). No close/delete in the UI (API supports it). |
| 12 | Search candidates by skills, location, projects | ✅ | `/recruiter/candidates`; `GET /api/recruiter/candidates/` | Skills are AND. Only people **open to work**, or who applied to you, are visible. `radius` exists in the API but not the UI. Unpaginated. |
| 13 | Applicant pipeline (Kanban) | 🟡 | `/recruiter/pipeline` | Five columns per opening. Move a card with **Advance to …** in the candidate sheet (forward one step). **No drag-and-drop.** |
| 14 | Message candidates in the platform | 🟡 | Candidate sheet → thread; `/api/threads/…` | Recruiter → candidate works and persists. **Seekers have no inbox/UI to read or reply** (API supports both sides). `read_at` unused. |
| 15 | Email candidates through the platform | ✅ | Candidate sheet → **Email candidate**; `POST /api/recruiter/candidates/<id>/email/` | Sends via Django's mail backend (console by default; point `EMAIL_HOST`/etc at real SMTP via env vars) and logs to `messaging.EmailLog`. Refused (403) if the candidate hasn't opted in to `show_contact`. |
| 16 | Save a candidate search + get notified | 🟡 | Candidates page; `/api/recruiter/saved-searches/…` | Save, re-run, alerts toggle, "new matches" count. **Nothing is actually sent.** The count = new *accounts* since you last opened it that match skills/location (ignores the project keyword). |
| 17 | Candidate recommendations for my postings | 🟡 | Candidates page banner | Results are ranked by skill overlap with the selected opening. No dedicated feed or notifications. |
| 18 | Pin my office on a map | ✅ | `/recruiter/post`; `RecruiterJobSerializer.create`/`update` | Address is geocoded automatically via OpenStreetMap's Nominatim (`jobs/geocoding.py`) on save, best-effort -- a failed/slow lookup never blocks saving the posting. New roles now show up pinned on the map. |
| 19 | Clusters of applicants by location | 🟡 | `GET /api/recruiter/jobs/<id>/clusters/`; bubbles on the candidates page | Grouped by location text with coordinates rounded to ~1 mile. Drawn on the placeholder map, not real clustering. |
| 20 | Review a candidate's profile + application together | ✅ | Candidate sheet | Note, stage, salary/notice, matched/missing skills, experience. Email/current employer respect privacy. The sheet doesn't show projects/links/education yet (API returns projects). |

### Administrator

| # | Story | | Where it lives | Gaps / notes |
|---|---|---|---|---|
| 21 | Manage users and roles | 🟡 | Django admin `/admin/` (User, Profile.role, SeekerProfile, RecruiterProfile, Company, Skill) | **No custom admin UI.** Deactivate a user with Django's `is_active`. |
| 22 | Moderate / remove job posts | 🟡 | Django admin → Job postings (edit status, delete) | No report-driven workflow. |
| 23 | Export data as CSV | ✅ | Django admin -> any list view (Job postings, Applications, Seeker profiles, Profiles, Reports, Email logs) -> **Export selected to CSV** action | `moderation.admin_utils.CSVExportMixin`; exported columns come from each admin's `list_display`. |
| 24 | Review reports about users / postings | 🟡 | `moderation.Report` model, registered in Django admin | **Model only.** There is no endpoint or button for a user to *file* a report. Admins can create/review them by hand. |

## 4. Things we decided (and why)

- **Server computes match %, recommended, and distance.** Only the server knows the signed-in seeker's skills/coordinates, and
  it keeps the logic in one place (`backend/jobs/matching.py`). The frontend just displays it.
- **One canonical `Skill` table** shared by postings and profiles, resolved case-insensitively — otherwise "react" and
  "React" would silently fail to match.
- **`auth.User` + a `Profile` row for the role**, not a custom user model, because the legacy apps already have foreign keys to
  `auth.User` and swapping the user model mid-project is painful.
- **A candidate is just an Application joined to a SeekerProfile.** One row feeds both the seeker's tracker and the
  recruiter's pipeline, so they can never disagree.
- **Privacy is enforced in serializers, not the UI.** A hidden field that still ships over the wire isn't private. Recruiter
  responses use separate serializers, round coordinates to ~1 mile, and never include the photo.
- **Photos are re-encoded server-side** (square 512 px JPEG, metadata stripped) — phone photos carry GPS in EXIF.
- **Unknown distance ≠ too far.** A job with no coordinates (e.g. any newly posted one, since there's no geocoding) is kept
  when a radius filter is on.
- **The API returns raw facts; the frontend formats them.** ISO timestamps (not "2d ago"), whole-dollar salaries (not "$150k").

## 5. Merging notes (read before merging `feature/henry`)

**Branch state.** `feature/henry` is `main` + the CareerConnect work. `feature/Arnav` is already merged into `main` (PR #3).
`feature/andrew`, `feature/emma`, `feature/trinity` are old, pre-rename branches (they still have the `moviesstore/` folder) with no
new feature work that we could see. So the merge risk is not textual conflicts — it's **anyone's local code built against the
old model names**. Here's the mapping:

| Old (Arnav's foundational models on `main`) | Now | Note |
|---|---|---|
| `profiles.UserRole` (`user.role`) | `profiles.Profile` (`user.profile`) | `related_name` changed |
| `profiles.JobSeekerProfile` (`user.job_seeker_profile`) | `profiles.SeekerProfile` (`user.seeker_profile`) | + lat/long, privacy flags, salary/notice, photo |
| `profiles.WorkExperience` (`.company`, `related_name="work_experience"`) | `profiles.Experience` (`.company_name`, `related_name="experience"`) | |
| `jobs.Skill` | `profiles.Skill` | One shared table |
| `JobPosting.company_name` (text) | `JobPosting.company` → `profiles.Company` | + `recruiter` FK, `status`, `level`, `team_size`, `address`, `updated_at` |
| `RecruiterProfile.company_name / company_website` | `RecruiterProfile.company` → `Company`, + `title` | |
| `Application.applicant → JobSeekerProfile` | `→ SeekerProfile` | + `next_action`; new `ShortlistItem` model |

**Repo hygiene issues to sort out together** (none are blockers, all will cause noisy conflicts):

1. **`backend/db.sqlite3` is committed.** It is modified whenever the server runs (sessions), and any two people who
   commit it will get a binary conflict. It also now contains the photo-column migration. Suggest: stop tracking it, and have
   everyone run `migrate` + `seed_demo`.
2. **~97 compiled `__pycache__/*.pyc` files are committed** (Python 3.13 ones). Same conflict problem. Add `__pycache__/` to `.gitignore` and `git rm -r --cached` them.
3. Also tracked and probably unintended: `backend/db.sqlite3.bak`, `frontend/Job seeker platform prototype.zip`, and
   `.claude/worktrees/home-landing-page` (a stray git link).
4. **New migration:** `profiles/migrations/0004_seekerprofile_photo.py` (adds the photo column). Everyone needs `python manage.py migrate`.
5. **New dependency:** `Pillow` (in `requirements.txt`). It was already implicitly needed by the legacy movies app's `ImageField`.
6. `backend/media/avatars/` is now gitignored — uploaded photos are personal data and shouldn't be committed.
7. Root `readme.md` just says "hi", and `frontend/README.md` is the create-next-app boilerplate. This `INFO.md` is the real documentation.
8. **Security settings are dev-only:** `DEBUG = True`, a committed `SECRET_KEY`, `ALLOWED_HOSTS`/CORS/CSRF hard-coded to localhost. Fine for the course project, not for deployment.

## 6. Testing

- **Backend:** 80 Django tests (`python manage.py test`) covering sign-up, profile editing, privacy, photo processing
  (including EXIF stripping and size/format limits), account settings, radius filter, shortlist/apply flow, and coordinate rounding.
- **Frontend:** no unit tests in the repo. Type-check (`npx tsc --noEmit`) and lint (`npm run lint`) are clean.
- **End to end:** the flows were driven through a real browser (headless Edge via puppeteer-core) against a scratch copy of the
  database during development — sign up as both roles, every profile block, photo upload, account settings, search/shortlist/apply,
  pipeline, messaging, saved searches. **Those scripts are not committed** (they hard-code local paths). If you want them in the
  repo, that's a reasonable next step.

## 7. Suggested next steps (roughly by value)

1. **A real map** (Leaflet + OpenStreetMap) replacing `SchematicMap.tsx` → finishes stories 7, 8, 19 and lets us build 18 (pin picker + geocoding).
2. **Seeker inbox** for messages (API is ready) → finishes 14.
3. **Report button** on postings/profiles + `POST /api/reports/` → finishes 24; then **CSV export** admin actions → 23.
4. **Email** (Django `send_mail`, console backend for the demo) → 15, and real delivery for saved-search alerts → 16.
5. Drag-and-drop pipeline (13), salary range + hybrid filter (2), show projects/links/education in the candidate sheet (20).
