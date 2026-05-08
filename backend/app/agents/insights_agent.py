"""Insights agent: anonymized aggregate metrics for the dashboard."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func

from app.agents.base import BaseAgent
from app.core.missed_value import estimate_missed_value_for_case
from app.db.models import ActionPacket, BeneficiaryProfile, Case, CaseEvent, FollowupTask, Match, Scheme


class InsightsAgent(BaseAgent):
    name = "insights"

    def load_prompt(self) -> str:  # insights agent is deterministic
        return ""

    def run(self, *, case_id: str | None = None, **_: Any) -> dict[str, Any]:
        cases = self.db.query(Case).all()
        total = len(cases)
        statuses = Counter(c.status for c in cases)

        der_high = (
            self.db.query(func.count())
            .select_from(BeneficiaryProfile)
            .filter(BeneficiaryProfile.der_score >= 0.6)
            .scalar()
            or 0
        )

        missed_value_total = 0
        for c in cases:
            missed_value_total += estimate_missed_value_for_case(self.db, c.id)

        approved_packets = (
            self.db.query(func.count())
            .select_from(ActionPacket)
            .filter(ActionPacket.approved.is_(True))
            .scalar()
            or 0
        )
        sent_packets = (
            self.db.query(func.count())
            .select_from(ActionPacket)
            .filter(ActionPacket.sent.is_(True))
            .scalar()
            or 0
        )

        eligible_count = (
            self.db.query(func.count())
            .select_from(Match)
            .filter(Match.eligibility == "eligible")
            .scalar()
            or 0
        )

        pending_followups = (
            self.db.query(func.count())
            .select_from(FollowupTask)
            .filter(FollowupTask.status == "pending")
            .scalar()
            or 0
        )

        pulse_flags = (
            self.db.query(func.count())
            .select_from(CaseEvent)
            .filter(CaseEvent.event_type == "eligibility.pulse.flagged")
            .scalar()
            or 0
        )

        # Eligible / probable matches grouped by scheme category
        cat_rows = (
            self.db.query(Scheme.category, func.count(Match.id))
            .join(Match, Match.scheme_id == Scheme.id)
            .filter(Match.eligibility.in_(["eligible", "probable"]))
            .group_by(Scheme.category)
            .all()
        )
        by_category = {row[0]: int(row[1]) for row in cat_rows if row[0]}

        return {
            "as_of": datetime.now(tz=timezone.utc).isoformat(),
            "total_cases": total,
            "by_status": dict(statuses),
            "high_der_cases": int(der_high),
            "estimated_missed_value_inr": int(missed_value_total),
            "eligible_match_count": int(eligible_count),
            "approved_packets": int(approved_packets),
            "sent_packets": int(sent_packets),
            "pending_followups": int(pending_followups),
            "eligibility_pulse_flags": int(pulse_flags),
            "by_category": by_category,
        }
