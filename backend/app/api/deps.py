"""Common FastAPI dependencies."""

from __future__ import annotations

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session  # noqa: F401

from app.config import get_settings
from app.db.database import get_db  # noqa: F401  -- re-exported for routes


def require_auth(authorization: str | None = Header(default=None)) -> str:
    settings = get_settings()
    expected = f"Bearer {settings.api_auth_token}"
    if authorization != expected:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing API token")
    return authorization
