"""`python -m app.seed` — creates tables and one demo guest (fictional). Prints the demo token once."""
from .db import SessionLocal, init_db
from .models import Guest
from .security import hash_token, new_guest_id, new_token


def main() -> None:
    init_db()
    token = new_token()
    gid = new_guest_id()
    with SessionLocal() as db:
        db.add(Guest(id=gid, token_hash=hash_token(token), display_name="Demo Investigator"))
        db.commit()
    print(f"Created demo guest.\n  guest id: {gid}\n  token:    {token}\n(The token is not stored; save it now.)")


if __name__ == "__main__":
    main()
