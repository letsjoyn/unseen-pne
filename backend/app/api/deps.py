"""Common FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.tokens import TokenError, decode_token
from app.config import get_settings
from app.db import models
from app.db.database import get_db  # noqa: F401  -- re-exported for routes


def _strip_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def require_auth(authorization: str | None = Header(default=None)) -> str:
    """Allow either:
    1. The service-level static API token (used by internal scripts / dev).
    2. A real user JWT issued by /api/auth/login.
    """
    settings = get_settings()
    token = _strip_bearer(authorization)
    if token is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Missing Authorization: Bearer <token>"
        )
    if token == settings.api_auth_token:
        return token
    try:
        decode_token(token)
    except TokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    return token


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    """Strict: only accepts a JWT and returns the real DB User row."""
    token = _strip_bearer(authorization)
    if token is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Missing Authorization: Bearer <token>"
        )
    try:
        payload = decode_token(token)
    except TokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token sub") from e
    user = db.get(models.User, user_id)
    if user is None or not user.active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "User not found or deactivated"
        )
    return user


def require_role(*roles: str):
    """FastAPI dependency factory for role-gated endpoints."""

    def _check(user: models.User = Depends(current_user)) -> models.User:
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Role '{user.role}' is not allowed (need one of {list(roles)})",
            )
        return user

    return _check
