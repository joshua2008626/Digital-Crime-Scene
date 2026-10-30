from fastapi import APIRouter, HTTPException

from ..services.cases import case_summary, get_case, load_cases

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("")
def list_cases() -> list[dict]:
    return [case_summary(c) for c in load_cases()]


@router.get("/{case_id}")
def read_case(case_id: str) -> dict:
    """Public case file. Contains evidence the learner will see, and NO solution data."""
    case = get_case(case_id)
    if case is None:
        raise HTTPException(404, "Case not found")
    return case
