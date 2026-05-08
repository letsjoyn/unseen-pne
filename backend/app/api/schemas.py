"""Pydantic request/response models for the public API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Location(BaseModel):
    state: str
    district: str | None = None
    pincode: str | None = None


class Beneficiary(BaseModel):
    name: str
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    is_widow: bool = False
    location: Location
    household_size: int | None = None
    dependents: int | None = None
    monthly_income: int | None = None
    occupation: str | None = None
    documents_available: list[str] = Field(default_factory=list)
    bank_linked: bool = False
    smartphone_access: bool = False
    internet_access: bool = False
    literacy_level: str | None = None  # "low" | "medium" | "high"


class IntakeRequest(BaseModel):
    operator_id: str
    consent: bool
    beneficiary: Beneficiary
    notes: str | None = None


class CaseSummary(BaseModel):
    case_id: str
    status: str
    operator_id: str
    created_at: datetime
    updated_at: datetime


class ApprovePacketRequest(BaseModel):
    approved_by: str
    channels: list[str]


class UpsertSchemeRequest(BaseModel):
    id: str
    name: str
    level: str
    state: str | None = None
    category: str
    summary: str | None = None
    eligibility_rules: dict[str, Any]
    required_documents: list[str] = Field(default_factory=list)
    application_channels: list[dict[str, Any]] = Field(default_factory=list)
    estimated_annual_value_inr: int | None = None
    source_url: str
    source_clause: str | None = None
    last_verified_at: datetime
    active: bool = True


class UpsertPromptRequest(BaseModel):
    agent: str
    text: str
    output_schema: dict[str, Any] | None = None
