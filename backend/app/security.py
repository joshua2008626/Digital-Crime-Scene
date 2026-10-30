"""Guest bearer tokens. A token is a random secret returned once at creation; only its hash is stored."""
import hashlib
import hmac
import secrets
import uuid

from fastapi import Depends, Header, HTTPException, Path, status
from sqlalchemy.orm import Session

from .db import get_db
from .models import Guest


def new_guest_id() -> str:
    return str(uuid.uuid4())


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def token_matches(token: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_token(token), stored_hash)


def current_guest(
    guest_id: str = Path(min_length=36, max_length=36),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Guest:
    unauthorised = HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid token", headers={"WWW-Authenticate": "Bearer"})
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorised
    token = authorization[7:].strip()
    guest = db.get(Guest, guest_id)
    # Same error for "no such guest" and "wrong token" so ids cannot be probed.
    if guest is None or not token or not token_matches(token, guest.token_hash):
        raise unauthorised
    return guest
