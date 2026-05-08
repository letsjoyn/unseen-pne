"""Operator login/session endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.api.deps import AuthContext, get_db, require_auth
from app.db import models
from app.security import (
    hash_session_token,
    new_session_token,
    session_expiry,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _operator_summary(operator: models.Operator) -> schemas.OperatorSummary:
    return schemas.OperatorSummary(
        id=operator.id,
        name=operator.name,
        role=operator.role,
        organization=operator.organization,
        email=operator.email,
        phone=operator.phone,
    )


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    operator = db.get(models.Operator, payload.operator_id)
    if operator is None or not operator.active or not verify_password(
        payload.password, operator.password_hash
    ):
        raise HTTPException(401, "Invalid operator ID or password")

    token = new_session_token()
    expires_at = session_expiry()
    db.add(
        models.OperatorSession(
            id=f"sess_{token[-12:]}",
            operator_id=operator.id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
            last_seen_at=datetime.now(tz=timezone.utc),
        )
    )
    db.commit()
    return schemas.LoginResponse(
        token=token,
        expires_at=expires_at,
        operator=_operator_summary(operator),
    )


@router.get("/me", response_model=schemas.OperatorSummary)
def me(ctx: AuthContext = Depends(require_auth), db: Session = Depends(get_db)):
    if ctx.operator_id is None:
        raise HTTPException(403, "Operator session required")
    operator = db.get(models.Operator, ctx.operator_id)
    if operator is None or not operator.active:
        raise HTTPException(401, "Operator session is no longer valid")
    return _operator_summary(operator)


@router.post("/logout")
def logout(ctx: AuthContext = Depends(require_auth), db: Session = Depends(get_db)):
    if ctx.operator_id is None:
        return {"status": "service_token"}
    session = (
        db.query(models.OperatorSession)
        .filter(models.OperatorSession.token_hash == hash_session_token(ctx.token))
        .one_or_none()
    )
    if session is not None:
        session.revoked_at = datetime.now(tz=timezone.utc)
        db.commit()
    return {"status": "logged_out"}
