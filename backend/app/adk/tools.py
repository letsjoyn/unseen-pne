"""ADK tools used by the LlmAgents.

Each function here becomes a tool the LLM can call. They are deliberately
narrow: every tool does one DB lookup or one mutation, and returns a JSON
serializable dict. ADK auto-generates the JSON schema from the Python
signature + docstring.

Eligibility decisions are still made by our deterministic rules engine
(`evaluate_eligibility`) so judges can trust the answer.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from app.adk.session_ctx import get_context
from app.agents.profiler_agent import _flatten_profile
from app.core import rules_engine
from app.core.der_score import compute_der
from app.db import models
from app.registry import policy_registry, scheme_registry


def _parse_json(value: Any, default: Any) -> Any:
    """Best-effort JSON parse so tools can accept either a real value or a JSON string."""

    if value is None or value == "":
        return default
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return value


# -------- Profile / Case state --------


def get_intake() -> dict[str, Any]:
    """Return the raw intake payload submitted by the volunteer for the current case."""

    ctx = get_context()
    case = ctx.db.get(models.Case, ctx.case_id)
    if case is None:
        return {"error": "case_not_found"}
    return {"case_id": ctx.case_id, "intake": case.intake_payload}


def save_profile(
    profile_json: str,
    confidence: float,
    missing_fields: list[str],
) -> dict[str, Any]:
    """Persist the structured BeneficiaryProfile produced by the Profiler.

    Args:
        profile_json: JSON-encoded profile string with keys demographics,
            economic, household, documents, location, vulnerability_tags.
        confidence: 0..1 self-reported confidence in the extraction.
        missing_fields: list of fields the agent could not fill from intake.
    """

    ctx = get_context()
    profile = _parse_json(profile_json, {})
    flat = _flatten_profile(profile, ctx.db.get(models.Case, ctx.case_id).intake_payload)
    der = compute_der(flat, db=ctx.db)
    existing = ctx.db.get(models.BeneficiaryProfile, ctx.case_id)
    if existing is None:
        ctx.db.add(
            models.BeneficiaryProfile(
                case_id=ctx.case_id,
                profile_json=profile,
                der_score=der,
                confidence=float(confidence),
                missing_fields=list(missing_fields),
            )
        )
    else:
        existing.profile_json = profile
        existing.der_score = der
        existing.confidence = float(confidence)
        existing.missing_fields = list(missing_fields)
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "profiled"
    ctx.db.commit()
    return {"saved": True, "der_score": der, "confidence": float(confidence)}


# -------- Hunter / Matcher / Validator helpers --------


def list_candidate_schemes(state: str | None = None) -> dict[str, Any]:
    """List active schemes from the registry, optionally filtered by state."""

    ctx = get_context()
    schemes = scheme_registry.list_active_schemes(ctx.db, state=state)
    return {
        "schemes": [
            {
                "id": s.id,
                "name": s.name,
                "level": s.level,
                "state": s.state,
                "category": s.category,
                "summary": s.summary,
                "required_documents": s.required_documents,
                "estimated_annual_value_inr": s.estimated_annual_value_inr,
                "source_url": s.source_url,
            }
            for s in schemes
        ]
    }


def evaluate_eligibility(scheme_id: str) -> dict[str, Any]:
    """Run the deterministic JSONLogic rules engine for one scheme.

    Returns decision (eligible/probable/not_eligible), score, confidence,
    matched/failed leaf rules, missing inputs.
    """

    ctx = get_context()
    case = ctx.db.get(models.Case, ctx.case_id)
    profile = ctx.db.get(models.BeneficiaryProfile, ctx.case_id)
    scheme = scheme_registry.get_scheme(ctx.db, scheme_id)
    if not (case and profile and scheme):
        return {"error": "missing_input"}
    flat = _flatten_profile(profile.profile_json, case.intake_payload)
    available_docs = (
        list(flat.get("documents", {}).keys())
        if isinstance(flat.get("documents"), dict)
        else []
    )
    ev = rules_engine.evaluate(
        scheme.eligibility_rules,
        flat,
        required_documents=scheme.required_documents,
        available_documents=available_docs,
    )
    return {
        "scheme_id": scheme.id,
        "decision": ev.decision,
        "score": ev.score,
        "confidence": ev.confidence,
        "matched": ev.matched,
        "failed": ev.failed,
        "missing_inputs": ev.missing_inputs,
        "available_documents": available_docs,
        "required_documents": scheme.required_documents,
    }


def save_match_decision(
    scheme_id: str,
    decision: str,
    score: float,
    confidence: float,
    urgency: str,
    reason_codes: list[str],
) -> dict[str, Any]:
    """Persist a Match row for the given scheme."""

    ctx = get_context()
    scheme = scheme_registry.get_scheme(ctx.db, scheme_id)
    if scheme is None:
        return {"error": "unknown_scheme"}
    citation = {
        "url": scheme.source_url,
        "clause": scheme.source_clause,
        "last_verified_at": scheme.last_verified_at.isoformat()
        if scheme.last_verified_at
        else None,
    }
    ctx.db.query(models.Match).filter(
        models.Match.case_id == ctx.case_id, models.Match.scheme_id == scheme.id
    ).delete()
    ctx.db.add(
        models.Match(
            case_id=ctx.case_id,
            scheme_id=scheme.id,
            eligibility=decision,
            score=float(score),
            confidence=float(confidence),
            urgency=urgency,
            reason_codes=list(reason_codes),
            citations=[citation],
        )
    )
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "matched"
    ctx.db.commit()
    return {"saved": True}


def list_matches() -> dict[str, Any]:
    """Return all match decisions saved for the current case, best-first."""

    ctx = get_context()
    rows = (
        ctx.db.query(models.Match)
        .filter(models.Match.case_id == ctx.case_id)
        .all()
    )
    rows.sort(key=lambda m: (_rank(m.eligibility), -m.score))
    return {
        "matches": [
            {
                "scheme_id": m.scheme_id,
                "eligibility": m.eligibility,
                "score": m.score,
                "confidence": m.confidence,
                "urgency": m.urgency,
                "reason_codes": m.reason_codes,
            }
            for m in rows
        ]
    }


def _rank(decision: str) -> int:
    return {"eligible": 0, "probable": 1, "not_eligible": 2}.get(decision, 3)


def save_blockers(
    scheme_id: str,
    blockers_json: str,
    minimum_path: list[str],
) -> dict[str, Any]:
    """Save the validator's blocker report for one scheme.

    Args:
        scheme_id: scheme this report applies to.
        blockers_json: JSON-encoded list of blocker objects, each with
            keys type, description, required_items, next_steps, severity.
        minimum_path: ordered list of steps to reach a submission-ready state.
    """

    ctx = get_context()
    blockers = _parse_json(blockers_json, [])
    if not isinstance(blockers, list):
        blockers = []
    ctx.db.query(models.BlockerReport).filter(
        models.BlockerReport.case_id == ctx.case_id,
        models.BlockerReport.scheme_id == scheme_id,
    ).delete()
    ctx.db.add(
        models.BlockerReport(
            case_id=ctx.case_id,
            scheme_id=scheme_id,
            blockers=blockers,
            minimum_path=list(minimum_path),
            resolved=not blockers,
        )
    )
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "blockers_identified"
    ctx.db.commit()
    return {"saved": True}


def save_action_packet(
    scheme_id: str,
    cover_letter: str,
    email_subject: str,
    email_body: str,
    whatsapp_summary: str,
    checklist: list[str],
) -> dict[str, Any]:
    """Save the action packet draft. Sets requires_human_approval=True."""

    ctx = get_context()
    existing = ctx.db.get(models.ActionPacket, ctx.case_id)
    if existing is None:
        ctx.db.add(
            models.ActionPacket(
                case_id=ctx.case_id,
                scheme_id=scheme_id,
                cover_letter=cover_letter,
                email_subject=email_subject,
                email_body=email_body,
                whatsapp_summary=whatsapp_summary,
                checklist=list(checklist),
                requires_human_approval=True,
                approved=False,
                sent=False,
            )
        )
    else:
        existing.scheme_id = scheme_id
        existing.cover_letter = cover_letter
        existing.email_subject = email_subject
        existing.email_body = email_body
        existing.whatsapp_summary = whatsapp_summary
        existing.checklist = list(checklist)
        existing.requires_human_approval = True
        existing.approved = False
        existing.sent = False
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "packet_ready"
    ctx.db.commit()
    return {"saved": True}


def score_routes(scheme_id: str) -> dict[str, Any]:
    """Score the application_channels for a scheme using the routing policy."""

    ctx = get_context()
    scheme = scheme_registry.get_scheme(ctx.db, scheme_id)
    if scheme is None:
        return {"error": "unknown_scheme"}
    weights = policy_registry.get_policy(
        ctx.db,
        "routing",
        "weights",
        default={"fit": 0.4, "sla": 0.3, "success": 0.2, "effort": 0.1},
    )
    ranked = []
    breakdown: dict[str, float] = {}
    for ch in scheme.application_channels or []:
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
    return {"primary": primary, "fallback": fallback, "scores": breakdown}


def save_route_plan(
    primary_json: str,
    fallback_json: str,
    scores_json: str,
) -> dict[str, Any]:
    """Persist the chosen route plan.

    Args:
        primary_json: JSON-encoded primary channel object (output of score_routes).
        fallback_json: JSON-encoded fallback channel object, or "null" / "" for none.
        scores_json: JSON-encoded mapping of channel name to score.
    """

    ctx = get_context()
    primary = _parse_json(primary_json, {})
    fallback = _parse_json(fallback_json, None)
    scores = _parse_json(scores_json, {}) or {}
    existing = ctx.db.get(models.RoutePlan, ctx.case_id)
    if existing is None:
        ctx.db.add(
            models.RoutePlan(
                case_id=ctx.case_id,
                primary_route=primary,
                fallback_route=fallback,
                score_breakdown=scores,
            )
        )
    else:
        existing.primary_route = primary
        existing.fallback_route = fallback
        existing.score_breakdown = scores
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "routed"
    ctx.db.commit()
    return {"saved": True}


def schedule_followups(
    scheme_id: str = "",
    cadence_json: str = "",
) -> dict[str, Any]:
    """Create follow-up tasks. Cadence loads from policy if not provided.

    Args:
        scheme_id: scheme this cadence applies to (used to look up category policy).
        cadence_json: JSON-encoded list of {due_in_days, type}; empty -> use policy.
    """

    ctx = get_context()
    cadence_key = "default"
    if scheme_id:
        scheme = scheme_registry.get_scheme(ctx.db, scheme_id)
        if scheme:
            cadence_key = scheme.category or "default"
    cadence = _parse_json(cadence_json, None)
    chosen = cadence or policy_registry.get_policy(
        ctx.db,
        "followup",
        cadence_key,
        default=[
            {"due_in_days": 3, "type": "status_check"},
            {"due_in_days": 7, "type": "reminder"},
            {"due_in_days": 14, "type": "escalation_if_no_response"},
        ],
    )
    if not isinstance(chosen, list):
        chosen = []

    ctx.db.query(models.FollowupTask).filter(
        models.FollowupTask.case_id == ctx.case_id,
        models.FollowupTask.status == "pending",
    ).delete()

    now = datetime.now(tz=timezone.utc)
    created = []
    for entry in chosen:
        due = now + timedelta(days=int(entry.get("due_in_days", 3)))
        ctx.db.add(
            models.FollowupTask(
                case_id=ctx.case_id,
                due_at=due,
                task_type=str(entry.get("type", "status_check")),
                status="pending",
            )
        )
        created.append(
            {"due_in_days": entry.get("due_in_days"), "type": entry.get("type")}
        )
    case = ctx.db.get(models.Case, ctx.case_id)
    case.status = "in_progress"
    ctx.db.commit()
    return {"tasks": created, "policy_key": cadence_key}


def record_event(event_type: str, payload_json: str = "") -> dict[str, Any]:
    """Append an audit-trail event for the current case.

    Args:
        event_type: short event identifier, e.g. 'profile_built'.
        payload_json: optional JSON-encoded payload (default '{}').
    """

    ctx = get_context()
    payload = _parse_json(payload_json, {}) or {}
    ctx.db.add(
        models.CaseEvent(
            case_id=ctx.case_id,
            event_type=event_type,
            actor="adk",
            payload=payload,
        )
    )
    ctx.db.commit()
    return {"recorded": True}
