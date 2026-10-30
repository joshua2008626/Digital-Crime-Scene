"""Stores and rebuilds a guest's progress snapshot in normalised tables."""
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from .. import models as m
from ..schemas import DraftIn, GraphIn, InvestigationIn, ReportIn, SnapshotIn, SnapshotOut


def save_snapshot(db: Session, guest: m.Guest, snap: SnapshotIn) -> None:
    guest.display_name = snap.name
    guest.xp = snap.xp
    guest.extras = snap.extras
    guest.updated_at = datetime.now(timezone.utc)

    # Replace-all keeps the server a faithful copy of the browser's state (the browser is the source of truth).
    db.execute(delete(m.InvestigationSession).where(m.InvestigationSession.guest_id == guest.id))
    db.execute(delete(m.Achievement).where(m.Achievement.guest_id == guest.id))
    db.flush()

    by_client: dict[str, m.InvestigationSession] = {}
    for inv in snap.investigations:
        row = m.InvestigationSession(
            guest_id=guest.id, client_id=inv.id, case_id=inv.caseId, attempt=inv.attempt, mode=inv.mode,
            status=inv.status, elapsed_sec=inv.elapsedSec, started_at=inv.startedAt, updated_at=inv.updatedAt,
            extra={"timed": inv.timed, "timeLimitSec": inv.timeLimitSec, "hintPenalty": inv.hintPenalty, "reportId": inv.reportId},
        )
        collected = set(inv.collected)
        for ev in dict.fromkeys([*inv.inspected, *inv.collected]):
            row.collected.append(m.CollectedEvidence(evidence_id=ev, inspected_only=0 if ev in collected else 1))
        row.notes = [m.Note(client_id=n.id, text=n.text, evidence_id=n.evidenceId, created_at=n.createdAt) for n in inv.notes]
        row.hint_requests = [m.HintRequest(hint_id=h.hintId, at=h.at) for h in inv.hintsUsed]
        row.graph = m.GraphSnapshot(data=inv.graph.model_dump())
        row.verdict = m.Verdict(verdict_id=inv.draft.verdictId, confidence=inv.draft.confidence, draft=inv.draft.model_dump())
        db.add(row)
        by_client[inv.id] = row
    db.flush()

    for rep in snap.reports:
        parent = by_client.get(rep.investigationId)
        if parent is None:
            continue  # a report must belong to a synced investigation
        db.add(m.Report(session_id=parent.id, client_id=rep.id, score=rep.score, grade=rep.grade, xp_earned=rep.xpEarned, data=rep.model_dump()))
    for aid, at in snap.achievements.items():
        db.add(m.Achievement(guest_id=guest.id, achievement_id=aid, unlocked_at=at))
    db.commit()


def load_snapshot(db: Session, guest: m.Guest) -> SnapshotOut:
    invs: list[InvestigationIn] = []
    reports: list[ReportIn] = []
    for s in guest.sessions:
        collected = [c.evidence_id for c in s.collected if not c.inspected_only]
        inspected = [c.evidence_id for c in s.collected]
        invs.append(InvestigationIn(
            id=s.client_id, caseId=s.case_id, attempt=s.attempt, mode=s.mode, status=s.status,  # type: ignore[arg-type]
            timed=bool(s.extra.get("timed", False)), timeLimitSec=int(s.extra.get("timeLimitSec", 0)),
            hintPenalty=bool(s.extra.get("hintPenalty", True)), startedAt=s.started_at, updatedAt=s.updated_at,
            elapsedSec=s.elapsed_sec, inspected=inspected, collected=collected,
            notes=[{"id": n.client_id, "text": n.text, "evidenceId": n.evidence_id, "createdAt": n.created_at} for n in s.notes],  # type: ignore[misc]
            hintsUsed=[{"hintId": h.hint_id, "at": h.at} for h in s.hint_requests],  # type: ignore[misc]
            graph=GraphIn(**(s.graph.data if s.graph else {})), draft=DraftIn(**(s.verdict.draft if s.verdict else {})),
            reportId=s.extra.get("reportId"),
        ))
        reports.extend(ReportIn(**r.data) for r in s.reports)
    return SnapshotOut(
        name=guest.display_name, xp=guest.xp, investigations=invs, reports=reports,
        achievements={a.achievement_id: a.unlocked_at for a in guest.achievements},
        extras=guest.extras or {},
        updatedAt=guest.updated_at.isoformat() if guest.updated_at else "",
    )
