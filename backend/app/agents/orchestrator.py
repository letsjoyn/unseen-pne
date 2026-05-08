"""Root orchestrator agent.

Drives the case lifecycle by composing sub-agents. The order, gates,
and confidence thresholds come from the policy registry, not from
hardcoded constants.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.agents.closer_agent import CloserAgent
from app.agents.hunter_agent import HunterAgent
from app.agents.matcher_agent import MatcherAgent
from app.agents.profiler_agent import ProfilerAgent
from app.agents.router_agent import RouterAgent
from app.agents.validator_agent import ValidatorAgent
from app.agents.watchdog_agent import WatchdogAgent
from app.core import confidence
from app.core.household_swarm import plan_household_swarm
from app.agents.profiler_agent import _flatten_profile
from app.db.models import BeneficiaryProfile, Case, CaseEvent
from app.logging_setup import get_logger

log = get_logger(__name__)


class Orchestrator:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _record(self, case_id: str, event_type: str, payload: dict[str, Any]) -> None:
        self.db.add(
            CaseEvent(case_id=case_id, event_type=event_type, actor="orchestrator", payload=payload)
        )
        self.db.commit()

    def run_full_pipeline(self, *, case_id: str) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        if case is None:
            raise ValueError(f"Case {case_id} not found")

        self._record(case_id, "orchestrator.start", {})

        ProfilerAgent(self.db).run(case_id=case_id)
        profile_row = self.db.get(BeneficiaryProfile, case_id)
        if profile_row and profile_row.confidence is not None:
            if not confidence.passes(self.db, "profile", profile_row.confidence):
                case.status = "manual_review"
                self.db.commit()
                self._record(case_id, "orchestrator.gate_failed", {"stage": "profile"})
                return {"status": "manual_review", "stage": "profile"}

        household_plan = {"swarms": [], "household_benefit_ceiling_inr": 0}
        if profile_row is not None:
            flat_profile = _flatten_profile(profile_row.profile_json, case.intake_payload)
            household_plan = plan_household_swarm(
                self.db,
                case_id=case_id,
                profile_json=profile_row.profile_json,
                flat_profile=flat_profile,
            )
            updated_profile = dict(profile_row.profile_json or {})
            updated_profile["household_swarm_plan"] = household_plan
            updated_profile["household_opportunity_queue"] = _merge_swarm_plan(
                updated_profile.get("household_opportunity_queue") or [],
                household_plan,
            )
            profile_row.profile_json = updated_profile
            self.db.commit()
            if household_plan["swarms"]:
                self._record(
                    case_id,
                    "orchestrator.household_swarms_planned",
                    household_plan,
                )

        HunterAgent(self.db).run(case_id=case_id)
        match_out = MatcherAgent(self.db).run(case_id=case_id)

        eligible = [m for m in match_out["matches"] if m["eligibility"] in {"eligible", "probable"}]
        if not eligible:
            case.status = "no_match"
            self.db.commit()
            self._record(case_id, "orchestrator.no_match", {})
            return {"status": "no_match"}

        target = eligible[0]["scheme_id"]
        ValidatorAgent(self.db).run(case_id=case_id, scheme_id=target)
        CloserAgent(self.db).run(case_id=case_id, scheme_id=target)
        RouterAgent(self.db).run(case_id=case_id, scheme_id=target)
        WatchdogAgent(self.db).run(case_id=case_id, scheme_id=target)

        self._record(
            case_id,
            "orchestrator.complete",
            {
                "target_scheme": target,
                "household_benefit_ceiling_inr": household_plan["household_benefit_ceiling_inr"],
            },
        )
        return {
            "status": "ready_for_approval",
            "target_scheme": target,
            "household_benefit_ceiling_inr": household_plan["household_benefit_ceiling_inr"],
            "household_swarms": household_plan["swarms"],
        }


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
