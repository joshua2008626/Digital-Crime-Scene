"""API tests. Require fastapi, sqlalchemy and httpx (see requirements.txt)."""
NOW = "2026-10-28T00:00:00Z"


def snapshot(xp=50):
    inv = {
        "id": "case-phantom-login-a1", "caseId": "case-phantom-login", "attempt": 1, "mode": "beginner", "status": "active",
        "startedAt": NOW, "updatedAt": NOW, "elapsedSec": 90, "inspected": ["P-01", "P-02"], "collected": ["P-01"],
        "notes": [{"id": "n1", "text": "<script>alert(1)</script> stays inert text", "evidenceId": "P-01", "createdAt": NOW}],
        "hintsUsed": [{"hintId": "p-h1-1", "at": NOW}],
        "graph": {"nodes": [{"id": "P-01", "x": 1, "y": 2}], "edges": []},
        "draft": {"verdictId": "", "conclusion": "draft", "confidence": 40},
    }
    return {"name": "Tester", "xp": xp, "investigations": [inv], "reports": [], "achievements": {"first_case": NOW}, "extras": {"caseXp": {"case-phantom-login": 80}}}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_cases_list_and_detail_have_no_solutions(client):
    lst = client.get("/api/cases").json()
    assert len(lst) >= 4
    detail = client.get(f"/api/cases/{lst[0]['id']}").json()
    assert "solution" not in detail
    assert all("relevance" not in e for e in detail["evidence"])
    assert client.get("/api/cases/unknown").status_code == 404


def test_progress_requires_a_token(client, guest):
    assert client.get(f"/api/guests/{guest['id']}/progress").status_code == 401
    assert client.get(f"/api/guests/{guest['id']}/progress", headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_other_guests_cannot_read_my_data(client, guest):
    other = client.post("/api/guests").json()
    r = client.get(f"/api/guests/{guest['id']}/progress", headers={"Authorization": f"Bearer {other['token']}"})
    assert r.status_code == 401


def test_unknown_guest_looks_the_same_as_wrong_token(client):
    r = client.get("/api/guests/00000000-0000-4000-8000-000000000000/progress", headers={"Authorization": "Bearer x"})
    assert r.status_code == 401


def test_progress_round_trip(client, guest):
    assert client.put(f"/api/guests/{guest['id']}/progress", json=snapshot(), headers=guest["headers"]).status_code == 204
    got = client.get(f"/api/guests/{guest['id']}/progress", headers=guest["headers"]).json()
    assert got["xp"] == 50 and got["name"] == "Tester"
    inv = got["investigations"][0]
    assert sorted(inv["inspected"]) == ["P-01", "P-02"] and inv["collected"] == ["P-01"]
    assert inv["notes"][0]["text"].startswith("<script>")  # stored verbatim as data, rendered as text by the UI
    assert got["achievements"] == {"first_case": NOW}
    assert got["extras"] == {"caseXp": {"case-phantom-login": 80}}


def test_put_replaces_previous_state(client, guest):
    client.put(f"/api/guests/{guest['id']}/progress", json=snapshot(10), headers=guest["headers"])
    client.put(f"/api/guests/{guest['id']}/progress", json={"name": "", "xp": 0, "investigations": [], "reports": [], "achievements": {}}, headers=guest["headers"])
    got = client.get(f"/api/guests/{guest['id']}/progress", headers=guest["headers"]).json()
    assert got["investigations"] == [] and got["xp"] == 0


def test_invalid_snapshot_is_rejected(client, guest):
    bad = snapshot()
    bad["investigations"][0]["mode"] = "godmode"
    r = client.put(f"/api/guests/{guest['id']}/progress", json=bad, headers=guest["headers"])
    assert r.status_code == 422


def test_oversized_snapshot_is_rejected(client, guest):
    big = snapshot()
    big["name"] = "x" * 500_000
    r = client.put(f"/api/guests/{guest['id']}/progress", content=__import__("json").dumps(big), headers={**guest["headers"], "Content-Type": "application/json"})
    assert r.status_code == 413


def test_delete_guest(client, guest):
    assert client.delete(f"/api/guests/{guest['id']}", headers=guest["headers"]).status_code == 204
    assert client.get(f"/api/guests/{guest['id']}/progress", headers=guest["headers"]).status_code == 401


def test_assistant_falls_back_when_llm_not_configured(client):
    r = client.post("/api/assistant", json={"caseId": "case-phantom-login", "action": "next_steps", "inspected": ["P-01"]})
    assert r.status_code == 503 and r.json()["fallback"] is True


def test_assistant_rejects_hint_actions(client):
    r = client.post("/api/assistant", json={"caseId": "case-phantom-login", "action": "subtle_hint"})
    assert r.status_code == 422


def test_cors_allows_only_configured_origins(client):
    ok = client.options("/api/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    bad = client.options("/api/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
