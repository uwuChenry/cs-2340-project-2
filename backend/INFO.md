# Backend — how it works

Django 6.1 + Django REST Framework 3.18, SQLite. The API lives under `/api/`. See the root [`INFO.md`](../INFO.md) for how to run
it and the status of the 24 user stories.

> Needs **Python 3.12+** for Django 6.1. (During development on Python 3.11 everything ran fine on Django 5.2 — nothing
> Django-6-specific is used — but the pinned version is 6.1.)

## 1. Project layout

```
backend/
  manage.py
  requirements.txt              Django, DRF, django-cors-headers, Pillow
  backend/                      the Django *project* (settings.py, urls.py)
  ── CareerConnect apps (the job marketplace) ──
  profiles/                     users' roles, seekers, recruiters, companies, skills, photos, auth endpoints
  jobs/                         job postings, saved searches, search/matching logic, recruiter job endpoints
  applications/                 applications + the seeker's shortlist
  messaging/                    recruiter ↔ seeker threads
  moderation/                   Report model (admin only for now)
  ── legacy apps (from the movie-store template; not used by the marketplace) ──
  home/  movies/  accounts/  cart/
  media/                        uploads (avatars/ is gitignored)
```

Notes:

- The legacy apps stay in `INSTALLED_APPS` and `urls.py` because their migrations are part of the database history. The
  marketplace ignores them. (`movies.Report` is a *different* model from `moderation.Report`; the legacy `cart` app is not the
  job **Shortlist**.)
- Project settings worth knowing (`backend/backend/settings.py`): DRF default auth is `SessionAuthentication`, default
  permission is `IsAuthenticated`, default pagination is 25/page; CORS + CSRF trusted origins are `localhost:3000` and
  `127.0.0.1:3000`; the CSRF cookie is deliberately **not** HttpOnly so the frontend can echo it in `X-CSRFToken`.

## 2. Data model

### How users are stored

There is **no custom user model.** Everyone is a row in Django's built-in `auth_user` table (username, email, first/last name,
hashed password — Django's PBKDF2, never returned by any endpoint). Sessions are rows in `django_session`; the browser holds
a `sessionid` cookie.

Everything the marketplace needs hangs off that user through one-to-one tables:

```
auth.User ─┬─ 1:1 ─ profiles.Profile            role = job_seeker | recruiter | admin        (every account has one)
           ├─ 1:1 ─ profiles.SeekerProfile      only for job seekers
           └─ 1:1 ─ profiles.RecruiterProfile   only for recruiters ──► N:1 ─ profiles.Company
```

- **Role lives in `Profile.role`**, and permission checks read it. A recruiter is `Profile.role == "recruiter"` *and* has a
  `RecruiterProfile`. (A stray `RecruiterProfile` row alone does not grant recruiter access.)
- **Why not a custom user model?** The legacy apps already have foreign keys to `auth.User`; swapping the user model in a
  project with existing migrations is painful, and a side table is enough.
- **Sign-up** (`POST /api/auth/register/`) creates the `User`, the `Profile`, and the matching `SeekerProfile` or
  `RecruiterProfile` (+ a `Company`, reused case-insensitively) in one transaction, then signs the user in. You can pick
  `job_seeker` or `recruiter`; `admin` is rejected. Admins are made with `createsuperuser` / Django admin.

### Tables at a glance

| App | Model | What it is | Key fields / rules |
|---|---|---|---|
| profiles | `Skill` | **The one skill table** for the whole platform | `name` (unique). See §3 |
| profiles | `Profile` | A user's role | `user` 1:1, `role` |
| profiles | `Company` | An employer | `name` (unique), `website`, `logo_bg` (hex for the initials square); property `mark` = 2-letter initials |
| profiles | `SeekerProfile` | A job seeker | headline, about, location text, `latitude/longitude`, `open_to_remote`, `skills` (M2M → Skill), salary_expectation, notice_period, **privacy flags** (`show_full_name`, `show_contact`, `show_current_employer`, `open_to_work`), `photo` |
| profiles | `Experience` / `Education` / `ProfileLink` / `Project` | Repeating profile sections | FK → SeekerProfile. Experience with `end_date = null` is the current role |
| profiles | `RecruiterProfile` | A recruiter | `user` 1:1, `company` FK, `title` |
| jobs | `JobPosting` | A role | `recruiter` FK, `company` FK, title, description, level, team_size, address/city/state, `latitude/longitude`, `salary_min/max` (whole dollars), `work_arrangement` (remote/hybrid/on_site), `offers_visa_sponsorship`, `skills` (M2M → Skill), `status` (draft/published/closed) |
| jobs | `SavedSearch` | A stored query + alert toggle | `owner` (User), `kind` (jobs/candidates), `filters` (JSON), `alerts_on`, `last_viewed_at`. Only the recruiter's *candidate* searches are wired up |
| applications | `Application` | A seeker applied to a job | `applicant` → SeekerProfile, `job`, `tailored_note` (≤ 400), `status` (applied/review/interview/offer/closed), `next_action`, timestamps. **Unique per (applicant, job)** |
| applications | `ShortlistItem` | A job a seeker saved to compare | `seeker`, `job`. Unique per pair |
| messaging | `Thread` | A conversation | `recruiter` (User), `seeker` (User), `job` (optional). Unique per (recruiter, seeker, job) |
| messaging | `Message` | One message | `thread`, `sender`, `body`, `sent_at`, `read_at` (**never set yet**) |
| moderation | `Report` | A report about a user or posting | `reporter`, `reported_user`/`reported_job`, `reason`, `details`, `status` (open/reviewing/resolved/dismissed), `reviewed_by`. **No API** — admin only |

