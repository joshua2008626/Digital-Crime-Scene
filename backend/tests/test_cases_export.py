import json

from app.services.cases import DATA, get_case, load_cases

FORBIDDEN = ["relevance", "insight", "redHerring", "correctVerdict", "keyEvidence", "supportingEvidenceIds", "reasoningPoints", "credit", "idealConfidence"]


def test_four_cases_are_exported():
    assert len(load_cases()) >= 4
    assert get_case("case-phantom-login") is not None


def test_export_contains_no_solution_data():
    raw = DATA.read_text(encoding="utf-8")
    for key in FORBIDDEN:
        assert f'"{key}"' not in raw, key
    for case in json.loads(raw)["cases"]:
        for option in case["verdictOptions"]:
            assert set(option) == {"id", "label"}  # no credit / feedback that would reveal the answer
        for ev in case["evidence"]:
            assert "relevance" not in ev and "insight" not in ev


def test_unknown_case_is_none():
    assert get_case("nope") is None
