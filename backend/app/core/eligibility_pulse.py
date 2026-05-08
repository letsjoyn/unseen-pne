"""Nightly re-match engine for open cases after policy or scheme changes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.agents.matcher_agent import MatcherAgent
from app.db.models import Case, CaseEvent, Match

OPEN_CASE_STATUSES = {
    "intake_created",
    "profiled",
    "matched",
    "blockers_identified",
    "packet_ready",
    "routed",
    "in_progress",
    "packet_dispatched",
    "manual_review",
    "escalated",
}


def run_living_eligibility_pulse(db: Session) -> dict[str, Any]:
    cases = (
        db.query(Case)
        .filter(Case.status.in_(sorted(OPEN_CASE_STATUSES)))
        .all()
    )
    scanned = 0
    flagged = 0
    newly_eligible_total = 0

    for case in cases:
        scanned += 1
        previous = _eligible_map(db, case.id)
        match_out = MatcherAgent(db).run(case_id=case.id)
        current = {
            row["scheme_id"]: row
            for row in match_out.get("matches", [])
            if row.get("eligibility") in {"eligible", "probable"}
        }

        new_scheme_ids = sorted(set(current) - set(previous))
        upgraded_scheme_ids = sorted(
            scheme_id
            for scheme_id, row in current.items()
            if scheme_id in previous
            and previous[scheme_id]["eligibility"] != "eligible"
            and row.get("eligibility") == "eligible"
        )

        if new_scheme_ids or upgraded_scheme_ids:
            flagged += 1
            newly_eligible_total += len(new_scheme_ids) + len(upgraded_scheme_ids)
            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="eligibility.pulse.flagged",
                    actor="nightly_pulse",
                    payload={
                        "at": datetime.now(tz=timezone.utc).isoformat(),
                        "new_scheme_ids": new_scheme_ids,
                        "upgraded_scheme_ids": upgraded_scheme_ids,
                        "current_open_matches": sorted(current),
                    },
                )
            )
            if case.status in {"no_match", "manual_review"}:
                case.status = "matched"

    db.commit()
    return {
        "scanned_cases": scanned,
        "flagged_cases": flagged,
        "newly_eligible_matches": newly_eligible_total,
    }


def _eligible_map(db: Session, case_id: str) -> dict[str, dict[str, Any]]:
    rows = db.query(Match).filter(Match.case_id == case_id).all()
    return {
        row.scheme_id: {
            "eligibility": row.eligibility,
            "score": row.score,
            "confidence": row.confidence,
        }
        for row in rows
        if row.eligibility in {"eligible", "probable"}
    }