Design choices baked into these tables:

- **A "candidate" is not its own table.** A candidate is an `Application` joined to a `SeekerProfile`. The seeker's tracker and the
  recruiter's pipeline read the same row, so they cannot disagree.
- **Derived values are never stored.** Match %, "recommended", distance, `stageIndex`, "new matches" counts are computed per request
  (`jobs/matching.py`, serializer methods). Nothing to keep in sync.
- **Salaries are whole dollars** in the database. "$150k" is a frontend formatting job.
- **`Company` is shared.** Two recruiters at one company show one identity. Recruiters can't rename it (that would rename it for
  everyone); they can edit the website.
- **Threads are scoped to a posting when they can be**, so the candidate sheet can open the right conversation.

### Migrations

`profiles` 0001–0004, `jobs` 0001–0003, `applications` 0001–0003, `messaging` 0001, `moderation` 0001 — run
`python manage.py migrate` after pulling. Profiles 0002–0003 are the rename/rework of Arnav's original models (see the mapping
table in the root `INFO.md`); the latest, `profiles/0004_seekerprofile_photo`, adds the photo column. `python manage.py makemigrations --check` should report
nothing pending.

## 3. Skills — how they're stored and matched

- **One table, `profiles_skill`**, referenced by two M2M tables: `SeekerProfile.skills` and `JobPosting.skills`.
- **Matching is a set intersection on exact names**: `match % = |job skills ∩ seeker skills| / |job skills|`
  (`skill_match_pct` in `jobs/matching.py`; a job with no skills scores 0). A role is **recommended** at ≥ **75%**.
- Because the comparison is exact, names are normalised when **users type them** — `profiles/skills.py::resolve_skills()`:
  trims/collapses whitespace, de-duplicates case-insensitively, and reuses an existing row if one matches ignoring case
  (`react` → the existing `React`). Both the seeker profile and the recruiter's job form go through it.
- Skills are **free-typed**, so a new spelling creates a new global row. There is no moderation/merge tool yet; use Django admin → Skills.
- Limits: 50 skills per profile, 100 chars each.
- The search screen's skill chips are a fixed list on the frontend (no "list all skills" endpoint yet).

## 4. Privacy — what recruiters can and can't see

