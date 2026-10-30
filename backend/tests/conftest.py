import os

# Use an isolated in-memory database and no LLM for the whole test session (set before the app is imported).
os.environ.setdefault("DCS_DATABASE_URL", "sqlite://")
os.environ.setdefault("DCS_LLM_BASE_URL", "")
os.environ.setdefault("DCS_LLM_API_KEY", "")
os.environ.setdefault("DCS_LLM_MODEL", "")
os.environ.setdefault("DCS_RATE_LIMIT_PER_MINUTE", "100000")

import pytest  # noqa: E402


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.db import Base, engine
    from app.main import create_app
    from app.routers import guests

    Base.metadata.drop_all(bind=engine)
    guests._create_limiter._hits.clear()
    with TestClient(create_app()) as c:  # lifespan creates the tables
        yield c


@pytest.fixture()
def guest(client):
    r = client.post("/api/guests")
    assert r.status_code == 201
    body = r.json()
    return {"id": body["guestId"], "headers": {"Authorization": f"Bearer {body['token']}"}}


@pytest.fixture
def anyio_backend():
    return "asyncio"
