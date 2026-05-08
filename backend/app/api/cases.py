"""Case lifecycle endpoints."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.api.deps import get_db, require_auth
from app.core.missed_value import estimate_missed_value_for_case
from app.db import models

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _intake_name(intake: dict | None) -> str | None:
    if not intake:
        return None
    b = intake.get("beneficiary") if isinstance(intake, dict) else None
    if isinstance(b, dict):
        return b.get("name")
    return None


def _intake_district(intake: dict | None) -> str | None:
    if not intake:
        return None
    b = intake.get("beneficiary") if isinstance(intake, dict) else None
    if isinstance(b, dict):
        loc = b.get("location") or {}
        if isinstance(loc, dict):
            return loc.get("district") or loc.get("state")
    return None


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


@router.get("")
def list_cases(db: Session = Depends(get_db), _: str = Depends(require_auth)):
    rows = db.query(models.Case).order_by(models.Case.created_at.desc()).all()
    out = []
    for r in rows:
        profile = db.get(models.BeneficiaryProfile, r.id)
        eligible = (
            db.query(models.Match)
            .filter(models.Match.case_id == r.id)
            .filter(models.Match.eligibility.in_(["eligible", "probable"]))
            .count()
        )
        total = db.query(models.Match).filter(models.Match.case_id == r.id).count()
        try:
            missed = estimate_missed_value_for_case(db, r.id)
        except Exception:
            missed = 0
        out.append(
            {
                "case_id": r.id,
                "status": r.status,
                "operator_id": r.operator_id,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat(),
                "beneficiary_name": _intake_name(r.intake_payload),
                "district": _intake_district(r.intake_payload),
                "der_score": profile.der_score if profile else None,
                "eligible_count": eligible,
                "total_matches": total,
                "missed_value_inr": missed,
            }
        )
    return out


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

    scheme_ids = {m.scheme_id for m in matches}
    schemes_by_id: dict[str, models.Scheme] = {}
    if scheme_ids:
        schemes = db.query(models.Scheme).filter(models.Scheme.id.in_(scheme_ids)).all()
        schemes_by_id = {s.id: s for s in schemes}

    try:
        missed_value = estimate_missed_value_for_case(db, case_id)
    except Exception:
        missed_value = 0

    return {
        "case": {
            "id": case.id,
            "status": case.status,
            "operator_id": case.operator_id,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
            "intake": case.intake_payload,
            "beneficiary_name": _intake_name(case.intake_payload),
            "district": _intake_district(case.intake_payload),
        },
        "missed_value_inr": missed_value,
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
                "scheme_name": (
                    schemes_by_id[m.scheme_id].name if m.scheme_id in schemes_by_id else None
                ),
                "scheme_category": (
                    schemes_by_id[m.scheme_id].category if m.scheme_id in schemes_by_id else None
                ),
                "scheme_summary": (
                    schemes_by_id[m.scheme_id].summary if m.scheme_id in schemes_by_id else None
                ),
                "estimated_annual_value_inr": (
                    schemes_by_id[m.scheme_id].estimated_annual_value_inr
                    if m.scheme_id in schemes_by_id
                    else None
                ),
                "required_documents": (
                    schemes_by_id[m.scheme_id].required_documents
                    if m.scheme_id in schemes_by_id
                    else []
                ),
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
                "scheme_name": (
                    schemes_by_id[b.scheme_id].name if b.scheme_id in schemes_by_id else None
                ),
                "blockers": b.blockers,
                "minimum_path": b.minimum_path,
                "resolved": b.resolved,
            }
            for b in blockers
        ],
        "packet": (
            {
                "scheme_id": packet.scheme_id,
                "scheme_name": (
                    schemes_by_id[packet.scheme_id].name
                    if packet.scheme_id in schemes_by_id
                    else None
                ),
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
    try:
        from app.adk.runner import run_pipeline as adk_run_pipeline
    except ModuleNotFoundError as exc:
        if exc.name and exc.name.startswith("google.adk"):
            raise HTTPException(
                503,
                "Agent runner dependency is not installed. Install backend requirements to run the pipeline.",
            ) from exc
        raise
    return adk_run_pipeline(db, case_id)


def _new_case_id(db: Session) -> str:
    year = datetime.now(tz=timezone.utc).year
    suffix = secrets.token_hex(3).upper()
    return f"CASE-{year}-{suffix}"