Enforced in the serializers (a hidden field that still ships over the wire isn't private):

| Data | Seeker sees | Recruiter sees |
|---|---|---|
| Name | full | full name, or **initials** if `show_full_name` is off |
| Email | own | only if `show_contact` is on |
| Current employer | own | only if `show_current_employer` is on |
| Being findable | — | sourcing shows a seeker only if `open_to_work` **or** they've applied to that recruiter's posting (applying is consent) |
| Coordinates | exact (as stored) | **rounded to 2 decimals (~1 mile)**, everywhere: pipeline, candidate detail, candidate search, cluster map |
| Photo | own | **never** (it would defeat "initials only") |

Two serializers do this on purpose: `OwnProfileSerializer` (everything, editable) and `PublicSeekerSerializer` /
`CandidateSerializer` (gated). **Never serialize `SeekerProfile` directly in a recruiter response.**

## 5. API reference

All under `/api/`. JSON. Auth is the session cookie; unsafe methods (POST/PATCH/DELETE) need the `X-CSRFToken` header
(get the cookie from `GET /api/auth/csrf/`). "Seeker" / "Recruiter" means the account's role; the wrong role gets **403**.
Signed-out on a protected endpoint is also **403** (session auth has no `WWW-Authenticate`); only a failed login is **401**.

### Auth & account — `profiles/urls.py`

| Method & path | Who | Does |
|---|---|---|
| `GET /auth/csrf/` | anyone | Sets the CSRF cookie |
| `POST /auth/register/` | anyone | `{username, password, email, firstName, lastName, role, company?, title?}` → creates account, signs in, returns the session user. Reports **all** validation errors at once |
| `POST /auth/login/` · `POST /auth/logout/` | anyone | |
| `GET /auth/session/` | anyone | `{user: {id, username, name, email, role, photoUrl} \| null}` — what the navbar uses |
| `GET/PATCH /auth/account/` | signed in | username, email (username unique case-insensitively) |
| `POST /auth/password/` | signed in | `{currentPassword, newPassword}`; keeps you signed in |

### Seeker profile — `profiles/urls.py`

| Method & path | Does |
|---|---|
| `GET/PATCH /profile/` | The whole profile. PATCH accepts `firstName, lastName, headline, about, location, latitude, longitude, openToRemote, salaryExpectation, noticePeriod, skills: [names], privacy: {name, contact, current, openToWork}` |
| `POST/DELETE /profile/photo/` | Multipart `photo` upload / remove (see §7) |
| `GET/POST /profile/experience/` · `PATCH/DELETE …/<id>/` | Same shape for `education/`, `links/`, `projects/`. Rows are scoped to the signed-in seeker — someone else's id is a **404** |

### Jobs (public search) — `jobs/urls.py`

| Method & path | Does |
|---|---|
| `GET /jobs/` | Published postings, paginated (25/page, `?page=`). **Public**; personalised fields (`matchPct`, `distanceMi`, `shortlisted`, `applied`) are filled in when a seeker is signed in |
| `GET /jobs/<id>/` | One posting; adds `matchedSkills`, `companyWebsite` |

`GET /jobs/` filters: `q` (title **or** company), `location` (city/state), `skills` (comma list, **all** must match), `setup`
(`any`/`remote`/`onsite` — onsite includes hybrid), `min_salary` (dollars, vs the job's lower bound), `visa=true`, `radius` (miles).

`radius` uses the seeker's stored coordinates (haversine, in Python because SQLite has no geo support). Remote jobs count as
distance 0; jobs with **unknown** distance stay in; signed-out visitors and seekers with no pinned location get no radius filtering.

### Applications & shortlist — `applications/urls.py` (Seeker)

| Method & path | Does |
|---|---|
| `GET /applications/` | The tracker (with `stage`, `stageIndex`, `nextAction`) |
| `POST /applications/apply/` | `{job, note?}` — **idempotent**: 201 first time, 200 after (a later call with a note updates it). Applying removes the job from the shortlist. Drafts/closed jobs → 404 |
| `POST /applications/apply-all/` | `{jobs?}` (default: whole shortlist). Skips ones already applied to; returns counts |
| `GET/POST /shortlist/` | List / add `{job}` |
| `DELETE /shortlist/<job_id>/` | Remove one |
| `DELETE /shortlist/clear/` | Remove all |

### Messaging — `messaging/urls.py` (both sides)

| Method & path | Does |
|---|---|
| `GET /threads/` | My threads with messages |
| `POST /threads/` | **Recruiter only.** `{seeker, job?, body?}` — get-or-create the thread for that recruiter/seeker/(own) job |
| `GET /threads/<id>/` · `POST /threads/<id>/messages/` | Read / send. Only the two participants can |

### Recruiter — `jobs/recruiter_urls.py`, mounted at `/recruiter/` (Recruiter; everything is scoped to *their own* postings)

| Method & path | Does |
|---|---|
| `GET/PATCH /recruiter/profile/` | Name, email, title, company website |
| `GET/POST /recruiter/jobs/` · `GET/PATCH/DELETE …/<id>/` | Own postings incl. drafts. POST/PATCH take `status: draft\|published\|closed` and `skills: [names]` |
| `GET /recruiter/jobs/<id>/pipeline/` | Applicants grouped into all five stages |
| `GET /recruiter/jobs/<id>/clusters/` | Applicants grouped by location text (coordinates rounded) |
| `GET /recruiter/applications/<id>/` | The candidate sheet (privacy-gated) |
| `PATCH /recruiter/applications/<id>/stage/` | `{status, next_action?}` — moves a card. Any status is accepted (the UI only offers "advance one step") |
| `GET /recruiter/candidates/` | Sourcing: `skills` (all), `location`, `project`, `job` (rank against), `radius`. Returns `{count, targetJob, results}` ranked by match |
| `GET /recruiter/candidates/<seekerId>/` | A sourced (non-applicant) seeker's public profile |
| `GET/POST /recruiter/saved-searches/` · `GET/PATCH/DELETE …/<id>/` | Saved candidate searches. **GET on one stamps `last_viewed_at`**, which resets its "new matches" count |

### Conventions

- JSON keys are **camelCase** (`salaryMin`, `postedAt`, …). One known inconsistency: `JobPosting` list/detail returns `team_size` in snake_case.
- Timestamps are ISO 8601; salaries are whole dollars.
- Validation errors are `400 {field: ["message"]}` (or `{detail: "…"}`), which the frontend maps onto form fields.
- Only `GET /jobs/` is paginated; other lists are plain arrays.

## 6. Permissions & scoping (how one user can't touch another's data)

- `profiles/permissions.py::IsRecruiter` — role must be `recruiter` (checked against `Profile`).
- `RecruiterContextMixin` — every recruiter view builds its queryset through `own_jobs()` (`JobPosting.objects.filter(recruiter=me)`),
  so another recruiter's posting/applicant is a **404**, not a 403.
- Seeker views (`SeekerOnlyMixin`, `own_seeker_profile`) resolve the signed-in user's `SeekerProfile` and filter every query by it.
- Messaging checks participation on every thread access.
- Admin is Django's own (`/admin/`), which registers Profile, SeekerProfile, RecruiterProfile, Company, Skill, JobPosting, SavedSearch,
  Application, ShortlistItem, Thread/Message, Report, plus Django's User admin.

## 7. Profile photos (`profiles/photos.py`)

`POST /api/profile/photo/` never stores the uploaded bytes. It decodes and **re-encodes** the image:

- Accepts JPEG / PNG / WebP only (GIF, BMP, SVG, "renamed" files are rejected), ≤ 5 MB, ≤ 40 M pixels (decompression-bomb guard).
- Applies EXIF rotation, flattens transparency onto white, **centre-crops to 512×512**, saves as JPEG with **no metadata** (phone
  photos otherwise carry GPS coordinates).
- Stored as `media/avatars/<random-uuid>.jpg` (the filename is never user-controlled); replacing/removing deletes the old file.
- The API returns an **absolute** `photoUrl` (the frontend is on another origin). Files are served by Django's dev static handler
  (only while `DEBUG = True`); production would need real storage.

## 8. Seeding demo data

`python manage.py seed_demo` (`jobs/management/commands/seed_demo.py`) builds the demo world from the original prototype's mock data:
7 companies/jobs around Austin with real coordinates, the seeker `maya` (with experience, education, links, a project, a shortlist,
four applications at different stages), the recruiter `rhodes`, five candidate seekers who applied to Rhodes's flagship role, and
three saved searches. It's **idempotent** (get-or-create); `--flush` deletes the demo rows first. Note: the demo candidates have
no experience/education, only `maya` has a full profile.

## 9. Tests

`python manage.py test` — 80 tests, using Django's throwaway in-memory database (your `db.sqlite3` is untouched). Uploads in photo
tests go to a temp directory.

| File | Covers |
|---|---|
| `profiles/tests.py` | Sign-up (both roles, company reuse, all-errors-at-once, no half-created accounts), profile section CRUD and scoping, skills normalisation, coordinate range, recruiter profile, recruiter-facing coordinate rounding |
| `profiles/test_account.py` | Photo pipeline (resize, EXIF/GPS strip, rotation, formats, size, replace/delete, not exposed to recruiters), username/email/password changes |
| `applications/tests.py` | Shortlist add/remove/clear, apply idempotency and note cap, apply-all, tracker scoping, role checks |
| `jobs/tests.py` | Radius filter semantics (known-far dropped, unknown distance kept) |

Not covered by tests yet: messaging, saved searches, the pipeline/stage endpoints, candidate search filters (all were exercised by hand
and in browser runs).

## 10. Gotchas

- **`db.sqlite3` is committed** and changes every time someone signs in. Don't commit it casually — see the merging notes in the root `INFO.md`.
- `Message.read_at` and `Application.next_action` exist but no UI sets or shows them.
- Saved-search `newCount` counts new **accounts** (by `date_joined`) matching the saved skills/location since it was last opened — not
  profile updates, and it ignores the project keyword. It returns 0 until the search has been opened once.
- Skills, companies and usernames are compared case-insensitively on write, but `Skill.name` uniqueness in the database itself is
  case-sensitive — always go through `resolve_skills()`.
- `RecruiterJobSerializer` accepts latitude/longitude but nothing in the UI sets them (no geocoding).
- Sign-up has no email verification, password reset, or rate limiting.
