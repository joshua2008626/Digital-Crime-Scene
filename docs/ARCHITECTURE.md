# Architecture

## Principles
1. **Offline-first.** All case content ships in the frontend (`frontend/src/data`). The deterministic scoring engine (`utils/scoring.ts`) runs in the browser. The backend is optional.
2. **Transparent scoring.** The rubric (evidence, reasoning, verdict, support, uncertainty, defence, hints; weights sum to 100) is pure code. The LLM never scores, never hints, and never sees solutions.
3. **Safe by construction.** Fictional data only (a validator enforces `.example` domains and RFC 5737/private IPs). Evidence is rendered as text, never HTML. Suspicious links are defanged text. A strict CSP is injected into production builds. CSV export neutralises formula injection.

## Frontend (`frontend/src`)
| Folder | Role |
|---|---|
| `types` | Domain types (cases, evidence, investigations, reports) |
| `data` | Cases, phishing emails, 70 log entries, glossary, achievements |
| `utils` | Pure logic: scoring, labs grading, log filtering, offline assistant, validation, export, progress/ranks |
| `store` | `reducer.ts` (pure, fully testable), `persist.ts` (hostile-input-safe localStorage), `AppContext.tsx` |
| `services` | Optional backend client, assistant routing, cloud backup |
| `components`, `layouts`, `pages` | UI (React Router `HashRouter`, Tailwind, Framer Motion, Recharts, React Flow) |

State flows one way: pages dispatch actions → the pure reducer validates/sanitises (length clamps, id filtering) → state is saved with a debounce plus a flush on `pagehide`.

### Scoring and XP anti-farming
Duplicate submission hash → 0 XP; replays award only the improvement over the best XP for that case; a double `SUBMIT` is a no-op; labs reward only improvement over their best; achievements award 25 XP once. A wrong verdict is capped (verdict ratio < 0.5 → max 64). Hedged language ("may", "not proven") is not penalised as an unsupported assumption.

### Assistant
`utils/assistant.ts` is a deterministic, rule-based assistant grounded only in evidence the learner has opened. Hints are pre-authored, released one stage at a time and optionally cost score. If a backend LLM is enabled, only non-hint explanation actions are routed to it; any failure returns to the offline assistant.

## Backend (`backend/app`)
FastAPI + Pydantic + SQLAlchemy 2 (SQLite by default, PostgreSQL via `DCS_DATABASE_URL`) + Alembic.
- `routers`: health, cases (public, **solution-free**), guests (create, progress sync, delete), assistant
- `security.py`: random bearer token per guest, only its SHA-256 stored, constant-time compare, identical 401 for unknown guest or wrong token
- `ratelimit.py`: per-IP sliding window (in-memory; use a shared store for multi-worker deployments)
- `services/assistant.py`: builds prompts from opened evidence only; treats evidence as data; output length-limited; failures → `fallback`
- The server **stores** reports computed by the browser and does not re-score them. It is a backup, not an authority; do not build leaderboards on it without porting the scoring engine.

## Data flow for the optional backend
Browser state ⇄ `services/sync.ts` ⇄ `PUT/GET /api/guests/{id}/progress`. Credentials (guest id + token) live in `localStorage` key `dcs.sync.v1`.
