"""Authentication endpoints: signup, login, /me."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.auth.passwords import hash_password, verify_password
from app.auth.tokens import issue_token
from app.db import models

router = APIRouter(prefix="/api/auth", tags=["auth"])


Role = Literal["volunteer", "ngo_admin", "beneficiary", "reviewer"]


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    role: Role = "volunteer"
    org: str | None = Field(default=None, max_length=255)
    case_id: str | None = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: int
    email: str
    name: str
    role: str
    org: str | None
    case_id: str | None
    active: bool
    created_at: datetime
    last_login_at: datetime | None


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


def _to_public(u: models.User) -> UserPublic:
    return UserPublic(
        id=u.id,
        email=u.email,
        name=u.name,
        role=u.role,
        org=u.org,
        case_id=u.case_id,
        active=u.active,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
    )


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(models.User).filter(models.User.email == email).one_or_none()
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists"
        )
    user = models.User(
        email=email,
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        role=payload.role,
        org=(payload.org or None),
        case_id=(payload.case_id or None),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user.id, user.role, {"email": user.email})
    return AuthResponse(token=token, user=_to_public(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")
    user.last_login_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(user)
    token = issue_token(user.id, user.role, {"email": user.email})
    return AuthResponse(token=token, user=_to_public(user))


@router.get("/me", response_model=UserPublic)
def me(user: models.User = Depends(current_user)):
    return _to_public(user)
