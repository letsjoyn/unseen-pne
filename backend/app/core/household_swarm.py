"""Plan parallel household opportunity swarms from dependent-member signals."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core import rules_engine
from app.registry import scheme_registry

_SWARM_CATEGORY_MAP: dict[str, list[str]] = {
    "education_support": ["education"],
    "livelihood_support": ["livelihood", "agriculture"],
    "dependent_child_support": ["education", "health"],
    "household_support": ["social_security", "food_security", "health"],
}


def plan_household_swarm(
    db: Session,
    *,
    case_id: str,
    profile_json: dict[str, Any],
    flat_profile: dict[str, Any],
) -> dict[str, Any]:
    queue = profile_json.get("household_opportunity_queue") or []
    if not isinstance(queue, list) or not queue:
        return {"case_id": case_id, "swarms": [], "household_benefit_ceiling_inr": 0}

    swarms: list[dict[str, Any]] = []
    total_value = 0
    state = flat_profile.get("state")

    for item in queue:
        if not isinstance(item, dict):
            continue
        swarm_type = str(item.get("recommended_swarm") or "household_support")
        categories = _SWARM_CATEGORY_MAP.get(swarm_type, _SWARM_CATEGORY_MAP["household_support"])
        member_profile = _member_profile(flat_profile, item)
        opportunities = _evaluate_member_opportunities(
            db,
            state=state,
            categories=categories,
            member_profile=member_profile,
        )
        member_value = sum(
            int(op.get("estimated_annual_value_inr") or 0) for op in opportunities[:2]
        )
        total_value += member_value
        swarms.append(
            {
                "member_id": item.get("member_id"),
                "name": item.get("name"),
                "relation": item.get("relation"),
                "recommended_swarm": swarm_type,
                "goals": item.get("goals") or [],
                "categories": categories,
                "opportunities": opportunities[:3],
                "estimated_benefit_ceiling_inr": member_value,
            }
        )

    return {
        "case_id": case_id,
        "swarms": swarms,
        "household_benefit_ceiling_inr": total_value,
    }


def _member_profile(base_flat: dict[str, Any], item: dict[str, Any]) -> dict[str, Any]:
    profile = dict(base_flat)
    profile["age"] = item.get("age", base_flat.get("age"))
    if item.get("occupation"):
        profile["occupation"] = item.get("occupation")
    if item.get("monthly_income") is not None:
        profile["monthly_income"] = item.get("monthly_income")

    goals = [str(goal).lower() for goal in item.get("goals") or []]
    relation = str(item.get("relation") or "").lower()

    if item.get("student") or any("scholar" in goal or "hostel" in goal for goal in goals):
        profile["occupation"] = profile.get("occupation") or "student"
    if item.get("looking_for_work") or any(
        "job" in goal or "skill" in goal or "placement" in goal for goal in goals
    ):
        profile["occupation"] = profile.get("occupation") or "job seeker"

    if "daughter" in relation:
        profile["gender"] = item.get("gender") or "female"
    elif item.get("gender"):
        profile["gender"] = item.get("gender")

    member_docs = {
        doc: True for doc in (item.get("documents_available") or []) if isinstance(doc, str)
    }
    shared_docs = profile.get("documents", {})
    if isinstance(shared_docs, dict):
        profile["documents"] = {**shared_docs, **member_docs}
    else:
        profile["documents"] = member_docs

    return profile


def _evaluate_member_opportunities(
    db: Session,
    *,
    state: str | None,
    categories: list[str],
    member_profile: dict[str, Any],
) -> list[dict[str, Any]]:
    available_docs = (
        list(member_profile.get("documents", {}).keys())
        if isinstance(member_profile.get("documents"), dict)
        else []
    )

    ranked: list[dict[str, Any]] = []
    for category in categories:
        for scheme in scheme_registry.list_active_schemes(db, state=state, category=category):
            ev = rules_engine.evaluate(
                scheme.eligibility_rules,
                member_profile,
                required_documents=scheme.required_documents,
                available_documents=available_docs,
            )
            if ev.decision not in {"eligible", "probable"}:
                continue
            ranked.append(
                {
                    "scheme_id": scheme.id,
                    "name": scheme.name,
                    "category": scheme.category,
                    "eligibility": ev.decision,
                    "score": ev.score,
                    "confidence": ev.confidence,
                    "estimated_annual_value_inr": scheme.estimated_annual_value_inr,
                    "citations": [
                        {
                            "url": scheme.source_url,
                            "clause": scheme.source_clause,
                            "last_verified_at": (
                                scheme.last_verified_at.isoformat()
                                if scheme.last_verified_at
                                else None
                            ),
                        }
                    ],
                }
            )

    ranked.sort(
        key=lambda row: (
            0 if row["eligibility"] == "eligible" else 1,
            -float(row["score"]),
            -int(row.get("estimated_annual_value_inr") or 0),
        )
    )
    return ranked
