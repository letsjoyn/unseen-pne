"""Per-agent endpoints, useful for step-by-step demos and debugging."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.agents.closer_agent import CloserAgent
from app.agents.hunter_agent import HunterAgent
from app.agents.matcher_agent import MatcherAgent
from app.agents.profiler_agent import ProfilerAgent
from app.agents.router_agent import RouterAgent
from app.agents.validator_agent import ValidatorAgent
from app.agents.watchdog_agent import WatchdogAgent
from app.api.deps import get_db, require_auth
from app.db import models

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _ensure_case(db: Session, case_id: str) -> models.Case:
    case = db.get(models.Case, case_id)
    if case is None:
        raise HTTPException(404, "Case not found")
    return case


@router.post("/profiler/{case_id}")
def run_profiler(case_id: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    _ensure_case(db, case_id)
    return ProfilerAgent(db).run(case_id=case_id)


@router.post("/hunter/{case_id}")
def run_hunter(case_id: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    _ensure_case(db, case_id)
    return HunterAgent(db).run(case_id=case_id)


@router.post("/matcher/{case_id}")
def run_matcher(case_id: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    _ensure_case(db, case_id)
    return MatcherAgent(db).run(case_id=case_id)


@router.post("/validator/{case_id}")
def run_validator(
    case_id: str,
    scheme_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    _ensure_case(db, case_id)
    return ValidatorAgent(db).run(case_id=case_id, scheme_id=scheme_id)


@router.post("/closer/{case_id}")
def run_closer(
    case_id: str,
    scheme_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    _ensure_case(db, case_id)
    return CloserAgent(db).run(case_id=case_id, scheme_id=scheme_id)


@router.post("/router/{case_id}")
def run_router(
    case_id: str,
    scheme_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    _ensure_case(db, case_id)
    return RouterAgent(db).run(case_id=case_id, scheme_id=scheme_id)


@router.post("/watchdog/{case_id}")
def run_watchdog(
    case_id: str,
    scheme_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    _ensure_case(db, case_id)
    return WatchdogAgent(db).run(case_id=case_id, scheme_id=scheme_id)
