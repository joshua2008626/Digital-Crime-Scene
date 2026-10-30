"""Pydantic models for the public API. All strings are length-limited; unknown fields are ignored."""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Id = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.:#\-]+$")
Iso = Field(min_length=10, max_length=40)


class Loose(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=False)


class GuestCreated(Loose):
    guestId: str
    token: str


class NoteIn(Loose):
    id: str = Id
    text: str = Field(max_length=2000)
    evidenceId: str | None = Field(default=None, max_length=40)
    createdAt: str = Iso


class HintUseIn(Loose):
    hintId: str = Field(min_length=1, max_length=60)
    at: str = Iso


class GraphNodeIn(Loose):
    id: str = Field(min_length=1, max_length=40)
    x: float = Field(ge=-100000, le=100000)
    y: float = Field(ge=-100000, le=100000)


class GraphEdgeIn(Loose):
    id: str = Field(min_length=1, max_length=80)
    source: str = Field(min_length=1, max_length=40)
    target: str = Field(min_length=1, max_length=40)
    type: Literal["supports", "contradicts", "precedes", "related"]
    label: str = Field(default="", max_length=60)


class GraphIn(Loose):
    nodes: list[GraphNodeIn] = Field(default_factory=list, max_length=60)
    edges: list[GraphEdgeIn] = Field(default_factory=list, max_length=200)


class DraftIn(Loose):
    verdictId: str = Field(default="", max_length=60)
    conclusion: str = Field(default="", max_length=4000)
    supportingEvidenceIds: list[str] = Field(default_factory=list, max_length=60)
    timeline: list[str] = Field(default_factory=list, max_length=60)
    alternatives: str = Field(default="", max_length=3000)
    confidence: int = Field(default=50, ge=0, le=100)
    actionIds: list[str] = Field(default_factory=list, max_length=60)
    actionNotes: str = Field(default="", max_length=2000)


class InvestigationIn(Loose):
    id: str = Id
    caseId: str = Field(min_length=1, max_length=60)
    attempt: int = Field(ge=1, le=1000)
    mode: Literal["beginner", "intermediate", "advanced"]
    status: Literal["active", "completed"]
    timed: bool = False
    timeLimitSec: int = Field(default=0, ge=0, le=86400)
    hintPenalty: bool = True
    startedAt: str = Iso
    updatedAt: str = Iso
    elapsedSec: int = Field(default=0, ge=0, le=10_000_000)
    inspected: list[str] = Field(default_factory=list, max_length=100)
    collected: list[str] = Field(default_factory=list, max_length=100)
    notes: list[NoteIn] = Field(default_factory=list, max_length=100)
    hintsUsed: list[HintUseIn] = Field(default_factory=list, max_length=30)
    graph: GraphIn = Field(default_factory=GraphIn)
    draft: DraftIn = Field(default_factory=DraftIn)
    reportId: str | None = Field(default=None, max_length=80)


class ReportIn(Loose):
    """The browser computes reports; the server stores them verbatim (bounded) and does not re-score."""

    id: str = Id
    caseId: str = Field(min_length=1, max_length=60)
    investigationId: str = Id
    score: int = Field(ge=0, le=100)
    grade: str = Field(max_length=4)
    xpEarned: int = Field(ge=0, le=100000)
    model_config = ConfigDict(extra="allow")


class SnapshotIn(Loose):
    name: str = Field(default="", max_length=40)
    xp: int = Field(ge=0, le=10_000_000)
    investigations: list[InvestigationIn] = Field(default_factory=list, max_length=40)
    reports: list[ReportIn] = Field(default_factory=list, max_length=200)
    achievements: dict[str, str] = Field(default_factory=dict, max_length=60)
    # Lab results, per-case XP bests and the activity feed: opaque to the server, bounded by the body-size limit.
    extras: dict[str, Any] = Field(default_factory=dict, max_length=8)

    @field_validator("achievements")
    @classmethod
    def _ach(cls, v: dict[str, str]) -> dict[str, str]:
        for k, t in v.items():
            if not (1 <= len(k) <= 40 and 10 <= len(t) <= 40):
                raise ValueError("invalid achievement entry")
        return v


class SnapshotOut(SnapshotIn):
    updatedAt: str


AssistAction = Literal["explain_evidence", "inconsistencies", "next_steps", "explain_term", "compare_hypotheses", "review_report"]


class AssistantIn(Loose):
    caseId: str = Field(min_length=1, max_length=60)
    action: AssistAction  # hint actions are intentionally not accepted: hints are offline, authored and charged
    evidenceId: str | None = Field(default=None, max_length=40)
    term: str | None = Field(default=None, max_length=60)
    hypothesisA: str | None = Field(default=None, max_length=60)
    hypothesisB: str | None = Field(default=None, max_length=60)
    inspected: list[str] = Field(default_factory=list, max_length=100)
    collected: list[str] = Field(default_factory=list, max_length=100)


class AssistantOut(BaseModel):
    text: str
    bullets: list[str] = Field(default_factory=list)
    fallback: bool = False
