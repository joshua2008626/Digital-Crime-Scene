"""Small in-memory sliding-window rate limiter (per process). Use a shared store if you run many workers."""
import time
from collections import defaultdict, deque
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SlidingWindow:
    def __init__(self, limit: int, window_seconds: float = 60.0, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit = limit
        self.window = window_seconds
        self.clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = self.clock()
        q = self._hits[key]
        while q and now - q[0] >= self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        if len(self._hits) > 10_000:  # bound memory under many distinct clients
            for k in [k for k, v in self._hits.items() if not v][:5000]:
                del self._hits[k]
        return True


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limiter: SlidingWindow) -> None:  # noqa: ANN001
        super().__init__(app)
        self.limiter = limiter

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        if request.url.path != "/api/health" and not self.limiter.allow(client_key(request)):
            return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": "60"})
        return await call_next(request)
