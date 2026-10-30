from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ..config import get_settings
from ..ratelimit import SlidingWindow, client_key
from ..schemas import AssistantIn, AssistantOut
from ..services import assistant as svc

router = APIRouter(prefix="/api/assistant", tags=["assistant"])
_limiter: SlidingWindow | None = None


def limiter() -> SlidingWindow:
    global _limiter
    if _limiter is None:
        _limiter = SlidingWindow(limit=get_settings().assistant_rate_limit_per_minute, window_seconds=60)
    return _limiter


@router.post("", response_model=AssistantOut)
async def assistant(body: AssistantIn, request: Request):
    """LLM-backed explanation. Returns 503 {fallback: true} when no LLM is configured, so the browser
    uses its offline assistant. Never scores, never hints, never sees solution data."""
    settings = get_settings()
    if not limiter().allow(client_key(request)):
        raise HTTPException(429, "Too many assistant requests", headers={"Retry-After": "60"})
    if not settings.llm_enabled:
        return JSONResponse({"text": "", "bullets": [], "fallback": True}, status_code=503)
    out = await svc.ask(body, settings)
    if out.fallback:
        return JSONResponse(out.model_dump(), status_code=503)
    return out
