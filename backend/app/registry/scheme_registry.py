"""Read-side helpers around the Scheme table.

The Hunter and Matcher agents call into this module instead of importing
any scheme data from Python code. Adding a new scheme = inserting a row.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Scheme


def list_active_schemes(
    db: Session,
    *,
    state: str | None = None,
    category: str | None = None,
) -> list[Scheme]:
    stmt = select(Scheme).where(Scheme.active.is_(True))
    if state:
        stmt = stmt.where((Scheme.state == state) | (Scheme.state.is_(None)))
    if category:
        stmt = stmt.where(Scheme.category == category)
    return list(db.execute(stmt).scalars().all())


def get_scheme(db: Session, scheme_id: str) -> Scheme | None:
    return db.get(Scheme, scheme_id)


def upsert_scheme(db: Session, payload: dict) -> Scheme:
    """Used by admin endpoints + ingestion pipeline."""

    existing = db.get(Scheme, payload["id"])
    if existing:
        for key, value in payload.items():
            if hasattr(existing, key):
                setattr(existing, key, value)
        existing.version = (existing.version or 0) + 1
        db.commit()
        db.refresh(existing)
        return existing

    scheme = Scheme(**payload)
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme
