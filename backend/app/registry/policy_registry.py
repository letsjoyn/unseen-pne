"""Routing / followup / confidence policies live in the DB, not in code."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Policy


def get_policy(db: Session, kind: str, key: str, default: Any | None = None) -> Any:
    row = (
        db.query(Policy)
        .filter(Policy.kind == kind, Policy.key == key)
        .one_or_none()
    )
    if row is None:
        return default
    return row.value


def list_policies(db: Session, kind: str) -> list[Policy]:
    return list(db.query(Policy).filter(Policy.kind == kind).all())
