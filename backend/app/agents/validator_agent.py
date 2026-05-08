"""Validator agent: detects blockers and the minimum path to submission."""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.profiler_agent import _flatten_profile
from app.db.models import BeneficiaryProfile, BlockerReport, Case, Match
from app.registry import scheme_registry


class ValidatorAgent(BaseAgent):
    name = "validator"

    def run(self, *, case_id: str, scheme_id: str | None = None, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        profile_row = self.db.get(BeneficiaryProfile, case_id)
        if case is None or profile_row is None:
            raise ValueError("Case/profile missing")

        target_match = self._pick_match(case_id, scheme_id)
        if target_match is None:
            raise ValueError("No eligible/probable matches; run matcher first")

        scheme = scheme_registry.get_scheme(self.db, target_match.scheme_id)
        if scheme is None:
            raise ValueError("Scheme not found")

        flat = _flatten_profile(profile_row.profile_json, case.intake_payload)
        available_docs = list(flat.get("documents", {}).keys()) if isinstance(flat.get("documents"), dict) else []
        missing_docs = [d for d in scheme.required_documents if d not in available_docs]

        blockers = []
        for d in missing_docs:
            blockers.append(
                {
                    "type": "MISSING_DOCUMENT",
                    "field": d,
                    "severity": "high" if d in {"aadhaar", "death_certificate"} else "medium",
                    "next_steps": [f"Obtain {d.replace('_', ' ').title()} before submission"],
                }
            )
        if not flat.get("bank_linked"):
            blockers.append(
                {
                    "type": "BANK_NOT_LINKED",
                    "severity": "high",
                    "next_steps": ["Open/link a bank account in beneficiary's name with Aadhaar seeding"],
                }
            )

        minimum_path: list[str] = []
        for b in blockers:
            minimum_path.extend(b["next_steps"])
        minimum_path.append(f"Submit {scheme.name} application via primary channel")

        prompt = self.load_prompt()
        ai_extras = self.gemini.generate_json(
            prompt=prompt,
            user_payload={
                "scheme": scheme.name,
                "missing_docs": missing_docs,
                "profile": flat,
            },
        )
        if isinstance(ai_extras, dict):
            extra = ai_extras.get("blockers") or []
            if isinstance(extra, list):
                for entry in extra:
                    if isinstance(entry, dict) and entry not in blockers:
                        blockers.append(entry)
            extra_path = ai_extras.get("minimum_path_to_submission") or []
            if isinstance(extra_path, list):
                for step in extra_path:
                    if isinstance(step, str) and step not in minimum_path:
                        minimum_path.append(step)

        self.db.query(BlockerReport).filter(
            BlockerReport.case_id == case_id, BlockerReport.scheme_id == scheme.id
        ).delete()
        self.db.add(
            BlockerReport(
                case_id=case_id,
                scheme_id=scheme.id,
                blockers=blockers,
                minimum_path=minimum_path,
                resolved=not blockers,
            )
        )

        case.status = "blockers_identified"
        self.db.commit()

        out = {"scheme_id": scheme.id, "blockers": blockers, "minimum_path": minimum_path}
        self.record_event(case_id, out)
        return out

    def _pick_match(self, case_id: str, scheme_id: str | None) -> Match | None:
        q = self.db.query(Match).filter(Match.case_id == case_id)
        if scheme_id:
            return q.filter(Match.scheme_id == scheme_id).one_or_none()
        return q.filter(Match.eligibility.in_(["eligible", "probable"])).order_by(Match.score.desc()).first()
