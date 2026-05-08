"""Versioned prompt registry. Agent code never embeds prompt text inline."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Prompt


class PromptNotFound(RuntimeError):
    pass


def get_active_prompt(db: Session, agent: str) -> Prompt:
    stmt = (
        select(Prompt)
        .where(Prompt.agent == agent, Prompt.active.is_(True))
        .order_by(Prompt.version.desc())
        .limit(1)
    )
    row = db.execute(stmt).scalar_one_or_none()
    if row is None:
        raise PromptNotFound(f"No active prompt for agent '{agent}'")
    return row


def upsert_prompt(db: Session, *, agent: str, text: str, output_schema: dict | None = None) -> Prompt:
    latest = (
        db.execute(
            select(Prompt).where(Prompt.agent == agent).order_by(Prompt.version.desc()).limit(1)
        )
        .scalar_one_or_none()
    )
    next_version = 1 if latest is None else latest.version + 1
    db.query(Prompt).filter(Prompt.agent == agent).update({"active": False})
    new_prompt = Prompt(
        agent=agent, version=next_version, text=text, output_schema=output_schema, active=True
    )
    db.add(new_prompt)
    db.commit()
    db.refresh(new_prompt)
    return new_prompt
