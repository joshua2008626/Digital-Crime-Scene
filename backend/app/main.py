"""Digital Crime Scene API. Optional: the web app is fully functional without it."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from .config import get_settings
from .db import init_db
from .ratelimit import RateLimitMiddleware, SlidingWindow
from .routers import assistant, cases, guests, health


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Digital Crime Scene API", version="1.0.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

    app.add_middleware(RateLimitMiddleware, limiter=SlidingWindow(settings.rate_limit_per_minute))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        allow_credentials=False,
        max_age=600,
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next) -> Response:  # noqa: ANN001
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    for r in (health.router, cases.router, guests.router, assistant.router):
        app.include_router(r)
    return app


app = create_app()
