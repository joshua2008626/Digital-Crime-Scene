# Testing

| Layer | Tool | Command | Covers |
|---|---|---|---|
| Content + engine | `tsx` scripts | `npm run verify` | Case consistency, fictional-data scan, model/partial/wrong playthroughs, determinism, XP anti-farming, labs, CSV safety, assistant no-spoiler battery, reducer, persistence |
| Unit | Vitest | `npm test` | `tests/unit/*` (scoring, reducer, persistence, labs/CSV) |
| Components | Vitest + React Testing Library | `npm test` | `tests/ui/*` (pages render, tabs keyboard nav, dialog Escape, no clickable suspicious links) |
| E2E | Playwright | `npm run e2e` | `e2e/*` desktop + mobile: start case, persistence across reload, no horizontal scroll |
| Backend | Pytest | `cd backend; pytest` | Schemas, rate limiter, solution-free export, assistant prompt safety, API auth/sync/validation/CORS |

`frontend/scripts/mini-vitest.ts` is a tiny stand-in runner used only where `npm install` is impossible; `npm test` (real Vitest) is the authority.

## Adding a case
1. Create `src/data/cases/<slug>.ts` (use `helpers.ts`), register it in `cases/index.ts`.
2. Add a model/partial/wrong answer set in `tests/fixtures/answers.ts`.
3. `npm run verify` — the validator checks references, fictional data, objective reachability, model score ≥ 90 and wrong answer ≤ 35.
4. `npm run export:cases` to refresh the backend JSON.
