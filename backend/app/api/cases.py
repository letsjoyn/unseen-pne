"""Case lifecycle endpoints."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.adk.runner import run_pipeline as adk_run_pipeline
from app.api import schemas
from app.api.deps import get_db, require_auth
from app.db import models

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.post("", response_model=schemas.CaseSummary)
def create_case(
    payload: schemas.IntakeRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    if not payload.consent:
        raise HTTPException(400, "Consent is required to create a case")

    case_id = _new_case_id(db)
    case = models.Case(
        id=case_id,
        operator_id=payload.operator_id,
        status="intake_created",
        consent=payload.consent,
        intake_payload=payload.model_dump(mode="json"),
    )
    db.add(case)
    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="case.created",
            actor=payload.operator_id,
            payload={"beneficiary": payload.beneficiary.model_dump()},
        )
    )
    db.commit()
    db.refresh(case)
    return schemas.CaseSummary(
        case_id=case.id,
        status=case.status,
        operator_id=case.operator_id,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


@router.get("", response_model=list[schemas.CaseSummary])
def list_cases(db: Session = Depends(get_db), _: str = Depends(require_auth)):
    rows = db.query(models.Case).order_by(models.Case.created_at.desc()).all()
    return [
        schemas.CaseSummary(
            case_id=r.id,
            status=r.status,
            operator_id=r.operator_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    case = db.get(models.Case, case_id)
    if case is None:
        raise HTTPException(404, "Case not found")
    profile = db.get(models.BeneficiaryProfile, case_id)
    matches = db.query(models.Match).filter(models.Match.case_id == case_id).all()
    blockers = db.query(models.BlockerReport).filter(models.BlockerReport.case_id == case_id).all()
    packet = db.get(models.ActionPacket, case_id)
    route_plan = db.get(models.RoutePlan, case_id)
    followups = (
        db.query(models.FollowupTask)
        .filter(models.FollowupTask.case_id == case_id)
        .order_by(models.FollowupTask.due_at)
        .all()
    )
    events = (
        db.query(models.CaseEvent)
        .filter(models.CaseEvent.case_id == case_id)
        .order_by(models.CaseEvent.created_at)
        .all()
    )
    return {
        "case": {
            "id": case.id,
            "status": case.status,
            "operator_id": case.operator_id,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
            "intake": case.intake_payload,
        },
        "profile": (
            {
                "profile": profile.profile_json,
                "der_score": profile.der_score,
                "confidence": profile.confidence,
                "missing_fields": profile.missing_fields,
            }
            if profile
            else None
        ),
        "matches": [
            {
                "scheme_id": m.scheme_id,
                "eligibility": m.eligibility,
                "score": m.score,
                "confidence": m.confidence,
                "urgency": m.urgency,
                "reason_codes": m.reason_codes,
                "citations": m.citations,
            }
            for m in matches
        ],
        "blockers": [
            {
                "scheme_id": b.scheme_id,
                "blockers": b.blockers,
                "minimum_path": b.minimum_path,
                "resolved": b.resolved,
            }
            for b in blockers
        ],
        "packet": (
            {
                "scheme_id": packet.scheme_id,
                "cover_letter": packet.cover_letter,
                "email_subject": packet.email_subject,
                "email_body": packet.email_body,
                "whatsapp_summary": packet.whatsapp_summary,
                "checklist": packet.checklist,
                "approved": packet.approved,
                "sent": packet.sent,
                "sent_channels": packet.sent_channels,
            }
            if packet
            else None
        ),
        "route_plan": (
            {
                "primary": route_plan.primary_route,
                "fallback": route_plan.fallback_route,
                "scores": route_plan.score_breakdown,
            }
            if route_plan
            else None
        ),
        "followups": [
            {
                "id": t.id,
                "due_at": t.due_at.isoformat(),
                "type": t.task_type,
                "status": t.status,
                "notes": t.notes,
            }
            for t in followups
        ],
        "events": [
            {
                "type": e.event_type,
                "actor": e.actor,
                "payload": e.payload,
                "at": e.created_at.isoformat(),
            }
            for e in events
        ],
    }


@router.post("/{case_id}/run")
def run_full(case_id: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    case = db.get(models.Case, case_id)
    if case is None:
        raise HTTPException(404, "Case not found")
    return adk_run_pipeline(db, case_id)


def _new_case_id(db: Session) -> str:
    year = datetime.now(tz=timezone.utc).year
    suffix = secrets.token_hex(3).upper()
    return f"CASE-{year}-{suffix}"
