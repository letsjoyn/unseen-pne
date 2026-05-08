"""Profiler agent: intake -> structured BeneficiaryProfile."""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.core.der_score import compute_der
from app.db.models import BeneficiaryProfile, Case


class ProfilerAgent(BaseAgent):
    name = "profiler"

    def run(self, *, case_id: str, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        if case is None:
            raise ValueError(f"Case {case_id} not found")

        prompt = self.load_prompt()
        result = self.gemini.generate_json(prompt=prompt, user_payload=case.intake_payload)

        confidence = float(result.get("confidence") or 0.7)
        missing_fields = list(result.get("missing_fields") or [])

        flat_profile = _flatten_profile(result, case.intake_payload)
        der = compute_der(flat_profile, db=self.db)

        existing = self.db.get(BeneficiaryProfile, case_id)
        if existing is None:
            self.db.add(
                BeneficiaryProfile(
                    case_id=case_id,
                    profile_json=result,
                    der_score=der,
                    confidence=confidence,
                    missing_fields=missing_fields,
                )
            )
        else:
            existing.profile_json = result
            existing.der_score = der
            existing.confidence = confidence
            existing.missing_fields = missing_fields

        case.status = "profiled"
        self.db.commit()

        out = {"profile": result, "der_score": der, "confidence": confidence}
        self.record_event(case_id, out)
        return out


def _flatten_profile(profile: dict[str, Any], intake: dict[str, Any]) -> dict[str, Any]:
    """Build a flat dict used by the rules engine and DER scorer."""

    b = (intake or {}).get("beneficiary", {})
    economic = profile.get("economic", {}) if isinstance(profile, dict) else {}
    demographics = profile.get("demographics", {}) if isinstance(profile, dict) else {}
    documents = profile.get("documents", {}) if isinstance(profile, dict) else {}
    location = profile.get("location", {}) if isinstance(profile, dict) else {}

    return {
        "age": demographics.get("age") or b.get("age"),
        "gender": demographics.get("gender") or b.get("gender"),
        "is_widow": b.get("is_widow", False),
        "monthly_income": economic.get("monthly_income") or b.get("monthly_income"),
        "occupation": economic.get("occupation") or b.get("occupation"),
        "household_size": b.get("household_size"),
        "dependents": b.get("dependents"),
        "state": (location.get("state") or b.get("location", {}).get("state")),
        "district": (location.get("district") or b.get("location", {}).get("district")),
        "smartphone_access": b.get("smartphone_access", False),
        "bank_linked": b.get("bank_linked", False),
        "literacy_level": b.get("literacy_level"),
        "internet_access": b.get("internet_access", False),
        "documents": documents or {d: True for d in (b.get("documents_available") or [])},
        "vulnerability_tags": profile.get("vulnerability_tags", []) if isinstance(profile, dict) else [],
    }
