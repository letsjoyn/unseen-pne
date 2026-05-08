"""ORM models. All "logic" tables are config-driven (rules, prompts, policies)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# ----- Config registries (the "no hardcoding" boundary) -----


class Scheme(Base, TimestampMixin):
    __tablename__ = "schemes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)  # central|state|municipal
    state: Mapped[str | None] = mapped_column(String(64))
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)

    eligibility_rules: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    required_documents: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    application_channels: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    estimated_annual_value_inr: Mapped[int | None] = mapped_column(Integer)

    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    source_clause: Mapped[str | None] = mapped_column(Text)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Prompt(Base, TimestampMixin):
    __tablename__ = "prompts"
    __table_args__ = (UniqueConstraint("agent", "version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    output_schema: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Policy(Base, TimestampMixin):
    __tablename__ = "policies"
    __table_args__ = (UniqueConstraint("kind", "key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


# ----- Workflow state -----


class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    operator_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="intake_created")
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    intake_payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    profile: Mapped["BeneficiaryProfile"] = relationship(
        back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    matches: Mapped[list["Match"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    blockers: Mapped[list["BlockerReport"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    packet: Mapped["ActionPacket | None"] = relationship(
        back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    route_plan: Mapped["RoutePlan | None"] = relationship(
        back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    followups: Mapped[list["FollowupTask"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    events: Mapped[list["CaseEvent"]] = relationship(
        back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.created_at"
    )


class BeneficiaryProfile(Base, TimestampMixin):
    __tablename__ = "beneficiary_profiles"

    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    profile_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    der_score: Mapped[float | None] = mapped_column()
    confidence: Mapped[float | None] = mapped_column()
    missing_fields: Mapped[list[str]] = mapped_column(JSON, default=list)

    case: Mapped[Case] = relationship(back_populates="profile")


class Match(Base, TimestampMixin):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), index=True, nullable=False
    )
    scheme_id: Mapped[str] = mapped_column(ForeignKey("schemes.id"), nullable=False)

    eligibility: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[float] = mapped_column(nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    urgency: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    case: Mapped[Case] = relationship(back_populates="matches")


class BlockerReport(Base, TimestampMixin):
    __tablename__ = "blocker_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), index=True, nullable=False
    )
    scheme_id: Mapped[str] = mapped_column(ForeignKey("schemes.id"), nullable=False)
    blockers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    minimum_path: Mapped[list[str]] = mapped_column(JSON, default=list)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    case: Mapped[Case] = relationship(back_populates="blockers")


class ActionPacket(Base, TimestampMixin):
    __tablename__ = "action_packets"

    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    scheme_id: Mapped[str] = mapped_column(ForeignKey("schemes.id"), nullable=False)
    cover_letter: Mapped[str] = mapped_column(Text, nullable=False)
    email_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email_body: Mapped[str] = mapped_column(Text, nullable=False)
    whatsapp_summary: Mapped[str | None] = mapped_column(Text)
    checklist: Mapped[list[str]] = mapped_column(JSON, default=list)

    requires_human_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(64))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_channels: Mapped[list[str]] = mapped_column(JSON, default=list)

    case: Mapped[Case] = relationship(back_populates="packet")


class RoutePlan(Base, TimestampMixin):
    __tablename__ = "route_plans"

    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    primary_route: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    fallback_route: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    case: Mapped[Case] = relationship(back_populates="route_plan")


class FollowupTask(Base, TimestampMixin):
    __tablename__ = "followup_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), index=True, nullable=False
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    task_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text)

    case: Mapped[Case] = relationship(back_populates="followups")


class CaseEvent(Base, TimestampMixin):
    __tablename__ = "case_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    case: Mapped[Case] = relationship(back_populates="events")
