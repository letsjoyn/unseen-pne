"""Password hashing using bcrypt directly (no passlib dep needed)."""

from __future__ import annotations

import bcrypt


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("password is empty")
    # bcrypt has a 72-byte limit; clip silently to avoid surprising users.
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(
            password.encode("utf-8")[:72], password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False
