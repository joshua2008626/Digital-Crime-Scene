# Digital Crime Scene

> **Every click leaves a trace.**

A cybersecurity investigation simulator for learning digital forensics. Work fictional incidents like an analyst: inspect emails, logs and file metadata, collect evidence, link it in an evidence graph, reconstruct the timeline, and defend a verdict. Scoring is **deterministic and fully explained** — no AI ever decides your score.

**Everything is fictional and simulated.** No real scanning, malware, credential harvesting or network activity. Suspicious links are shown defanged as plain text and are never clickable.

## What is inside

- **4 complete cases**: The Phantom Login (beginner), The Missing Blueprint (intermediate), The Locked Office (advanced), The Insider Paradox (advanced)
- Investigation workspace, evidence graph (React Flow + an accessible list editor), Phishing Lab, Log Lab, offline-first assistant, verdict reports, profile and achievements
- Offline-first: the whole game runs in the browser; progress is saved in `localStorage`
- Optional FastAPI backend for backup/restore and an optional LLM explanation proxy (with a full offline fallback)

## Quick start on Windows 11 (PowerShell)

Prerequisites: [Node.js 20+](https://nodejs.org) and, for the optional backend, [Python 3.11+](https://www.python.org).

```powershell
# 1) Frontend
cd frontend
npm install
Copy-Item ..\.env.example .env      # optional; set VITE_API_URL= (empty) to run fully offline
npm run dev                         # http://localhost:5173
```

Optional backend (second PowerShell window):

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1        # if blocked: Set-ExecutionPolicy -Scope Process Bypass
pip install -r requirements.txt
Copy-Item ..\.env.example .env
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/api/docs
```

Without the backend the app works exactly the same; the "Back up to server" buttons simply do not appear when `VITE_API_URL` is empty.

## Commands

| Where | Command | What it does |
|---|---|---|
| `frontend` | `npm run dev` | Dev server |
| `frontend` | `npm run build` | Type-check and production build to `dist/` |
| `frontend` | `npm run typecheck` | `tsc --noEmit` |
| `frontend` | `npm test` | Vitest unit + React Testing Library tests |
| `frontend` | `npm run verify` | Content + engine verification with `tsx` (no browser needed) |
| `frontend` | `npm run e2e` | Playwright end-to-end (installs: `npx playwright install chromium`) |
| `frontend` | `npm run export:cases` | Regenerates the solution-free case JSON used by the backend |
| `backend` | `pytest` | Backend tests |
| `backend` | `python -m app.seed` | Creates tables and a demo guest |
| repo root | `docker compose up --build` | Web on :8080, API on :8000 |

## Deploying

- **GitHub Pages** (static only): push to GitHub, then Settings → Pages → Source: *GitHub Actions*. The included `pages.yml` builds with no backend. The app uses `HashRouter` and relative asset paths, so it works under `https://<user>.github.io/<repo>/`. **GitHub Pages cannot run the Python backend**; on Pages the game runs in offline mode, which is fully functional.
- **Full stack**: use `docker-compose.yml`, or host the frontend statically (Netlify, Cloudflare Pages, nginx) and the API on any container host. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

[ARCHITECTURE](docs/ARCHITECTURE.md) · [API](docs/API.md) · [TESTING](docs/TESTING.md) · [DEPLOYMENT](docs/DEPLOYMENT.md) · [USER GUIDE](docs/USER_GUIDE.md) · [PROJECT STATUS](PROJECT_STATUS.md)

## Verification status

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for exactly which checks were run in the build environment and which were not. In short: the scoring engine, case content, reducer and persistence are verified with real runs; `npm install`, `vite build`, Vitest, Playwright and Pytest must be run on a networked machine (the build sandbox blocked package registries).

## License

MIT — see [LICENSE](LICENSE).
