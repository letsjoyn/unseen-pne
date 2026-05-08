"""Insights dashboard endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.insights_agent import InsightsAgent
from app.api.deps import get_db, require_auth

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: str = Depends(require_auth)):
    return InsightsAgent(db).run()
