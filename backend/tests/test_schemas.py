import pytest
from pydantic import ValidationError

from app.schemas import AssistantIn, DraftIn, GraphEdgeIn, InvestigationIn, SnapshotIn

NOW = "2026-10-28T00:00:00Z"


def inv(**kw):
    base = dict(id="case-a-a1", caseId="case-a", attempt=1, mode="beginner", status="active", startedAt=NOW, updatedAt=NOW)
    return {**base, **kw}


def test_minimal_investigation_is_valid():
    assert InvestigationIn(**inv()).status == "active"


@pytest.mark.parametrize("bad", [dict(mode="godmode"), dict(status="done"), dict(attempt=0), dict(id="bad id!"), dict(elapsedSec=-1)])
def test_rejects_bad_investigation_fields(bad):
    with pytest.raises(ValidationError):
        InvestigationIn(**inv(**bad))


def test_draft_limits():
    with pytest.raises(ValidationError):
        DraftIn(conclusion="x" * 4001)
    with pytest.raises(ValidationError):
        DraftIn(confidence=101)


def test_edge_type_is_restricted():
    with pytest.raises(ValidationError):
        GraphEdgeIn(id="e", source="a", target="b", type="owns")


def test_unknown_fields_are_ignored():
    assert not hasattr(InvestigationIn(**inv(evil="x")), "evil")


def test_snapshot_rejects_huge_collections_and_bad_achievements():
    with pytest.raises(ValidationError):
        SnapshotIn(xp=1, investigations=[inv()] * 41)
    with pytest.raises(ValidationError):
        SnapshotIn(xp=1, achievements={"": NOW})
    with pytest.raises(ValidationError):
        SnapshotIn(xp=-5)


def test_assistant_never_accepts_hint_actions():
    for action in ("subtle_hint", "stronger_hint"):
        with pytest.raises(ValidationError):
            AssistantIn(caseId="case-phantom-login", action=action)
