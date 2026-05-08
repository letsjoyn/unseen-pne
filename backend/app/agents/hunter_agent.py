"""Hunter agent: pulls candidate schemes from the registry.

For the hackathon MVP we use the curated registry as ground truth and
filter by state/category. The same interface accepts vector retrieval
and grounded web results when they are added later.
"""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.profiler_agent import _flatten_profile
from app.core.household_swarm import plan_household_swarm
from app.db.models import BeneficiaryProfile, Case
from app.registry import scheme_registry


class HunterAgent(BaseAgent):
    name = "hunter"

    def run(self, *, case_id: str, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        if case is None:
            raise ValueError(f"Case {case_id} not found")
        profile_row = self.db.get(BeneficiaryProfile, case_id)
        if profile_row is None:
            raise ValueError("Profile not built yet")

        flat = _flatten_profile(profile_row.profile_json, case.intake_payload)

        all_schemes = scheme_registry.list_active_schemes(self.db, state=flat.get("state"))

        candidates = []
        for scheme in all_schemes:
            candidates.append(
                {
                    "scheme_id": scheme.id,
                    "name": scheme.name,
                    "category": scheme.category,
                    "level": scheme.level,
                    "state": scheme.state,
                    "summary": scheme.summary,
                    "citations": [
                        {
                            "url": scheme.source_url,
                            "clause": scheme.source_clause,
                            "last_verified_at": scheme.last_verified_at.isoformat()
                            if scheme.last_verified_at
                            else None,
                        }
                    ],
                }
            )

        household_plan = plan_household_swarm(
            self.db,
            case_id=case_id,
            profile_json=profile_row.profile_json,
            flat_profile=flat,
        )
        updated_profile = dict(profile_row.profile_json or {})
        updated_profile["household_swarm_plan"] = household_plan
        updated_profile["household_opportunity_queue"] = _merge_swarm_plan(
            updated_profile.get("household_opportunity_queue") or [],
            household_plan,
        )
        profile_row.profile_json = updated_profile
        self.db.commit()

        out = {
            "candidates": candidates,
            "count": len(candidates),
            "household_swarms": household_plan.get("swarms", []),
            "household_benefit_ceiling_inr": household_plan.get(
                "household_benefit_ceiling_inr",
                0,
            ),
        }
        self.record_event(case_id, out)
        return out


def _merge_swarm_plan(queue: list[Any], household_plan: dict[str, Any]) -> list[Any]:
    if not isinstance(queue, list):
        return queue
    swarms_by_member = {
        str(swarm.get("member_id")): swarm
        for swarm in household_plan.get("swarms", [])
        if isinstance(swarm, dict) and swarm.get("member_id") is not None
    }
    merged = []
    for item in queue:
        if not isinstance(item, dict):
            merged.append(item)
            continue
        swarm = swarms_by_member.get(str(item.get("member_id")))
        merged.append({**item, "opportunities": swarm.get("opportunities", []) if swarm else []})
    return merged
