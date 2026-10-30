# Deployment

## A. GitHub Pages (static, offline mode)
1. Push the repo to GitHub (default branch `main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. `.github/workflows/pages.yml` builds `frontend/` with `VITE_API_URL=""` and publishes `dist/`.
The app uses `HashRouter` and `base: './'`, so deep links and repo sub-paths work without server rewrites. Pages is static hosting: **it cannot run the FastAPI backend**. Everything except optional cloud backup and the LLM proxy works.

## B. Docker Compose (full stack)
```powershell
docker compose up --build
```
Web: http://localhost:8080 · API: http://localhost:8000/api/docs. SQLite lives in the `dcs-data` volume. Set `DCS_LLM_*` in your shell or an `.env` next to `docker-compose.yml` to enable the optional LLM.

## C. Separate hosting
- Frontend: any static host. Build with `VITE_API_URL=https://api.example.org npm run build`. The build injects a CSP whose `connect-src` allows only that origin.
- Backend: run `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind HTTPS. Set `DCS_CORS_ORIGINS` to your frontend origin(s).
- PostgreSQL: `pip install "psycopg[binary]"` and `DCS_DATABASE_URL=postgresql+psycopg://user:pass@host/db`.

## Production notes
- The LLM key exists only in backend environment variables.
- The in-memory rate limiter is per process; use a gateway or shared store when running several workers.
- Add `frame-ancestors`/HSTS headers at your reverse proxy (meta CSP cannot set `frame-ancestors`).
