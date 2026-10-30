from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Guest
from ..ratelimit import SlidingWindow, client_key
from ..schemas import GuestCreated, SnapshotIn, SnapshotOut
from ..security import current_guest, hash_token, new_guest_id, new_token
from ..services.sync import load_snapshot, save_snapshot

router = APIRouter(prefix="/api/guests", tags=["guests"])

# Creating guests is the one unauthenticated write: keep it tight.
_create_limiter = SlidingWindow(limit=10, window_seconds=60)


@router.post("", response_model=GuestCreated, status_code=status.HTTP_201_CREATED)
def create_guest(request: Request, db: Session = Depends(get_db)) -> GuestCreated:
    if not _create_limiter.allow(client_key(request)):
        raise HTTPException(429, "Too many requests", headers={"Retry-After": "60"})
    gid, token = new_guest_id(), new_token()
    db.add(Guest(id=gid, token_hash=hash_token(token)))
    db.commit()
    return GuestCreated(guestId=gid, token=token)  # the token is shown exactly once


@router.get("/{guest_id}/progress", response_model=SnapshotOut)
def get_progress(guest: Guest = Depends(current_guest), db: Session = Depends(get_db)) -> SnapshotOut:
    return load_snapshot(db, guest)


@router.put("/{guest_id}/progress", status_code=status.HTTP_204_NO_CONTENT)
async def put_progress(request: Request, guest: Guest = Depends(current_guest), db: Session = Depends(get_db)) -> Response:
    limit = get_settings().max_snapshot_bytes
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise HTTPException(413, "Snapshot too large")
    body = await request.body()
    if len(body) > limit:
        raise HTTPException(413, "Snapshot too large")
    try:
        snap = SnapshotIn.model_validate_json(body)
    except ValidationError as exc:
        raise HTTPException(422, [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()][:10]) from exc
    save_snapshot(db, guest, snap)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(guest: Guest = Depends(current_guest), db: Session = Depends(get_db)) -> Response:
    db.delete(guest)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
