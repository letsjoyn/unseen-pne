"""Matcher agent: applies the JSONLogic rules engine to each candidate."""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.profiler_agent import _flatten_profile
from app.core import rules_engine
from app.db.models import BeneficiaryProfile, Case, Match
from app.registry import scheme_registry


class MatcherAgent(BaseAgent):
    name = "matcher"

    def run(self, *, case_id: str, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        profile_row = self.db.get(BeneficiaryProfile, case_id)
        if case is None or profile_row is None:
            raise ValueError("Case/profile missing")

        flat = _flatten_profile(profile_row.profile_json, case.intake_payload)
        available_docs = list(flat.get("documents", {}).keys()) if isinstance(flat.get("documents"), dict) else []

        candidates = scheme_registry.list_active_schemes(self.db, state=flat.get("state"))

        self.db.query(Match).filter(Match.case_id == case_id).delete()

        results = []
        for scheme in candidates:
            ev = rules_engine.evaluate(
                scheme.eligibility_rules,
                flat,
                required_documents=scheme.required_documents,
                available_documents=available_docs,
            )
            urgency = _urgency_for(scheme, ev)
            citation = {
                "url": scheme.source_url,
                "clause": scheme.source_clause,
                "last_verified_at": scheme.last_verified_at.isoformat()
                if scheme.last_verified_at
                else None,
            }
            self.db.add(
                Match(
                    case_id=case_id,
                    scheme_id=scheme.id,
                    eligibility=ev.decision,
                    score=ev.score,
                    confidence=ev.confidence,
                    urgency=urgency,
                    reason_codes=_reason_codes(ev),
                    citations=[citation],
                )
            )
            results.append(
                {
                    "scheme_id": scheme.id,
                    "name": scheme.name,
                    "eligibility": ev.decision,
                    "score": ev.score,
                    "confidence": ev.confidence,
                    "urgency": urgency,
                    "matched": ev.matched,
                    "failed": ev.failed,
                    "missing_inputs": ev.missing_inputs,
                    "citations": [citation],
                }
            )

        results.sort(key=lambda r: (_rank(r["eligibility"]), -r["score"]))

        case.status = "matched"
        self.db.commit()

        out = {"matches": results}
        self.record_event(case_id, {"matches_count": len(results)})
        return out


def _rank(decision: str) -> int:
    return {"eligible": 0, "probable": 1, "not_eligible": 2}.get(decision, 3)


def _reason_codes(ev: rules_engine.RuleEvaluation) -> list[str]:
    codes = [f"PASS:{m}" for m in ev.matched]
    codes += [f"FAIL:{f}" for f in ev.failed]
    if ev.missing_inputs:
        codes.append("MISSING_INPUTS:" + ",".join(ev.missing_inputs))
    return codes


def _urgency_for(scheme: Any, ev: rules_engine.RuleEvaluation) -> str:
    if ev.decision == "eligible":
        return "high"
    if ev.decision == "probable":
        return "medium"
    return "low"
