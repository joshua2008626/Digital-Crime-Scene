from fastapi import APIRouter

from ..config import get_settings

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health() -> dict[str, object]:
    s = get_settings()
    return {"status": "ok", "llm": s.llm_enabled, "version": "1.0.0"}
