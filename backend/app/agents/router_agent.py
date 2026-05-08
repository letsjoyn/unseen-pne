"""Router agent: scores routes from `routing_policies` and picks primary + fallback."""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.db.models import Case, Match, RoutePlan
from app.registry import policy_registry, scheme_registry


class RouterAgent(BaseAgent):
    name = "router"

    def run(self, *, case_id: str, scheme_id: str | None = None, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        if case is None:
            raise ValueError("Case missing")

        match = self._pick_match(case_id, scheme_id)
        if match is None:
            raise ValueError("No match available; run matcher first")

        scheme = scheme_registry.get_scheme(self.db, match.scheme_id)
        if scheme is None:
            raise ValueError("Scheme not found")

        weights = policy_registry.get_policy(
            self.db,
            "routing",
            "weights",
            default={"fit": 0.4, "sla": 0.3, "success": 0.2, "effort": 0.1},
        )

        ranked = []
        breakdown: dict[str, Any] = {}
        for ch in (scheme.application_channels or []):
            score = (
                float(ch.get("fit", 0)) * float(weights.get("fit", 0.4))
                + (1 - float(ch.get("sla_days", 30)) / 60.0) * float(weights.get("sla", 0.3))
                + float(ch.get("historical_success", 0)) * float(weights.get("success", 0.2))
                + (1 - float(ch.get("effort", 0))) * float(weights.get("effort", 0.1))
            )
            breakdown[ch.get("name", "?")] = round(score, 3)
            ranked.append((round(score, 3), ch))

        ranked.sort(key=lambda x: -x[0])
        primary = ranked[0][1] if ranked else {"name": "manual_followup"}
        fallback = ranked[1][1] if len(ranked) > 1 else None

        existing = self.db.get(RoutePlan, case_id)
        if existing is None:
            self.db.add(
                RoutePlan(
                    case_id=case_id,
                    primary_route=primary,
                    fallback_route=fallback,
                    score_breakdown=breakdown,
                )
            )
        else:
            existing.primary_route = primary
            existing.fallback_route = fallback
            existing.score_breakdown = breakdown

        case.status = "routed"
        self.db.commit()

        out = {"primary": primary, "fallback": fallback, "scores": breakdown}
        self.record_event(case_id, out)
        return out

    def _pick_match(self, case_id: str, scheme_id: str | None) -> Match | None:
        q = self.db.query(Match).filter(Match.case_id == case_id)
        if scheme_id:
            return q.filter(Match.scheme_id == scheme_id).one_or_none()
        return q.filter(Match.eligibility.in_(["eligible", "probable"])).order_by(Match.score.desc()).first()
