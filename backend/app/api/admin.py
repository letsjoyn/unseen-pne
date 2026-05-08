"""Admin endpoints - upsert schemes / prompts / policies at runtime.

Anything you'd otherwise hardcode flows through these endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.api.deps import get_db, require_auth
from app.db import models
from app.registry import policy_registry, prompt_registry, scheme_registry

router = APIRouter(prefix="/api/admin", tags=["admin"])


# -------- Schemes --------


@router.get("/schemes")
def list_schemes(db: Session = Depends(get_db), _: str = Depends(require_auth)):
    schemes = scheme_registry.list_active_schemes(db)
    return [
        {
            "id": s.id,
            "name": s.name,
            "level": s.level,
            "state": s.state,
            "category": s.category,
            "version": s.version,
            "active": s.active,
            "last_verified_at": s.last_verified_at.isoformat() if s.last_verified_at else None,
            "source_url": s.source_url,
        }
        for s in schemes
    ]


@router.post("/schemes")
def upsert_scheme(
    payload: schemas.UpsertSchemeRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    scheme = scheme_registry.upsert_scheme(db, payload.model_dump())
    return {"id": scheme.id, "version": scheme.version}


@router.post("/schemes/import", response_model=schemas.ImportSchemesResponse)
def import_schemes(
    payload: schemas.ImportSchemesRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    imported = 0
    rejected = 0
    results: list[schemas.ImportSchemesResult] = []

    for i, row in enumerate(payload.schemes, start=1):
        data = row.model_dump()
        scheme_id = data.get("id")
        try:
            # Guardrails for "review queue"-style rejection feedback.
            if not data.get("source_url", "").startswith(("http://", "https://")):
                raise ValueError("source_url must be a valid http/https URL")
            if not isinstance(data.get("eligibility_rules"), dict):
                raise ValueError("eligibility_rules must be a JSON object")
            if not data.get("name"):
                raise ValueError("name is required")
            if not data.get("category"):
                raise ValueError("category is required")

            scheme = scheme_registry.upsert_scheme(db, data)
            imported += 1
            results.append(
                schemas.ImportSchemesResult(
                    row=i,
                    scheme_id=scheme.id,
                    status="imported",
                    message=f"Imported as version {scheme.version}",
                )
            )
        except Exception as e:  # noqa: BLE001
            rejected += 1
            results.append(
                schemas.ImportSchemesResult(
                    row=i,
                    scheme_id=scheme_id,
                    status="rejected",
                    message=str(e),
                )
            )

    return schemas.ImportSchemesResponse(
        imported=imported,
        rejected=rejected,
        results=results,
    )


# -------- Prompts --------


@router.get("/prompts")
def list_prompts(db: Session = Depends(get_db), _: str = Depends(require_auth)):
    rows = db.query(models.Prompt).order_by(models.Prompt.agent, models.Prompt.version.desc()).all()
    return [
        {
            "id": r.id,
            "agent": r.agent,
            "version": r.version,
            "active": r.active,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/prompts")
def upsert_prompt(
    payload: schemas.UpsertPromptRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    prompt = prompt_registry.upsert_prompt(
        db, agent=payload.agent, text=payload.text, output_schema=payload.output_schema
    )
    return {"agent": prompt.agent, "version": prompt.version}


@router.get("/prompts/{agent}")
def get_active_prompt(agent: str, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    try:
        p = prompt_registry.get_active_prompt(db, agent)
    except prompt_registry.PromptNotFound as e:
        raise HTTPException(404, str(e)) from e
    return {"agent": p.agent, "version": p.version, "text": p.text, "output_schema": p.output_schema}


# -------- Policies --------


@router.get("/policies")
def list_policies(kind: str | None = None, db: Session = Depends(get_db), _: str = Depends(require_auth)):
    rows = (
        db.query(models.Policy)
        if kind is None
        else policy_registry.list_policies(db, kind)
    )
    if hasattr(rows, "all"):
        rows = rows.all()
    return [
        {"kind": r.kind, "key": r.key, "value": r.value, "description": r.description} for r in rows
    ]
