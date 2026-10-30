# PROJECT STATUS — DIGITAL CRIME SCENE

> Source of truth for continuation. Update after every phase.

## Environment (build sandbox)
- Node 22, npm 10, Python 3.13, zip available
- Working dir: /home/claude/digital-crime-scene

## Key decisions
- Frontend is **offline-first**: all case content ships in `frontend/src/data/cases/*.ts`; scoring engine runs deterministically in the browser (`frontend/src/utils/scoring.ts`). Progress persists in `localStorage`.
- Backend (FastAPI) mirrors the case data as JSON (`backend/app/case_data/*.json`), provides persistence, the same deterministic scoring, and the optional LLM hint endpoint. The frontend works without the backend and syncs when the API is reachable.
- Case JSON is generated from a single source of truth (frontend TS) via `scripts/export_cases.mjs` so both sides never drift.
- React Flow v11 (`reactflow` package), React 18, Tailwind 3, Vite 5.
- GitHub Pages: `HashRouter` + `base: './'` so no server rewrites are needed.

## Phase checklist
- [x] PHASE 1-12 written (see manifest). Packaging: ZIP built and listed (see log). Verification is PARTIAL because package registries are blocked in the build sandbox.

## BLOCKER (2026-10-28)
Sandbox egress proxy returns 403 for registry.npmjs.org and pypi.org (policy denial, not retried / not bypassed).
=> `npm install`, `pip install`, Vite build, Vitest, Pytest, Playwright CANNOT be run in the build sandbox.
Locally available: tsx, typescript 6.0.3, global react 19, playwright 1.63, pydantic 2, starlette, uvicorn.
=> Pure-TS engine (cases + scoring) is verified with `tsx`; UI/backend are written but UNVERIFIED until run on a networked machine.

## Verification log (only real results)
- npm install (frontend): FAILED — 403 from proxy (registry blocked)
- pip install (backend): FAILED — 403 from proxy (pypi blocked)
- `tsx scripts/verify-cases.ts` (frontend): PASSED 111/111 (4 cases: data consistency, fictional-only scan, model/partial/wrong playthroughs, determinism, XP anti-farming, hint penalties, hedging, validator negative tests). Real run.

- `tsx scripts/verify-cases.ts`: PASSED 112/112 (re-run after fixing a real content bug: Locked Office objective l-o4 was complete from free start evidence; validator rule added).
- `tsx scripts/verify-engine.ts`: PASSED 218/218 (phishing + log labs, CSV-injection safety, ranks, achievements, offline assistant incl. no-spoiler battery + graduated hints, pure reducer incl. XP anti-farming/replay/double-submit/timed/hints, persistence incl. hostile input). Real run. First run had 6 failures: 5 were wrong test expectations (my miscount; compare echoing user-chosen labels), 1 was the real content bug above.
- Strict `tsc` (v7.0.2 locally; project pins ~5.6) over src/ non-React + scripts + fixtures, noUnusedLocals/Parameters: PASSED (found+fixed 1 real error: Entity.kind lacked 'asset').
- Frontend UI (final): shim-based strict `tsc` over all src incl. pages/components/services: PASSED (shims are hand-written stubs; real react/router/recharts/reactflow types NOT checked).
- SSR smoke render (esbuild bundle + react-dom/server, stubbed router/motion/lucide/recharts/reactflow): all 10 pages + layout + every workspace panel for all 4 cases rendered without errors or 'undefined/NaN' text. NOT a browser run; no effects, layout or CSS verified.
- `tests/unit/*` (53 tests) run under `scripts/mini-vitest.ts` stand-in: PASSED 53/53. Real Vitest NOT run. `tests/ui/*` (RTL) and `e2e/*` (Playwright) written, NOT run.
- Backend: all files `py_compile` OK. Pure tests (rate limiter, schemas, solution-free export, assistant prompt safety) run under a stub harness (pytest/fastapi/sqlalchemy/httpx/pydantic-settings stubbed): 25/25. `tests/test_api.py` (FastAPI TestClient, SQLAlchemy models, sync, auth, CORS) NOT RUN; backend app never started.
- NOT RUN (blocked): npm install, vite build, real vitest, playwright, real-library type-check, tailwind build (CSS classes such as bg-ink-950 depend on tailwind.config.js being correct), pytest, uvicorn, alembic migration, docker build, GitHub Actions.

## Known risks to check first on a networked machine
1. `npm run typecheck` / `npm run build`: shim type-check may differ from real @types (e.g. React Flow prop types, Recharts props). Fix any small errors.
2. Tailwind: confirm custom colour names (ink, cyan2, violet2, alert, verified, warn) generate classes used in CSS `@apply`.
3. `pip install -r backend/requirements.txt` then `pytest` (ORM relationship/JSON column behaviour untested).
4. `lucide-react` icon names (TriangleAlert, Loader2, AlertTriangle) exist in ^0.460.

## Files done (manifest)
- frontend: configs, src/{types,utils,data,store,services,hooks,components,layouts,pages,styles}, tests/{unit,ui,fixtures}, e2e, scripts/{verify-cases,verify-engine,export-cases,mini-vitest,harness}.ts, Dockerfile, nginx.conf, playwright.config.ts
- backend: app/{config,db,models,schemas,security,ratelimit,main,seed}.py, routers, services, case_data/public_cases.json, migrations (Alembic 0001), tests, Dockerfile, requirements.txt
- root: README.md, LICENSE, docker-compose.yml, .env.example, .github/workflows/{ci,pages}.yml, docs/{ARCHITECTURE,API,TESTING,DEPLOYMENT,USER_GUIDE}.md, scripts/package.ps1
