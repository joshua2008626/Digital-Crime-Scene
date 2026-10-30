# API

Base URL: `VITE_API_URL` (default `http://localhost:8000`). Interactive docs: `/api/docs`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | none | `{status, llm, version}` |
| GET | `/api/cases` | none | Case summaries |
| GET | `/api/cases/{id}` | none | Public case file: evidence the learner sees. **No solution data.** 404 if unknown |
| POST | `/api/guests` | none (10/min/IP) | Creates a guest. Returns `{guestId, token}`. The token is shown once |
| GET | `/api/guests/{id}/progress` | Bearer | Returns the stored snapshot |
| PUT | `/api/guests/{id}/progress` | Bearer | Replaces the snapshot. 204, 413 if > `DCS_MAX_SNAPSHOT_BYTES` (400 kB), 422 if invalid |
| DELETE | `/api/guests/{id}` | Bearer | Deletes the guest and all of its data |
| POST | `/api/assistant` | none (20/min/IP) | LLM explanation. 503 `{fallback:true}` if no LLM is configured or it fails. Hint actions are rejected (422) |

Errors: 401 (missing/invalid token, same for unknown guest), 413, 422, 429 (with `Retry-After`).

## Snapshot shape
```json
{ "name": "", "xp": 0,
  "investigations": [{ "id": "case-phantom-login-a1", "caseId": "case-phantom-login", "attempt": 1,
    "mode": "beginner", "status": "active", "startedAt": "...", "updatedAt": "...", "elapsedSec": 0,
    "inspected": [], "collected": [], "notes": [], "hintsUsed": [],
    "graph": {"nodes": [], "edges": []}, "draft": {} }],
  "reports": [], "achievements": {"first_case": "2026-10-28T00:00:00Z"},
  "extras": {"caseXp": {}, "phishing": {}, "logLab": {}, "activity": []} }
```
Unknown fields are ignored. Strings and arrays are length-limited (see `backend/app/schemas.py`).

## Assistant request
```json
{ "caseId": "case-phantom-login", "action": "next_steps", "inspected": ["P-01"], "collected": [] }
```
Actions: `explain_evidence`, `inconsistencies`, `next_steps`, `explain_term`, `compare_hypotheses`, `review_report`.
