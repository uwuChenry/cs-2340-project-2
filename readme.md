# Roster (CareerConnect)

A two-sided job marketplace: job seekers build profiles, search and apply; recruiters post roles and run a pipeline.
Django + DRF backend (`backend/`) and a Next.js frontend (`frontend/`).

**Start with [`INFO.md`](INFO.md)** — how to run it, how it fits together, the status of all 24 user stories, and merge notes.
Then [`backend/INFO.md`](backend/INFO.md) (data model, API, privacy rules) and [`frontend/INFO.md`](frontend/INFO.md) (routes, state, components).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd frontend
npm install
```

## Run

Backend:

```bash
source .venv/bin/activate
python backend/manage.py migrate
python backend/manage.py runserver
```

Frontend, in a second terminal:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000.
